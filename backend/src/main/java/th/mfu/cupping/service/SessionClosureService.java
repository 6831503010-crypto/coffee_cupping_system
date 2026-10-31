package th.mfu.cupping.service;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import th.mfu.cupping.model.CuppingSession;

@Service
public class SessionClosureService {

  private final JdbcTemplate jdbc;
  private final Clock clock;

  public SessionClosureService(
      JdbcTemplate jdbc,
      @Qualifier("evaluationClock") Clock clock) {
    this.jdbc = jdbc;
    this.clock = clock;
  }

  private record Member(
      int id,
      LocalDateTime startedAt,
      LocalDateTime endedAt,
      String outcome,
      long finalizedSamples) {
  }

  /*
   * The caller must:
   * 1. Run inside a transaction.
   * 2. Hold the session's write lock.
   * 3. Verify that the authenticated user owns the session.
   *
   * The caller saves the updated session entity in that transaction.
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public void close(
      CuppingSession session,
      String targetStatus,
      boolean acknowledgeIncomplete) {

    if (!"FINALIZED".equals(targetStatus)
        && !"CANCELLED".equals(targetStatus)) {
      throw conflict("Invalid session closure status");
    }

    if (session.getFinalizedAt() != null
        || session.getSessionEndedAt() != null
        || "FINALIZED".equals(session.getStatus())
        || "CANCELLED".equals(session.getStatus())) {
      throw conflict("Session is already closed");
    }

    Integer sampleCount = jdbc.queryForObject("""
        SELECT COUNT(*)
        FROM session_samples
        WHERE session_id = ?
        """,
        Integer.class,
        session.getSessionId());

    int requiredSamples = sampleCount == null ? 0 : sampleCount;

    // The session is already locked; lock memberships second.
    List<Member> members = jdbc.query("""
        SELECT se.session_evaluator_id,
               se.evaluation_started_at,
               se.evaluation_ended_at,
               se.completion_outcome,
               (
                 SELECT COUNT(*)
                 FROM evaluations e
                 JOIN session_samples ss
                   ON ss.session_sample_id = e.session_sample_id
                 WHERE e.session_evaluator_id = se.session_evaluator_id
                   AND ss.session_id = se.session_id
                   AND e.status = 'FINALIZED'
               ) AS finalized_samples
        FROM session_evaluators se
        WHERE se.session_id = ?
        ORDER BY se.session_evaluator_id
        FOR UPDATE
        """,
        (rs, row) -> new Member(
            rs.getInt("session_evaluator_id"),
            rs.getObject("evaluation_started_at", LocalDateTime.class),
            rs.getObject("evaluation_ended_at", LocalDateTime.class),
            rs.getString("completion_outcome"),
            rs.getLong("finalized_samples")),
        session.getSessionId());

    long completedCount = members.stream()
        .filter(member -> isComplete(member, requiredSamples))
        .count();

    boolean hasIncomplete = completedCount < members.size();

    if ("FINALIZED".equals(targetStatus)) {
      if (completedCount == 0) {
        throw conflict(
            "At least one evaluator must finalize every sample "
                + "before the session can be finalized");
      }

      if (hasIncomplete && !acknowledgeIncomplete) {
        throw conflict(
            "Some evaluators are incomplete. Confirm closure "
                + "to lock their work and exclude their scores");
      }
    }

    LocalDateTime closedAt = LocalDateTime.ofInstant(
        clock.instant().truncatedTo(ChronoUnit.MICROS),
        ZoneOffset.UTC);

    if (session.getSessionStartedAt() != null) {
      long seconds = elapsed(
          session.getSessionStartedAt(), closedAt);

      session.setSessionEndedAt(closedAt);
      session.setSessionElapsedSeconds(seconds);
    }

    for (Member member : members) {
      if (isComplete(member, requiredSamples)) {
        // Preserve completed evaluations and their original timing.
        continue;
      }

      // Reject inconsistent terminal data rather than overwrite it.
      if (member.endedAt() != null
          || "FINALIZED".equals(member.outcome())
          || "INCOMPLETE_SESSION_CLOSED".equals(member.outcome())) {
        throw conflict(
            "Evaluator completion data is inconsistent; "
                + "review it before closing the session");
      }

      LocalDateTime endedAt = member.startedAt() == null ? null : closedAt;

      Long seconds = member.startedAt() == null
          ? null
          : elapsed(member.startedAt(), closedAt);

      jdbc.update("""
          UPDATE session_evaluators
          SET evaluation_ended_at = ?,
              elapsed_seconds = ?,
              completion_outcome = 'INCOMPLETE_SESSION_CLOSED'
          WHERE session_evaluator_id = ?
          """,
          endedAt,
          seconds,
          member.id());
    }

    session.setStatus(targetStatus);

    if ("FINALIZED".equals(targetStatus)) {
      session.setFinalizedAt(closedAt);
    }
  }

  private boolean isComplete(Member member, int requiredSamples) {
    if (requiredSamples == 0
        || member.finalizedSamples() != requiredSamples) {
      return false;
    }

    if ("FINALIZED".equals(member.outcome())) {
      return true;
    }

    // Preserve completed records created before timing existed.
    // Their duration remains unknown rather than being invented.
    return member.outcome() == null
        && member.startedAt() == null
        && member.endedAt() == null;
  }

  private long elapsed(
      LocalDateTime startedAt,
      LocalDateTime endedAt) {

    if (endedAt.isBefore(startedAt)) {
      throw conflict(
          "Server time is earlier than a timer start; please retry");
    }

    return Duration.between(startedAt, endedAt).getSeconds();
  }

  private ResponseStatusException conflict(String message) {
    return new ResponseStatusException(
        HttpStatus.CONFLICT, message);
  }
}
