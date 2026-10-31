
package th.mfu.cupping.service;

import java.time.LocalDateTime;
import java.util.*;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.simple.SimpleJdbcInsert;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import th.mfu.cupping.dto.IndividualSessionDtos.*;
import th.mfu.cupping.model.User;
import th.mfu.cupping.repository.UserRepository;

@Service
public class IndividualSessionService {

  private final JdbcTemplate jdbc;
  private final UserRepository users;

  private final SimpleJdbcInsert insertSession;
  private final SimpleJdbcInsert insertSample;

  public IndividualSessionService(
      JdbcTemplate jdbc,
      UserRepository users) {

    this.jdbc = jdbc;
    this.users = users;

    insertSession = new SimpleJdbcInsert(jdbc)
        .withTableName("cupping_sessions")
        .usingColumns(
            "created_by", "session_name", "description",
            "mode", "evaluator_capacity",
            "creator_participates")
        .usingGeneratedKeyColumns("session_id");

    insertSample = new SimpleJdbcInsert(jdbc)
        .withTableName("coffee_samples")
        .usingColumns(
            "created_by", "sample_name",
            "process", "harvest_year",
            "growing_location", "owner_producer")
        .usingGeneratedKeyColumns("sample_id");
  }

  private ResponseStatusException bad(String message) {
    return new ResponseStatusException(
        HttpStatus.BAD_REQUEST, message);
  }

  private User currentUser(String email) {
    return users.findByEmailIgnoreCase(email)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.UNAUTHORIZED, "User not found"));
  }

  public List<LibrarySample> library(String email) {
    int userId = currentUser(email).getUserId();

    return jdbc.query("""
        SELECT sample_id, sample_name, process,
               harvest_year, growing_location,
               owner_producer
        FROM coffee_samples
        WHERE created_by = ?
        ORDER BY sample_id DESC
        """,
        (rs, row) -> new LibrarySample(
            rs.getInt("sample_id"),
            rs.getString("sample_name"),
            rs.getString("process"),
            (Integer) rs.getObject("harvest_year"),
            rs.getString("growing_location"),
            rs.getString("owner_producer")),
        userId);
  }

  @Transactional
  public SessionView create(
      CreateRequest request,
      String email) {

    int creatorId = currentUser(email).getUserId();

    if (request.evaluatorLimit() < 1 ||
        request.evaluatorLimit() > 10) {
      throw bad("Evaluator limit must be 1 to 10");
    }

    if (request.samples() == null || request.samples().isEmpty()
        || request.samples().size() > 10) {
      throw bad("Select between 1 and 10 coffee samples");
    }

    String name = request.sessionName().trim();

    if (name.isEmpty()) {
      throw bad("Session name is required");
    }

    // Validate all selections before inserting anything.
    Set<String> codes = new HashSet<>();
    Set<Integer> existingIds = new HashSet<>();

    for (SampleChoice choice : request.samples()) {

      String code = choice.sampleCode().trim();

      if (code.isEmpty() || code.length() > 100) {
        throw bad("Invalid sample code");
      }

      if (!codes.add(code.toLowerCase(Locale.ROOT))) {
        throw bad("Duplicate sample code: " + code);
      }

      boolean existing = choice.sampleId() != null;
      boolean newOne = choice.newSample() != null;

      if (existing == newOne) {
        throw bad(
            "Choose an existing OR a new sample");
      }

      if (existing) {
        if (!existingIds.add(choice.sampleId())) {
          throw bad("Duplicate existing sample");
        }

        Integer count = jdbc.queryForObject("""
            SELECT COUNT(*)
            FROM coffee_samples
            WHERE sample_id = ? AND created_by = ?
            """,
            Integer.class,
            choice.sampleId(),
            creatorId);

        if (count == null || count == 0) {
          throw bad(
              "Selected sample does not exist or is not yours");
        }
      }
    }

    Map<String, Object> sessionValues = new HashMap<>();
    sessionValues.put("created_by", creatorId);
    sessionValues.put("session_name", name);
    // Persist the optional description in the original transaction.
    // Null and blank descriptions are treated the same.
    String description = request.description();
    sessionValues.put("description",
        description == null || description.isBlank() ? null : description.trim());
    sessionValues.put("mode", "INDIVIDUAL");

    sessionValues.put(
        "evaluator_capacity",
        request.evaluatorLimit());

    sessionValues.put(
        "creator_participates",
        request.creatorParticipates());

    int sessionId = insertSession
        .executeAndReturnKey(sessionValues)
        .intValue();

    // Creator participates only when they opt in.
    if (request.creatorParticipates()) {
      jdbc.update("""
          INSERT INTO session_evaluators
              (session_id, user_id, joined_at)
          VALUES (?, ?, ?)
          """,
          sessionId,
          creatorId,
          LocalDateTime.now());
    }

    int order = 1;

    for (SampleChoice choice : request.samples()) {

      int sampleId;

      if (choice.sampleId() != null) {
        sampleId = choice.sampleId();
      } else {
        NewSample s = choice.newSample();

        Map<String, Object> values = new HashMap<>();
        values.put("created_by", creatorId);
        values.put(
            "sample_name",
            s.sampleName().trim());
        values.put("process", s.process());
        values.put("harvest_year", s.harvestYear());
        values.put(
            "growing_location",
            s.growingLocation());
        values.put(
            "owner_producer",
            s.ownerProducer());

        sampleId = insertSample
            .executeAndReturnKey(values)
            .intValue();
      }

      jdbc.update("""
          INSERT INTO session_samples
            (session_id, sample_id,
             sample_code, display_order)
          VALUES (?, ?, ?, ?)
          """,
          sessionId,
          sampleId,
          choice.sampleCode().trim(),
          order++);
    }

    return get(sessionId, email);
  }

  public SessionView get(Integer sessionId, String email) {

    int userId = currentUser(email).getUserId();

    List<SessionRow> rows = jdbc.query("""
        SELECT session_id, session_name, created_by,
               evaluator_capacity,
               (status = 'FINALIZED' AND finalized_at IS NOT NULL)
                   AS session_finalized,
               (finalized_at IS NOT NULL
                   OR status IN ('FINALIZED', 'CANCELLED'))
                   AS session_closed
        FROM cupping_sessions
        WHERE session_id = ? AND mode = 'INDIVIDUAL'
        """,
        (rs, row) -> new SessionRow(
            rs.getInt("session_id"),
            rs.getString("session_name"),
            rs.getInt("created_by"),
            rs.getInt("evaluator_capacity"),
            rs.getBoolean("session_finalized"),
            rs.getBoolean("session_closed")),
        sessionId);

    if (rows.isEmpty()) {
      throw new ResponseStatusException(
          HttpStatus.NOT_FOUND, "Session not found");
    }

    SessionRow session = rows.get(0);

    boolean isCreator = session.createdBy() == userId;

    List<Integer> membershipIds = jdbc.query("""
        SELECT session_evaluator_id
        FROM session_evaluators
        WHERE session_id = ? AND user_id = ?
        """,
        (rs, row) -> rs.getInt("session_evaluator_id"),
        sessionId,
        userId);

    Integer sessionEvaluatorId = membershipIds.isEmpty() ? null : membershipIds.get(0);

    boolean isEvaluator = sessionEvaluatorId != null;

    boolean finalized = session.finalized();
    boolean canEvaluate = isEvaluator && !session.closed();
    boolean sampleDetailsVisible = isCreator || finalized;

    if (!isCreator && !isEvaluator) {
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN, "Access denied");
    }

    Integer joined = jdbc.queryForObject("""
        SELECT COUNT(*) FROM session_evaluators
        WHERE session_id = ?
        """,
        Integer.class,
        sessionId);

    List<SessionSample> samples;
    if (sampleDetailsVisible) {
      samples = jdbc.query("""
          SELECT ss.session_sample_id,
                 cs.sample_id,
                 ss.sample_code,
                 cs.sample_name,
                 cs.process,
                 cs.harvest_year,
                 cs.growing_location,
                 cs.owner_producer
          FROM session_samples ss
          JOIN coffee_samples cs
            ON ss.sample_id = cs.sample_id
          WHERE ss.session_id = ?
          ORDER BY ss.display_order
          """,
          (rs, row) -> new SessionSample(
              rs.getInt("session_sample_id"),
              rs.getInt("sample_id"),
              rs.getString("sample_code"),
              rs.getString("sample_name"),
              rs.getString("process"),
              (Integer) rs.getObject("harvest_year"),
              rs.getString("growing_location"),
              rs.getString("owner_producer")),
          sessionId);

    } else {
      samples = jdbc.query("""
          SELECT session_sample_id, sample_code
          FROM session_samples
          WHERE session_id = ?
          ORDER BY display_order, session_sample_id
          """,
          (rs, row) -> new SessionSample(
              rs.getInt("session_sample_id"),
              null,
              rs.getString("sample_code"),
              null, null, null, null, null),
          sessionId);
    }

    return new SessionView(
        sessionId,
        session.sessionName(),
        session.evaluatorLimit(),
        joined == null ? 0 : joined,
        isCreator,
        canEvaluate,
        finalized,
        sampleDetailsVisible,
        samples,
        sessionEvaluatorId,
        session.closed());
  }

  private record SessionRow(
      Integer id,
      String sessionName,
      int createdBy,
      int evaluatorLimit,
      boolean finalized,
      boolean closed) {
  }

  // For T08: call only AFTER invitation/account
  // authorization has succeeded.
  @Transactional
  public void addAuthorizedEvaluator(
      Integer sessionId,
      Integer userId) {

    List<Integer> limits = jdbc.query("""
        SELECT evaluator_capacity
        FROM cupping_sessions
        WHERE session_id = ? AND mode = 'INDIVIDUAL'
        FOR UPDATE
        """,
        (rs, row) -> rs.getInt(1),
        sessionId);

    if (limits.isEmpty()) {
      throw new ResponseStatusException(
          HttpStatus.NOT_FOUND, "Session not found");
    }

    Integer count = jdbc.queryForObject("""
        SELECT COUNT(*) FROM session_evaluators
        WHERE session_id = ?
        """,
        Integer.class,
        sessionId);

    if (count != null && count >= limits.get(0)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "Evaluator limit reached");
    }

    Integer alreadyJoined = jdbc.queryForObject("""
        SELECT COUNT(*) FROM session_evaluators
        WHERE session_id = ? AND user_id = ?
        """,
        Integer.class,
        sessionId,
        userId);

    if (alreadyJoined != null && alreadyJoined > 0) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "Already participating");
    }

    if (!users.existsById(userId)) {
      throw new ResponseStatusException(
          HttpStatus.NOT_FOUND,
          "Evaluator account not found");
    }

    jdbc.update("""
        INSERT INTO session_evaluators
            (session_id, user_id, joined_at)
        VALUES (?, ?, ?)
        """,
        sessionId, userId, LocalDateTime.now());
  }
}
