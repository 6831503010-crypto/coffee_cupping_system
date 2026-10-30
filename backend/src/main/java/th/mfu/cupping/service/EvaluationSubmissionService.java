package th.mfu.cupping.service;

import java.math.BigDecimal;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import th.mfu.cupping.dto.EvaluationSubmissionDtos.*;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;

import th.mfu.cupping.dto.EvaluationTimingDtos.TimerView;

import org.springframework.beans.factory.annotation.Qualifier;

@Service
public class EvaluationSubmissionService {
  private final JdbcTemplate jdbc;
  private final Clock clock;

  public EvaluationSubmissionService(
      JdbcTemplate jdbc,
      @Qualifier("evaluationClock") Clock clock) {
    this.jdbc = jdbc;
    this.clock = clock;
  }

  private record MemberTiming(
      LocalDateTime startedAt,
      LocalDateTime endedAt,
      String outcome,
      LocalDateTime aromaLockedAt) {
  }

  private ResponseStatusException error(HttpStatus status, String message) {
    return new ResponseStatusException(status, message);
  }

  private int userId(String email) {
    List<Integer> values = jdbc.query("SELECT user_id FROM users WHERE LOWER(email) = LOWER(?)",
        (rs, row) -> rs.getInt(1), email);
    if (values.isEmpty())
      throw error(HttpStatus.UNAUTHORIZED, "Account not found");
    return values.get(0);
  }

  private int membership(int sessionId, int userId) {
    List<Integer> memberships = jdbc.query("""
        SELECT session_evaluator_id FROM session_evaluators
        WHERE session_id = ? AND user_id = ?
        """, (rs, row) -> rs.getInt(1), sessionId, userId);
    if (memberships.isEmpty())
      throw error(HttpStatus.FORBIDDEN, "Not an evaluator in this session");
    return memberships.get(0);
  }

  private void checkSession(int sessionId, boolean locking) {
    List<Boolean> rows = jdbc.query("""
        SELECT (finalized_at IS NOT NULL OR status IN ('FINALIZED','CANCELLED')) AS closed
        FROM cupping_sessions WHERE session_id = ?
        """ + (locking ? " FOR UPDATE" : ""), (rs, row) -> rs.getBoolean(1), sessionId);
    if (rows.isEmpty())
      throw error(HttpStatus.NOT_FOUND, "Session not found");
    if (locking && rows.get(0))
      throw error(HttpStatus.CONFLICT, "Session is closed");
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public EvaluationProgress lockAroma(
      int sessionId,
      AromaLockRequest request,
      String email) {

    // Keep the same session-first lock order as submission and closure.
    checkSession(sessionId, true);

    int memberId = membership(sessionId, userId(email));

    LocalDateTime existingLock = jdbc.queryForObject("""
        SELECT aroma_locked_at
        FROM session_evaluators
        WHERE session_evaluator_id = ?
        FOR UPDATE
        """,
        (rs, row) -> rs.getObject(
            "aroma_locked_at", LocalDateTime.class),
        memberId);

    Set<Integer> assigned = new HashSet<>(jdbc.query("""
        SELECT session_sample_id
        FROM session_samples
        WHERE session_id = ?
        """,
        (rs, row) -> rs.getInt(1),
        sessionId));

    Set<Integer> incoming = new HashSet<>();

    for (Sample sample : request.samples()) {
      if (sample.sessionSampleId() == null
          || !incoming.add(sample.sessionSampleId())) {
        throw error(
            HttpStatus.BAD_REQUEST,
            "Invalid or duplicate sessionSampleId");
      }
    }

    if (assigned.isEmpty() || !incoming.equals(assigned)) {
      throw error(
          HttpStatus.BAD_REQUEST,
          "Locking aroma requires every session sample");
    }

    // Retrying a completed lock must preserve its original timestamp
    // and must not write stale Flavor data.
    if (existingLock != null) {
      Map<Integer, Sample> savedBySample = new HashMap<>();

      for (SavedSample saved : loadForMember(memberId)) {
        savedBySample.put(saved.sessionSampleId(), saved.data());
      }

      for (Sample sample : request.samples()) {
        Sample saved = savedBySample.get(sample.sessionSampleId());

        if (saved == null || !sameAroma(sample, saved)) {
          throw error(
              HttpStatus.CONFLICT,
              "Aroma is already locked with different saved values");
        }
      }

      return new EvaluationProgress(
          true,
          existingLock.toInstant(ZoneOffset.UTC).toString());
    }

    for (Sample sample : request.samples()) {
      if (sample.dryAroma() == null
          || sample.breakAroma() == null
          || sample.colorIntensity() == null
          || sample.aromaQualityScore() == null
          || sample.aromaQualities() == null
          || sample.aromaQualities().isEmpty()) {
        throw error(
            HttpStatus.BAD_REQUEST,
            "Complete aroma for every sample before locking");
      }
    }

    // Participates in this method's transaction.
    // Existing save logic checks Begin, completion state, field ranges
    // and option validity, and saves all sample data.
    save(sessionId, new Submission(false, request.samples()), email);

    LocalDateTime lockedAt = LocalDateTime.ofInstant(
        clock.instant().truncatedTo(ChronoUnit.MICROS),
        ZoneOffset.UTC);

    int updated = jdbc.update("""
        UPDATE session_evaluators
        SET aroma_locked_at = ?
        WHERE session_evaluator_id = ?
          AND aroma_locked_at IS NULL
          AND evaluation_started_at IS NOT NULL
          AND evaluation_ended_at IS NULL
          AND completion_outcome = 'IN_PROGRESS'
        """,
        lockedAt,
        memberId);

    if (updated != 1) {
      throw error(
          HttpStatus.CONFLICT,
          "Evaluation cannot be locked in its current state");
    }

    return new EvaluationProgress(
        true,
        lockedAt.toInstant(ZoneOffset.UTC).toString());
  }

  @Transactional(readOnly = true)
  public EvaluationProgress progress(int sessionId, String email) {
    checkSession(sessionId, false);

    int memberId = membership(sessionId, userId(email));

    return jdbc.queryForObject("""
        SELECT aroma_locked_at
        FROM session_evaluators
        WHERE session_evaluator_id = ?
        """,
        (rs, row) -> {
          LocalDateTime lockedAt = rs.getObject(
              "aroma_locked_at", LocalDateTime.class);

          return new EvaluationProgress(
              lockedAt != null,
              lockedAt == null
                  ? null
                  : lockedAt.toInstant(ZoneOffset.UTC).toString());
        },
        memberId);
  }

  @Transactional(readOnly = true)
  public List<SavedSample> load(int sessionId, String email) {
    checkSession(sessionId, false);
    return loadForMember(membership(sessionId, userId(email)));
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public List<SavedSample> save(int sessionId, Submission request, String email) {
    // Session-first lock order matches
    // SessionParticipationService.removeEvaluator().
    checkSession(sessionId, true);
    int memberId = membership(sessionId, userId(email));

    List<MemberTiming> members = jdbc.query("""
        SELECT evaluation_started_at,
               evaluation_ended_at,
               completion_outcome,
              aroma_locked_at
        FROM session_evaluators
        WHERE session_evaluator_id = ?
        FOR UPDATE
        """,
        (rs, row) -> new MemberTiming(
            rs.getObject("evaluation_started_at", LocalDateTime.class),
            rs.getObject("evaluation_ended_at", LocalDateTime.class),
            rs.getString("completion_outcome"),
            rs.getObject("aroma_locked_at", LocalDateTime.class)),
        memberId);

    if (members.isEmpty()) {
      throw error(HttpStatus.CONFLICT, "Evaluator was removed");
    }

    MemberTiming timing = members.get(0);
    boolean finalizing = Boolean.TRUE.equals(request.finalizeEvaluation());

    List<Integer> assigned = jdbc.query("SELECT session_sample_id FROM session_samples WHERE session_id = ?",
        (rs, row) -> rs.getInt(1), sessionId);
    Set<Integer> allowed = new HashSet<>(assigned);
    Set<Integer> incoming = new HashSet<>();
    for (Sample sample : request.samples()) {
      if (sample.sessionSampleId() == null || !allowed.contains(sample.sessionSampleId()) ||
          !incoming.add(sample.sessionSampleId())) {
        throw error(HttpStatus.BAD_REQUEST, "Invalid or duplicate sessionSampleId");
      }
    }
    if (Boolean.TRUE.equals(request.finalizeEvaluation()) && !incoming.equals(allowed))
      throw error(HttpStatus.BAD_REQUEST, "Finalize requires every session sample");

    if (assigned.isEmpty()) {
      throw error(HttpStatus.CONFLICT, "Session has no samples");
    }

    // A successful retry must return the original result without changing timing.
    if ("FINALIZED".equals(timing.outcome())) {
      if (!finalizing) {
        throw error(HttpStatus.CONFLICT, "Evaluation is finalized and read-only");
      }

      List<SavedSample> saved = loadForMember(memberId);

      boolean identical = saved.size() == assigned.size()
          && saved.stream().allMatch(item -> "FINALIZED".equals(item.status()))
          && request.samples().stream().allMatch(sample -> saved.stream().anyMatch(item -> Objects.equals(
              item.sessionSampleId(), sample.sessionSampleId())
              && sameSample(item.data(), sample)));

      if (!identical) {
        throw error(
            HttpStatus.CONFLICT,
            "Finalized evaluation differs from the submitted form");
      }

      return saved;
    }

    if (timing.endedAt() != null
        || (timing.outcome() != null
            && !"IN_PROGRESS".equals(timing.outcome()))) {
      throw error(HttpStatus.CONFLICT, "Evaluation is closed");
    }

    if (timing.startedAt() == null
        || !"IN_PROGRESS".equals(timing.outcome())) {
      throw error(
          HttpStatus.CONFLICT,
          "Select Begin Evaluation before saving or finalizing");
    }

    if (timing.aromaLockedAt() != null) {
      Map<Integer, Sample> savedBySample = new HashMap<>();

      for (SavedSample saved : loadForMember(memberId)) {
        savedBySample.put(saved.sessionSampleId(), saved.data());
      }

      for (Sample incomingSample : request.samples()) {
        Sample savedSample = savedBySample.get(
            incomingSample.sessionSampleId());

        if (savedSample == null || !sameAroma(incomingSample, savedSample)) {
          throw error(
              HttpStatus.CONFLICT,
              "Aroma stage is locked. Reload the saved evaluation.");
        }
      }
    }

    for (Sample sample : request.samples()) {
      List<Integer> ids = jdbc.query("""
          SELECT evaluation_id FROM evaluations
          WHERE session_evaluator_id = ? AND session_sample_id = ? FOR UPDATE
          """, (rs, row) -> rs.getInt(1), memberId, sample.sessionSampleId());
      Integer evaluationId = ids.isEmpty() ? null : ids.get(0);
      if (evaluationId != null) {
        List<String> statuses = jdbc.query("SELECT status FROM evaluations WHERE evaluation_id = ?",
            (rs, row) -> rs.getString(1), evaluationId);
        if (!statuses.isEmpty() && "FINALIZED".equals(statuses.get(0))) {
          if (!Boolean.TRUE.equals(request.finalizeEvaluation()))
            throw error(HttpStatus.CONFLICT, "Evaluation is finalized and read-only");
          // Allow retry only when the exact persisted payload is being confirmed.
          // Reject changed data: a finalized evaluation is immutable.
          if (!sameSample(loadOne(evaluationId).data(), sample))
            throw error(HttpStatus.CONFLICT, "Finalized evaluation differs from the submitted form");
          continue;
        }
      }
      validate(sample, request.finalizeEvaluation());
      BigDecimal uniformity = null, clean = null, sweetness = null, total = null;
      int defective = 0;
      if (sample.cups() != null && sample.cups().size() == 5) {
        uniformity = BigDecimal.valueOf(sample.cups().stream().filter(Cup::uniformity).count() * 2);
        clean = BigDecimal.valueOf(sample.cups().stream().filter(Cup::cleanCup).count() * 2);
        sweetness = BigDecimal.valueOf(sample.cups().stream().filter(Cup::sweetness).count() * 2);
        defective = 5 - (uniformity.intValue() / 2);
      }
      Integer defectId = resolveDefect(sample.defectType(), defective);
      if (uniformity != null && hasAllScores(sample) && (defective == 0 || defectId != null)) {
        int penalty = defectId == null ? 0
            : jdbc.queryForObject(
                "SELECT points_per_cup FROM defect_types WHERE defect_type_id = ?",
                Integer.class, defectId);
        total = CoffeeScoreCalculator.total(sample.aromaQualityScore(), sample.flavorScore(),
            sample.aftertasteScore(), sample.acidityScore(), sample.bodyScore(),
            sample.balanceScore(), sample.overallScore(),
            uniformity.intValue() / 2, clean.intValue() / 2, sweetness.intValue() / 2,
            defectId == null ? null : penalty);
      }
      if (Boolean.TRUE.equals(request.finalizeEvaluation()) && total == null)
        throw error(HttpStatus.BAD_REQUEST, "Complete scores, cups and defect type before finalizing");

      String status = Boolean.TRUE.equals(request.finalizeEvaluation()) ? "FINALIZED" : "DRAFT";
      if (evaluationId == null) {
        KeyHolder key = new GeneratedKeyHolder();
        // This insert uses only identities; all mutable fields are updated below.
        jdbc.update(connection -> {
          var statement = connection.prepareStatement("""
              INSERT INTO evaluations (session_evaluator_id, session_sample_id, status)
              VALUES (?, ?, 'DRAFT')
              """, java.sql.Statement.RETURN_GENERATED_KEYS);
          statement.setInt(1, memberId);
          statement.setInt(2, sample.sessionSampleId());
          return statement;
        }, key);
        evaluationId = Objects.requireNonNull(key.getKey()).intValue();
      }
      jdbc.update("""
          UPDATE evaluations SET status = ?, dry_aroma = ?, break_aroma = ?,
            color_intensity = ?, aroma_quality_score = ?, flavor_score = ?,
            aftertaste_score = ?, acidity_score = ?, body_score = ?, balance_score = ?,
            uniformity_score = ?, clean_cup_score = ?, sweetness_score = ?, overall_score = ?,
            acidity_intensity = ?, body_level = ?, defect_type_id = ?, total_score = ?,
            finalized_at = CASE WHEN ? = 'FINALIZED' THEN CURRENT_TIMESTAMP ELSE NULL END
          WHERE evaluation_id = ?
          """, status, sample.dryAroma(), sample.breakAroma(), sample.colorIntensity(),
          sample.aromaQualityScore(), sample.flavorScore(), sample.aftertasteScore(),
          sample.acidityScore(), sample.bodyScore(), sample.balanceScore(),
          uniformity, clean, sweetness, sample.overallScore(),
          sample.acidityIntensity(), sample.bodyLevel(), defectId, total, status, evaluationId);

      jdbc.update("DELETE FROM defect_cup_evaluations WHERE evaluation_id = ?", evaluationId);
      if (sample.cups() != null)
        for (Cup cup : sample.cups())
          jdbc.update("""
              INSERT INTO defect_cup_evaluations
                (evaluation_id, cup_number, uniformity, clean_cup, sweetness)
              VALUES (?, ?, ?, ?, ?)
              """, evaluationId, cup.cupNumber(), cup.uniformity(), cup.cleanCup(), cup.sweetness());

      jdbc.update("DELETE FROM evaluation_option_selections WHERE evaluation_id = ?", evaluationId);
      insertOptions(evaluationId, "AROMA_QUALITY", sample.aromaQualities());
      insertOptions(evaluationId, "FLAVOR_QUALITY", sample.flavorQualities());
      saveNote(evaluationId, "AROMA", sample.aromaNotes());
      saveNote(evaluationId, "FLAVOR", sample.flavorNotes());
    }

    if (finalizing) {
      LocalDateTime endedAt = LocalDateTime.ofInstant(
          clock.instant().truncatedTo(ChronoUnit.MICROS),
          ZoneOffset.UTC);

      if (endedAt.isBefore(timing.startedAt())) {
        throw error(
            HttpStatus.CONFLICT,
            "Server time is earlier than evaluation start; please retry");
      }

      long elapsedSeconds = Duration.between(timing.startedAt(), endedAt).getSeconds();

      int updated = jdbc.update("""
          UPDATE session_evaluators
          SET evaluation_ended_at = ?,
              elapsed_seconds = ?,
              completion_outcome = 'FINALIZED'
          WHERE session_evaluator_id = ?
            AND evaluation_started_at IS NOT NULL
            AND evaluation_ended_at IS NULL
            AND completion_outcome = 'IN_PROGRESS'
          """,
          endedAt,
          elapsedSeconds,
          memberId);

      if (updated != 1) {
        throw error(
            HttpStatus.CONFLICT,
            "Evaluation timing changed; reload before retrying");
      }
    }

    return loadForMember(memberId);
  }

  private boolean sameAroma(Sample incoming, Sample saved) {
    return Objects.equals(incoming.sessionSampleId(), saved.sessionSampleId())
        && Objects.equals(incoming.dryAroma(), saved.dryAroma())
        && Objects.equals(incoming.breakAroma(), saved.breakAroma())
        && Objects.equals(incoming.colorIntensity(), saved.colorIntensity())
        && equalDecimal(
            incoming.aromaQualityScore(), saved.aromaQualityScore())
        && Objects.equals(
            new HashSet<>(incoming.aromaQualities() == null
                ? List.of()
                : incoming.aromaQualities()),
            new HashSet<>(saved.aromaQualities() == null
                ? List.of()
                : saved.aromaQualities()))
        && Objects.equals(
            incoming.aromaNotes() == null ? "" : incoming.aromaNotes(),
            saved.aromaNotes() == null ? "" : saved.aromaNotes());
  }

  private boolean sameSample(Sample a, Sample b) {
    return Objects.equals(a.sessionSampleId(), b.sessionSampleId())
        && Objects.equals(a.dryAroma(), b.dryAroma())
        && Objects.equals(a.breakAroma(), b.breakAroma())
        && Objects.equals(a.colorIntensity(), b.colorIntensity())
        && equalDecimal(a.aromaQualityScore(), b.aromaQualityScore())
        && equalDecimal(a.flavorScore(), b.flavorScore())
        && equalDecimal(a.aftertasteScore(), b.aftertasteScore())
        && equalDecimal(a.acidityScore(), b.acidityScore())
        && equalDecimal(a.bodyScore(), b.bodyScore())
        && equalDecimal(a.balanceScore(), b.balanceScore())
        && equalDecimal(a.overallScore(), b.overallScore())
        && Objects.equals(a.acidityIntensity(), b.acidityIntensity())
        && Objects.equals(a.bodyLevel(), b.bodyLevel())
        && Objects.equals(a.defectType(), b.defectType())
        && Objects.equals(new HashSet<>(a.aromaQualities() == null ? List.of() : a.aromaQualities()),
            new HashSet<>(b.aromaQualities() == null ? List.of() : b.aromaQualities()))
        && Objects.equals(new HashSet<>(a.flavorQualities() == null ? List.of() : a.flavorQualities()),
            new HashSet<>(b.flavorQualities() == null ? List.of() : b.flavorQualities()))
        && Objects.equals(cupMap(a.cups()), cupMap(b.cups()))
        && Objects.equals(a.aromaNotes() == null ? "" : a.aromaNotes(), b.aromaNotes() == null ? "" : b.aromaNotes())
        && Objects.equals(a.flavorNotes() == null ? "" : a.flavorNotes(),
            b.flavorNotes() == null ? "" : b.flavorNotes());
  }

  private Map<Integer, Cup> cupMap(List<Cup> cups) {
    if (cups == null)
      return Map.of();
    Map<Integer, Cup> byNumber = new HashMap<>();
    for (Cup cup : cups)
      byNumber.put(cup.cupNumber(), cup);
    return byNumber;
  }

  private boolean equalDecimal(BigDecimal a, BigDecimal b) {
    return a == null ? b == null : b != null && a.compareTo(b) == 0;
  }

  private void validate(Sample s, boolean finalize) {
    scale(s.dryAroma(), 1, 5, "dryAroma");
    scale(s.breakAroma(), 1, 5, "breakAroma");
    scale(s.acidityIntensity(), 1, 5, "acidityIntensity");
    scale(s.bodyLevel(), 1, 5, "bodyLevel");
    if (s.colorIntensity() != null && !List.of("Low", "Medium", "High").contains(s.colorIntensity()))
      throw error(HttpStatus.BAD_REQUEST, "Invalid colorIntensity");
    for (var score : List.of(new Score("aromaQualityScore", s.aromaQualityScore()),
        new Score("flavorScore", s.flavorScore()), new Score("aftertasteScore", s.aftertasteScore()),
        new Score("acidityScore", s.acidityScore()), new Score("bodyScore", s.bodyScore()),
        new Score("balanceScore", s.balanceScore()), new Score("overallScore", s.overallScore()))) {
      if (score.value() != null && (score.value().compareTo(BigDecimal.valueOf(6)) < 0 ||
          score.value().compareTo(BigDecimal.TEN) > 0 ||
          score.value().multiply(BigDecimal.valueOf(4)).stripTrailingZeros().scale() > 0))
        throw error(HttpStatus.BAD_REQUEST, score.name() + " must be 6–10 in steps of 0.25");
    }
    if (s.aromaNotes() != null && s.aromaNotes().length() > 1000 ||
        s.flavorNotes() != null && s.flavorNotes().length() > 1000)
      throw error(HttpStatus.BAD_REQUEST, "Each tasting note must be at most 1000 characters");
    if (s.cups() != null) {
      if (s.cups().size() != 5 || s.cups().stream().map(Cup::cupNumber).distinct().count() != 5)
        throw error(HttpStatus.BAD_REQUEST, "Exactly five unique numbered cups are required");
      for (Cup cup : s.cups())
        if (cup.cupNumber() < 1 || cup.cupNumber() > 5)
          throw error(HttpStatus.BAD_REQUEST, "Invalid cup number");
    }
    if (finalize && (!hasAllScores(s) || s.dryAroma() == null || s.breakAroma() == null ||
        s.colorIntensity() == null || s.acidityIntensity() == null || s.bodyLevel() == null ||
        s.cups() == null || s.aromaQualities() == null || s.aromaQualities().isEmpty() ||
        s.flavorQualities() == null || s.flavorQualities().isEmpty()))
      throw error(HttpStatus.BAD_REQUEST, "Every score, quality selection and five cups are required");
  }

  private record Score(String name, BigDecimal value) {
  }

  private void scale(Integer value, int min, int max, String field) {
    if (value != null && (value < min || value > max))
      throw error(HttpStatus.BAD_REQUEST, "Invalid " + field);
  }

  private boolean hasAllScores(Sample s) {
    return s.aromaQualityScore() != null && s.flavorScore() != null && s.aftertasteScore() != null &&
        s.acidityScore() != null && s.bodyScore() != null && s.balanceScore() != null &&
        s.overallScore() != null;
  }

  private Integer resolveDefect(String type, int defective) {
    if (type == null || type.isBlank()) {
      if (defective > 0)
        return null;
      return null;
    }
    if (defective == 0)
      throw error(HttpStatus.BAD_REQUEST, "Cannot assign a defect when all cups pass");
    if (!List.of("taint", "fault").contains(type.toLowerCase(Locale.ROOT)))
      throw error(HttpStatus.BAD_REQUEST, "Invalid defect type");
    List<Integer> matches = jdbc.query("""
        SELECT defect_type_id FROM defect_types WHERE LOWER(defect_name) = ?
        ORDER BY defect_type_id LIMIT 2
        """, (rs, row) -> rs.getInt(1), type.toLowerCase(Locale.ROOT));
    if (matches.size() != 1)
      throw error(HttpStatus.CONFLICT, "Defect catalog missing or ambiguous: " + type);
    return matches.get(0);
  }

  private void insertOptions(int evaluationId, String type, List<String> names) {
    if (names == null)
      return;
    Set<String> unique = new HashSet<>(names);
    if (unique.size() != names.size())
      throw error(HttpStatus.BAD_REQUEST, "Duplicate quality options");
    for (String name : unique) {
      List<Integer> matches = jdbc.query("""
          SELECT option_id FROM evaluation_options
          WHERE option_type = ? AND option_name = ? AND active = TRUE
          ORDER BY option_id LIMIT 2
          """, (rs, row) -> rs.getInt(1), type, name);
      if (matches.size() != 1)
        throw error(HttpStatus.BAD_REQUEST, "Unknown or ambiguous " + type + " option: " + name);
      jdbc.update("INSERT INTO evaluation_option_selections (evaluation_id, option_id) VALUES (?, ?)",
          evaluationId, matches.get(0));
    }
  }

  private void saveNote(int id, String stage, String text) {
    jdbc.update("DELETE FROM text_evaluations WHERE evaluation_id = ? AND stage = ?", id, stage);
    if (text != null && !text.isBlank())
      jdbc.update("INSERT INTO text_evaluations (evaluation_id, `text`, stage) VALUES (?, ?, ?)",
          id, text, stage);
  }

  private List<SavedSample> loadForMember(int membershipId) {
    List<Integer> evaluationIds = jdbc.query("""
        SELECT evaluation_id FROM evaluations WHERE session_evaluator_id = ?
        ORDER BY session_sample_id
        """, (rs, row) -> rs.getInt(1), membershipId);
    List<SavedSample> results = new ArrayList<>();
    for (int id : evaluationIds)
      results.add(loadOne(id));
    return results;
  }

  private SavedSample loadOne(int id) {
    return jdbc.queryForObject("""
        SELECT * FROM evaluations WHERE evaluation_id = ?
        """, (rs, row) -> {
      List<Cup> cups = jdbc.query("""
          SELECT cup_number, uniformity, clean_cup, sweetness
          FROM defect_cup_evaluations WHERE evaluation_id = ? ORDER BY cup_number
          """, (crs, n) -> new Cup(crs.getInt(1), crs.getBoolean(2), crs.getBoolean(3), crs.getBoolean(4)), id);
      String defect = null;
      Integer defectId = (Integer) rs.getObject("defect_type_id");
      if (defectId != null) {
        defect = jdbc.queryForObject("SELECT LOWER(defect_name) FROM defect_types WHERE defect_type_id = ?",
            String.class, defectId);
      }
      List<String> aromas = optionNames(id, "AROMA_QUALITY");
      List<String> flavors = optionNames(id, "FLAVOR_QUALITY");
      List<String> aromaNote = jdbc.query(
          "SELECT `text` FROM text_evaluations WHERE evaluation_id = ? AND stage = 'AROMA'",
          (nr, j) -> nr.getString(1), id);
      List<String> flavorNote = jdbc.query(
          "SELECT `text` FROM text_evaluations WHERE evaluation_id = ? AND stage = 'FLAVOR'",
          (nr, j) -> nr.getString(1), id);
      Sample sample = new Sample(rs.getInt("session_sample_id"),
          (Integer) rs.getObject("dry_aroma"), (Integer) rs.getObject("break_aroma"),
          rs.getString("color_intensity"), rs.getBigDecimal("aroma_quality_score"),
          rs.getBigDecimal("flavor_score"), rs.getBigDecimal("aftertaste_score"),
          rs.getBigDecimal("acidity_score"), rs.getBigDecimal("body_score"),
          rs.getBigDecimal("balance_score"), rs.getBigDecimal("overall_score"),
          (Integer) rs.getObject("acidity_intensity"), (Integer) rs.getObject("body_level"),
          defect, aromas, flavors, cups,
          aromaNote.isEmpty() ? "" : aromaNote.get(0), flavorNote.isEmpty() ? "" : flavorNote.get(0));
      var at = rs.getTimestamp("finalized_at");
      return new SavedSample(id, sample.sessionSampleId(), rs.getString("status"),
          at == null ? null : at.toLocalDateTime().toString(),
          rs.getBigDecimal("total_score"), sample);
    }, id);
  }

  private List<String> optionNames(int evaluationId, String type) {
    return jdbc.query("""
        SELECT o.option_name FROM evaluation_option_selections s
        JOIN evaluation_options o ON o.option_id = s.option_id
        WHERE s.evaluation_id = ? AND o.option_type = ? ORDER BY o.option_id
        """, (rs, row) -> rs.getString(1), evaluationId, type);
  }

  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public List<HistoryEntry> history(String email) {
    int account = userId(email);

    List<Integer> sessionIds = jdbc.query("""
        SELECT se.session_id
        FROM session_evaluators se
        JOIN cupping_sessions cs
          ON cs.session_id = se.session_id
        WHERE se.user_id = ?
          AND (
            (
              se.completion_outcome = 'INCOMPLETE_SESSION_CLOSED'
              AND (
                cs.status IN ('FINALIZED', 'CANCELLED')
                OR cs.finalized_at IS NOT NULL
              )
            )
            OR (
              (
                se.completion_outcome = 'FINALIZED'
                OR (
                  se.completion_outcome IS NULL
                  AND se.evaluation_started_at IS NULL
                  AND se.evaluation_ended_at IS NULL
                )
              )
              AND EXISTS (
                SELECT 1
                FROM session_samples ss
                WHERE ss.session_id = se.session_id
              )
              AND NOT EXISTS (
                SELECT 1
                FROM session_samples ss
                WHERE ss.session_id = se.session_id
                  AND NOT EXISTS (
                    SELECT 1
                    FROM evaluations e
                    WHERE e.session_evaluator_id =
                          se.session_evaluator_id
                      AND e.session_sample_id = ss.session_sample_id
                      AND e.status = 'FINALIZED'
                      AND e.total_score IS NOT NULL
                  )
              )
            )
          )
        ORDER BY se.session_id DESC
        """,
        (rs, row) -> rs.getInt("session_id"),
        account);

    List<HistoryEntry> history = new ArrayList<>();

    for (int sessionId : sessionIds) {
      HistoryTiming timing = historyTiming(sessionId, account);

      String name = jdbc.queryForObject("""
          SELECT session_name
          FROM cupping_sessions
          WHERE session_id = ?
          """,
          String.class,
          sessionId);

      boolean incomplete = "INCOMPLETE_SESSION_CLOSED"
          .equals(timing.completionOutcome());

      List<SavedSample> samples;
      String completedAt;

      if (incomplete) {
        // Keep incomplete scores out of the finalized history payload.
        samples = List.of();

        // A never-started evaluator can still belong to a timed session.
        // If nobody started, no timing end exists; leave the date unavailable.
        completedAt = timing.sessionTimer().endedAt() == null
            ? ""
            : timing.sessionTimer().endedAt().toString();
      } else {
        int member = membership(sessionId, account);

        samples = loadForMember(member).stream()
            .filter(item -> "FINALIZED".equals(item.status()))
            .toList();

        if (samples.isEmpty()) {
          continue;
        }

        completedAt = timing.evaluatorTimer().endedAt() != null
            ? timing.evaluatorTimer().endedAt().toString()
            : samples.stream()
                .map(SavedSample::finalizedAt)
                .filter(Objects::nonNull)
                .max(String::compareTo)
                .orElse("");
      }

      history.add(new HistoryEntry(
          sessionId,
          name,
          completedAt,
          samples,
          timing.sessionClosed(),
          timing.completionOutcome(),
          timing.sessionTimer(),
          timing.evaluatorTimer(),
          false));
    }

    List<HistoryEntry> creatorEntries = jdbc.query("""
        SELECT
          cs.session_id,
          cs.session_name,
          cs.session_started_at,
          cs.session_ended_at,
          cs.session_elapsed_seconds
        FROM cupping_sessions cs
        WHERE cs.created_by = ?
          AND (
            cs.status IN ('FINALIZED', 'CANCELLED')
            OR cs.finalized_at IS NOT NULL
          )
          AND NOT EXISTS (
            SELECT 1
            FROM session_evaluators se
            WHERE se.session_id = cs.session_id
              AND se.user_id = ?
          )
        ORDER BY cs.session_id DESC
        """,
        (rs, row) -> {
          LocalDateTime startedAt = rs.getObject("session_started_at", LocalDateTime.class);

          LocalDateTime endedAt = rs.getObject("session_ended_at", LocalDateTime.class);

          TimerView sessionTimer = new TimerView(
              startedAt == null
                  ? null
                  : startedAt.toInstant(ZoneOffset.UTC),
              endedAt == null
                  ? null
                  : endedAt.toInstant(ZoneOffset.UTC),
              rs.getObject("session_elapsed_seconds", Long.class));

          return new HistoryEntry(
              rs.getInt("session_id"),
              rs.getString("session_name"),
              endedAt == null
                  ? ""
                  : endedAt.toInstant(ZoneOffset.UTC).toString(),
              List.of(),
              true,
              null,
              sessionTimer,
              null,
              true);
        },
        account,
        account);

    history.addAll(creatorEntries);

    return history;
  }

  private record HistoryTiming(
      boolean sessionClosed,
      String completionOutcome,
      TimerView sessionTimer,
      TimerView evaluatorTimer) {
  }

  private HistoryTiming historyTiming(int sessionId, int account) {
    return jdbc.queryForObject("""
        SELECT
          (cs.status IN ('FINALIZED', 'CANCELLED')
            OR cs.finalized_at IS NOT NULL) AS session_closed,
          cs.session_started_at,
          cs.session_ended_at,
          cs.session_elapsed_seconds,
          se.evaluation_started_at,
          se.evaluation_ended_at,
          se.elapsed_seconds,
          se.completion_outcome
        FROM cupping_sessions cs
        JOIN session_evaluators se
          ON se.session_id = cs.session_id
        WHERE cs.session_id = ? AND se.user_id = ?
        """,
        (rs, row) -> {
          LocalDateTime sessionStart = rs.getObject("session_started_at", LocalDateTime.class);
          LocalDateTime sessionEnd = rs.getObject("session_ended_at", LocalDateTime.class);
          LocalDateTime evaluationStart = rs.getObject("evaluation_started_at", LocalDateTime.class);
          LocalDateTime evaluationEnd = rs.getObject("evaluation_ended_at", LocalDateTime.class);

          return new HistoryTiming(
              rs.getBoolean("session_closed"),
              rs.getString("completion_outcome"),
              new TimerView(
                  sessionStart == null
                      ? null
                      : sessionStart.toInstant(ZoneOffset.UTC),
                  sessionEnd == null
                      ? null
                      : sessionEnd.toInstant(ZoneOffset.UTC),
                  rs.getObject("session_elapsed_seconds", Long.class)),
              new TimerView(
                  evaluationStart == null
                      ? null
                      : evaluationStart.toInstant(ZoneOffset.UTC),
                  evaluationEnd == null
                      ? null
                      : evaluationEnd.toInstant(ZoneOffset.UTC),
                  rs.getObject("elapsed_seconds", Long.class)));
        },
        sessionId, account);
  }
}
