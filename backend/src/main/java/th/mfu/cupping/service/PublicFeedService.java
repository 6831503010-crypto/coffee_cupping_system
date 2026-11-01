package th.mfu.cupping.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import th.mfu.cupping.dto.EvaluationSubmissionDtos.Cup;
import th.mfu.cupping.dto.EvaluationSubmissionDtos.Sample;
import th.mfu.cupping.dto.EvaluationSubmissionDtos.SavedSample;

/** Read-only, consent-filtered publication of finalized sessions' aggregate results. */
@Service
public class PublicFeedService {
  private final JdbcTemplate jdbc;
  private final EvaluationSubmissionService evaluations;

  public PublicFeedService(JdbcTemplate jdbc, EvaluationSubmissionService evaluations) {
    this.jdbc = jdbc;
    this.evaluations = evaluations;
  }

  public record ScoreBreakdown(BigDecimal aromaQuality, BigDecimal flavor,
      BigDecimal aftertaste, BigDecimal acidity, BigDecimal body, BigDecimal balance,
      BigDecimal overall, BigDecimal uniformity, BigDecimal cleanCup, BigDecimal sweetness,
      BigDecimal defectDeduction) {}
  public record JudgeNote(String judgeName, String aromaNotes, String flavorNotes,
      List<String> aromaQualities, List<String> flavorQualities) {}
  public record CupSummary(int cupNumber, int judges, int uniformityPasses,
      int cleanCupPasses, int sweetnessPasses) {}
  public record AdditionalDetails(BigDecimal dryAromaIntensity, BigDecimal breakAromaIntensity,
      String colorIntensity, BigDecimal acidityIntensity, BigDecimal bodyLevel,
      List<CupSummary> cups) {}
  /** Public, non-personal metadata from the coffee inventory record. */
  public record SampleDetails(String process, Integer harvestYear,
      String growingLocation, String ownerProducer) {}
  public record FeedResult(int sessionId, String sessionName, int sessionSampleId,
      String sampleName, SampleDetails sampleDetails, String closedAt,
      BigDecimal averageScore, int finalizedJudges, ScoreBreakdown scores,
      List<JudgeNote> notes, AdditionalDetails additionalDetails) {}

  private record PublicSession(int id, String name, LocalDateTime closedAt) {}
  private record SampleInfo(int id, String name, SampleDetails details) {}
  private record Member(int id, String name, String outcome,
      LocalDateTime startedAt, LocalDateTime endedAt) {}
  private record JudgeEvaluation(String judgeName, Sample data, BigDecimal totalScore) {}

  /** Do not expose private, active, cancelled, or unsubmitted evaluation data. */
  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public List<FeedResult> list() {
    List<PublicSession> sessions = jdbc.query("""
        SELECT session_id, session_name, finalized_at
        FROM cupping_sessions
        WHERE result_visibility = 'PUBLIC' AND status = 'FINALIZED'
          AND finalized_at IS NOT NULL
        ORDER BY finalized_at DESC, session_id DESC
        """, (rs, n) -> new PublicSession(rs.getInt(1), rs.getString(2),
            rs.getObject(3, LocalDateTime.class)));

    List<FeedResult> feed = new ArrayList<>();
    for (PublicSession session : sessions) {
      List<SampleInfo> samples = jdbc.query("""
          SELECT ss.session_sample_id, COALESCE(c.sample_name, ss.sample_code),
                 c.process, c.harvest_year, c.growing_location, c.owner_producer
          FROM session_samples ss
          LEFT JOIN coffee_samples c ON c.sample_id = ss.sample_id
          WHERE ss.session_id = ?
          ORDER BY ss.display_order, ss.session_sample_id
          """, (rs, n) -> new SampleInfo(rs.getInt(1), rs.getString(2),
              new SampleDetails(rs.getString(3), (Integer) rs.getObject(4),
                  rs.getString(5), rs.getString(6))), session.id());
      if (samples.isEmpty()) continue;

      List<Member> members = jdbc.query("""
          SELECT se.session_evaluator_id, u.name, se.completion_outcome,
                 se.evaluation_started_at, se.evaluation_ended_at
          FROM session_evaluators se
          JOIN users u ON u.user_id = se.user_id
          WHERE se.session_id = ?
          ORDER BY se.session_evaluator_id
          """, (rs, n) -> new Member(rs.getInt(1), rs.getString(2), rs.getString(3),
              rs.getObject(4, LocalDateTime.class),
              rs.getObject(5, LocalDateTime.class)), session.id());

      Map<Integer, List<JudgeEvaluation>> bySample = new HashMap<>();
      for (Member member : members) {
        // Legacy rows with no completion outcome are accepted only if every sample
        // is finalized, mirroring the existing History compatibility rule.
        boolean modern = "FINALIZED".equals(member.outcome());
        boolean legacy = member.outcome() == null
            && member.startedAt() == null && member.endedAt() == null;
        if (!modern && !legacy) continue;
        List<SavedSample> saved = evaluations.loadForMember(member.id());
        Map<Integer, SavedSample> valid = new HashMap<>();
        for (SavedSample item : saved) {
          if ("FINALIZED".equals(item.status()) && item.totalScore() != null) {
            valid.put(item.sessionSampleId(), item);
          }
        }
        if (valid.size() != samples.size()
            || samples.stream().anyMatch(sample -> !valid.containsKey(sample.id()))) continue;
        for (SampleInfo sample : samples) {
          SavedSample item = valid.get(sample.id());
          bySample.computeIfAbsent(sample.id(), ignored -> new ArrayList<>())
              .add(new JudgeEvaluation(member.name(), item.data(), item.totalScore()));
        }
      }

      for (SampleInfo sample : samples) {
        List<JudgeEvaluation> judgeResults = bySample.getOrDefault(sample.id(), List.of());
        if (judgeResults.isEmpty()) continue;
        feed.add(new FeedResult(session.id(), session.name(), sample.id(), sample.name(),
            sample.details(), session.closedAt().toInstant(ZoneOffset.UTC).toString(),
            mean(judgeResults, JudgeEvaluation::totalScore), judgeResults.size(),
            scores(judgeResults), notes(judgeResults), details(judgeResults)));
      }
    }
    return feed;
  }

  private static BigDecimal mean(List<JudgeEvaluation> results,
      Function<JudgeEvaluation, BigDecimal> field) {
    List<BigDecimal> values = results.stream().map(field).filter(Objects::nonNull).toList();
    if (values.isEmpty()) return null;
    BigDecimal sum = values.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
    return sum.divide(BigDecimal.valueOf(values.size()), 2, RoundingMode.HALF_UP);
  }

  private ScoreBreakdown scores(List<JudgeEvaluation> results) {
    return new ScoreBreakdown(
        mean(results, r -> r.data().aromaQualityScore()),
        mean(results, r -> r.data().flavorScore()),
        mean(results, r -> r.data().aftertasteScore()),
        mean(results, r -> r.data().acidityScore()),
        mean(results, r -> r.data().bodyScore()),
        mean(results, r -> r.data().balanceScore()),
        mean(results, r -> r.data().overallScore()),
        mean(results, r -> cupScore(r.data(), Cup::uniformity)),
        mean(results, r -> cupScore(r.data(), Cup::cleanCup)),
        mean(results, r -> cupScore(r.data(), Cup::sweetness)),
        mean(results, r -> defectDeduction(r.data())));
  }

  private BigDecimal cupScore(Sample sample, Function<Cup, Boolean> check) {
    if (sample.cups() == null || sample.cups().isEmpty()) return null;
    return BigDecimal.valueOf(sample.cups().stream().filter(c -> check.apply(c)).count() * 2);
  }

  private BigDecimal defectDeduction(Sample sample) {
    if (sample.cups() == null) return null;
    long failed = sample.cups().stream().filter(c -> !c.uniformity()).count();
    int penalty = "taint".equalsIgnoreCase(sample.defectType()) ? 2
        : "fault".equalsIgnoreCase(sample.defectType()) ? 4 : 0;
    return BigDecimal.valueOf(failed * penalty);
  }

  private List<JudgeNote> notes(List<JudgeEvaluation> results) {
    return results.stream().map(r -> new JudgeNote(r.judgeName(),
        r.data().aromaNotes(), r.data().flavorNotes(),
        r.data().aromaQualities() == null ? List.of() : r.data().aromaQualities(),
        r.data().flavorQualities() == null ? List.of() : r.data().flavorQualities())).toList();
  }

  private AdditionalDetails details(List<JudgeEvaluation> results) {
    Map<String, Integer> colors = new HashMap<>();
    for (JudgeEvaluation r : results) {
      if (r.data().colorIntensity() != null) {
        colors.merge(r.data().colorIntensity(), 1, Integer::sum);
      }
    }
    // A categorical descriptor has a mode, not a numeric average. Ties are "Mixed".
    int max = colors.values().stream().mapToInt(Integer::intValue).max().orElse(0);
    List<String> leaders = colors.entrySet().stream()
        .filter(e -> e.getValue() == max && max > 0)
        .map(Map.Entry::getKey).sorted().toList();
    String color = leaders.isEmpty() ? null : leaders.size() > 1 ? "Mixed" : leaders.get(0);

    List<CupSummary> cups = new ArrayList<>();
    for (int n = 1; n <= 5; n++) {
      final int number = n;
      List<Cup> matches = results.stream().flatMap(r ->
          r.data().cups() == null ? java.util.stream.Stream.<Cup>empty()
              : r.data().cups().stream())
          .filter(c -> c.cupNumber() == number).toList();
      if (matches.isEmpty()) continue;
      cups.add(new CupSummary(n, matches.size(),
          (int) matches.stream().filter(Cup::uniformity).count(),
          (int) matches.stream().filter(Cup::cleanCup).count(),
          (int) matches.stream().filter(Cup::sweetness).count()));
    }
    return new AdditionalDetails(
        mean(results, r -> decimal(r.data().dryAroma())),
        mean(results, r -> decimal(r.data().breakAroma())),
        color,
        mean(results, r -> decimal(r.data().acidityIntensity())),
        mean(results, r -> decimal(r.data().bodyLevel())), cups);
  }

  private static BigDecimal decimal(Integer value) {
    return value == null ? null : BigDecimal.valueOf(value);
  }
}
