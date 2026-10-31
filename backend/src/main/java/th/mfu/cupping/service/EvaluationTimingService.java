package th.mfu.cupping.service;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import th.mfu.cupping.dto.EvaluationTimingDtos.TimerView;
import th.mfu.cupping.dto.EvaluationTimingDtos.TimingView;
import th.mfu.cupping.repository.UserRepository;
import th.mfu.cupping.dto.EvaluationTimingDtos.SessionTimingView;
import th.mfu.cupping.dto.EvaluationTimingDtos.EvaluatorTimingView;

@Service
public class EvaluationTimingService {

  private final JdbcTemplate jdbc;
  private final UserRepository users;
  private final Clock clock;

  public EvaluationTimingService(
      JdbcTemplate jdbc,
      UserRepository users,
      @Qualifier("evaluationClock") Clock clock) {
    this.jdbc = jdbc;
    this.users = users;
    this.clock = clock;
  }

  private int currentUserId(String email) {
    if (email == null || email.isBlank()) {
      throw new ResponseStatusException(
          HttpStatus.UNAUTHORIZED, "Login required");
    }

    return users.findByEmailIgnoreCase(email)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.UNAUTHORIZED, "Account not found"))
        .getUserId();
  }

  private record SessionState(
      int creatorId,
      String mode,
      boolean creatorParticipates,
      boolean closed,
      String status) {
  }

  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public SessionTimingView getSessionTiming(
      Integer sessionId, String email) {

    int userId = currentUserId(email);

    List<SessionTimingView> rows = jdbc.query("""
        SELECT session_id,
               session_started_at,
               session_ended_at,
               session_elapsed_seconds,
               (
                 finalized_at IS NOT NULL
                 OR status IN ('FINALIZED', 'CANCELLED')
               ) AS closed
        FROM cupping_sessions
        WHERE session_id = ?
          AND created_by = ?
        """,
        (rs, row) -> new SessionTimingView(
            rs.getInt("session_id"),
            clock.instant(),
            rs.getBoolean("closed"),
            new TimerView(
                utcInstant(rs, "session_started_at"),
                utcInstant(rs, "session_ended_at"),
                rs.getObject("session_elapsed_seconds", Long.class)),
            List.of()),
        sessionId, userId);

    if (rows.isEmpty()) {
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN,
          "Session timing is available only to its creator");
    }

    // Read evaluator timing only after confirming creator access.
    List<EvaluatorTimingView> evaluators = jdbc.query("""
        SELECT session_evaluator_id,
               completion_outcome,
               evaluation_started_at,
               evaluation_ended_at,
               elapsed_seconds
        FROM session_evaluators
        WHERE session_id = ?
        ORDER BY session_evaluator_id
        """,
        (rs, row) -> new EvaluatorTimingView(
            rs.getInt("session_evaluator_id"),
            rs.getString("completion_outcome"),
            new TimerView(
                utcInstant(rs, "evaluation_started_at"),
                utcInstant(rs, "evaluation_ended_at"),
                rs.getObject("elapsed_seconds", Long.class))),
        sessionId);

    SessionTimingView session = rows.get(0);

    return new SessionTimingView(
        session.sessionId(),
        session.serverNow(),
        session.sessionClosed(),
        session.sessionTimer(),
        evaluators);
  }

  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public TimingView get(Integer sessionId, String email) {
    int userId = currentUserId(email);
    return readTiming(sessionId, userId);
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public TimingView begin(Integer sessionId, String email) {
    int userId = currentUserId(email);

    // Always lock the session before its evaluator membership.
    List<SessionState> sessions = jdbc.query("""
        SELECT created_by, mode, creator_participates, status,
               (
                 finalized_at IS NOT NULL
                 OR status IN ('FINALIZED', 'CANCELLED')
               ) AS closed
        FROM cupping_sessions
        WHERE session_id = ?
        FOR UPDATE
        """,
        (rs, row) -> new SessionState(
            rs.getInt("created_by"),
            rs.getString("mode"),
            rs.getBoolean("creator_participates"),
            rs.getBoolean("closed"),
            rs.getString("status")),
        sessionId);

    if (sessions.isEmpty()) {
      throw new ResponseStatusException(
          HttpStatus.NOT_FOUND, "Session not found");
    }

    SessionState session = sessions.get(0);

    List<Integer> memberships = jdbc.query("""
        SELECT session_evaluator_id
        FROM session_evaluators
        WHERE session_id = ? AND user_id = ?
        FOR UPDATE
        """,
        (rs, row) -> rs.getInt("session_evaluator_id"),
        sessionId, userId);

    if (memberships.isEmpty()) {
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN,
          "Only an assigned evaluator can begin evaluation");
    }

    if (session.creatorId() == userId
        && ("EVENT".equals(session.mode())
            || !session.creatorParticipates())) {
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN,
          "The creator is not eligible to evaluate this session");
    }

    if (session.closed()
        || !List.of("DRAFT", "IN_PROGRESS").contains(session.status())) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Session is not open for evaluation");
    }

    int membershipId = memberships.get(0);
    TimingView existing = readTiming(sessionId, userId);

    String outcome = existing.completionOutcome();

    if (existing.evaluatorTimer().endedAt() != null
        || (outcome != null && !"IN_PROGRESS".equals(outcome))) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Evaluation is already closed");
    }

    // Protect historical finalized scores that predate timing.
    Boolean hasFinalizedSamples = jdbc.queryForObject("""
        SELECT EXISTS (
          SELECT 1
          FROM evaluations
          WHERE session_evaluator_id = ?
            AND status = 'FINALIZED'
        )
        """,
        Boolean.class,
        membershipId);

    if (Boolean.TRUE.equals(hasFinalizedSamples)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "This evaluation already contains finalized samples");
    }

    // Repeated Begin returns the original timing without changing it.
    if (existing.evaluatorTimer().startedAt() != null) {
      return existing;
    }

    // Capture one UTC timestamp for both starts.
    Instant now = clock.instant().truncatedTo(ChronoUnit.MICROS);
    LocalDateTime utcNow = LocalDateTime.ofInstant(now, ZoneOffset.UTC);

    jdbc.update("""
        UPDATE cupping_sessions
        SET session_started_at = ?
        WHERE session_id = ?
          AND session_started_at IS NULL
        """,
        utcNow, sessionId);

    jdbc.update("""
        UPDATE session_evaluators
        SET evaluation_started_at = ?,
            completion_outcome = 'IN_PROGRESS'
        WHERE session_evaluator_id = ?
          AND evaluation_started_at IS NULL
        """,
        utcNow, membershipId);

    return readTiming(sessionId, userId);
  }

  private TimingView readTiming(Integer sessionId, int userId) {
    List<TimingView> rows = jdbc.query("""
        SELECT cs.session_id,
               cs.session_started_at,
               cs.session_ended_at,
               cs.session_elapsed_seconds,
               (
                 cs.finalized_at IS NOT NULL
                 OR cs.status IN ('FINALIZED', 'CANCELLED')
               ) AS closed,
               se.session_evaluator_id,
               se.evaluation_started_at,
               se.evaluation_ended_at,
               se.elapsed_seconds,
               se.completion_outcome
        FROM cupping_sessions cs
        JOIN session_evaluators se
          ON se.session_id = cs.session_id
        WHERE cs.session_id = ? AND se.user_id = ?
        """,
        (rs, row) -> new TimingView(
            rs.getInt("session_id"),
            rs.getInt("session_evaluator_id"),
            clock.instant(),
            rs.getBoolean("closed"),
            rs.getString("completion_outcome"),
            new TimerView(
                utcInstant(rs, "session_started_at"),
                utcInstant(rs, "session_ended_at"),
                rs.getObject("session_elapsed_seconds", Long.class)),
            new TimerView(
                utcInstant(rs, "evaluation_started_at"),
                utcInstant(rs, "evaluation_ended_at"),
                rs.getObject("elapsed_seconds", Long.class))),
        sessionId, userId);

    if (rows.isEmpty()) {
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN,
          "No evaluator membership exists for this session");
    }

    return rows.get(0);
  }

  private Instant utcInstant(ResultSet rs, String column)
      throws SQLException {
    LocalDateTime value = rs.getObject(column, LocalDateTime.class);
    return value == null ? null : value.toInstant(ZoneOffset.UTC);
  }
}
