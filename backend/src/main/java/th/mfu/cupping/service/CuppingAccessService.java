package th.mfu.cupping.service;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import th.mfu.cupping.model.*;
import th.mfu.cupping.repository.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CuppingAccessService {
  private final UserRepository users;
  private final CuppingSessionRepository sessions;
  private final CoffeeSampleRepository samples;
  private final SessionSampleRepository sessionSamples;
  private final SessionEvaluatorRepository evaluators;
  private final EvaluationRepository evaluations;
  private final JdbcTemplate jdbc;

  public CuppingAccessService(UserRepository users, CuppingSessionRepository sessions,
      CoffeeSampleRepository samples, SessionSampleRepository sessionSamples,
      SessionEvaluatorRepository evaluators, EvaluationRepository evaluations, JdbcTemplate jdbc) {
    this.users = users;
    this.sessions = sessions;
    this.samples = samples;
    this.sessionSamples = sessionSamples;
    this.evaluators = evaluators;
    this.evaluations = evaluations;
    this.jdbc = jdbc;
  }

  public User current(Authentication authentication) {
    if (authentication == null || !authentication.isAuthenticated())
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Login required");
    return users.findByEmailIgnoreCase(authentication.getName())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Account not found"));
  }

  public CuppingSession session(Integer id) {
    return sessions.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found"));
  }

  public CoffeeSample sample(Integer id) {
    return samples.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sample not found"));
  }

  public SessionSample sessionSample(Integer id) {
    return sessionSamples.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session sample not found"));
  }

  public SessionEvaluator evaluator(Integer id) {
    return evaluators.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session evaluator not found"));
  }

  public Evaluation evaluation(Integer id) {
    return evaluations.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Evaluation not found"));
  }

  public boolean canReadSession(CuppingSession session, User user) {
    return session.getCreatedBy().equals(user.getUserId())
        || evaluators.existsBySessionIdAndUserId(session.getSessionId(), user.getUserId())
        || ("PUBLIC".equals(session.getResultVisibility()) && "FINALIZED".equals(session.getStatus()));
  }

  public void requireSessionRead(Integer id, User user) {
    if (!canReadSession(session(id), user))
      deny();
  }

  public void requireSessionOwner(Integer id, User user) {
    if (!session(id).getCreatedBy().equals(user.getUserId()))
      deny();
  }

  public void requireSessionOpen(Integer id) {
    var item = session(id);

    if (item.getFinalizedAt() != null
        || "FINALIZED".equals(item.getStatus())
        || "CANCELLED".equals(item.getStatus())) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Session is closed");
    }
  }

  public boolean canReadSample(CoffeeSample sample, User user) {
    // The sample owner already knows its details.
    if (sample.getCreatedBy().equals(user.getUserId())) {
      return true;
    }

    return sessionSamples.findBySampleId(sample.getSampleId()).stream()
        .anyMatch(ss -> {
          CuppingSession session = session(ss.getSessionId());

          // The session organizer can manage its samples.
          if (session.getCreatedBy().equals(user.getUserId())) {
            return true;
          }

          boolean completed = "FINALIZED".equals(session.getStatus())
              && session.getFinalizedAt() != null;

          // Other users need both completion and session read access.
          return completed && canReadSession(session, user);
        });
  }

  public void requireSampleRead(Integer id, User user) {
    if (!canReadSample(sample(id), user))
      deny();
  }

  public void requireSampleOwner(Integer id, User user) {
    if (!sample(id).getCreatedBy().equals(user.getUserId()))
      deny();
  }

  public boolean canReadEvaluation(Evaluation evaluation, User user) {
    SessionEvaluator evaluator = evaluator(evaluation.getSessionEvaluatorId());
    CuppingSession session = session(evaluator.getSessionId());
    return evaluator.getUserId().equals(user.getUserId())
        || session.getCreatedBy().equals(user.getUserId())
        || ("PUBLIC".equals(session.getResultVisibility())
            && "FINALIZED".equals(session.getStatus())
            && "FINALIZED".equals(evaluation.getStatus()));
  }

  public void requireEvaluationRead(Integer id, User user) {
    if (!canReadEvaluation(evaluation(id), user))
      deny();
  }

  @Transactional(propagation = Propagation.MANDATORY)
  public void requireEvaluationWrite(Integer id, User user) {
    Evaluation item = evaluation(id);

    requireActiveEvaluatorWrite(
        item.getSessionEvaluatorId(), user);

    var statuses = jdbc.query("""
        SELECT status
        FROM evaluations
        WHERE evaluation_id = ?
        FOR UPDATE
        """,
        (rs, row) -> rs.getString("status"),
        id);

    if (statuses.isEmpty()) {
      throw new ResponseStatusException(
          HttpStatus.NOT_FOUND, "Evaluation not found");
    }

    if ("FINALIZED".equals(statuses.get(0))) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Evaluation is finalized");
    }
  }

  @Transactional(propagation = Propagation.MANDATORY)
  public void validateEvaluationPair(
      Integer evaluatorId,
      Integer sessionSampleId,
      User user) {

    requireActiveEvaluatorWrite(evaluatorId, user);

    SessionEvaluator membership = evaluator(evaluatorId);
    SessionSample sample = sessionSample(sessionSampleId);

    if (!membership.getSessionId().equals(sample.getSessionId())) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "Evaluator and sample must belong to same session");
    }
  }

  @Transactional(propagation = Propagation.MANDATORY)
  public boolean isAromaLockedForMember(
      Integer evaluatorId,
      User user) {

    // Acquires the existing session/member locks and verifies
    // ownership, Begin status and that evaluation is still open.
    requireActiveEvaluatorWrite(evaluatorId, user);

    Boolean locked = jdbc.queryForObject("""
        SELECT aroma_locked_at IS NOT NULL
        FROM session_evaluators
        WHERE session_evaluator_id = ?
        FOR UPDATE
        """,
        Boolean.class,
        evaluatorId);

    return Boolean.TRUE.equals(locked);
  }

  @Transactional(propagation = Propagation.MANDATORY)
  public void requireAromaEditable(
      Integer evaluationId,
      User user) {

    requireEvaluationWrite(evaluationId, user);

    Integer memberId = evaluation(evaluationId)
        .getSessionEvaluatorId();

    Boolean locked = jdbc.queryForObject("""
        SELECT aroma_locked_at IS NOT NULL
        FROM session_evaluators
        WHERE session_evaluator_id = ?
        FOR UPDATE
        """,
        Boolean.class,
        memberId);

    if (Boolean.TRUE.equals(locked)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "Aroma stage is locked");
    }
  }

  public void requireSelf(Integer userId, User user) {
    if (!user.getUserId().equals(userId))
      deny();
  }

  public void deny() {
    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
  }

  private void requireActiveEvaluatorWrite(Integer evaluatorId, User user) {
    // Discover the session without acquiring a membership lock first.
    SessionEvaluator membership = evaluator(evaluatorId);

    if (!membership.getUserId().equals(user.getUserId())) {
      deny();
    }

    Integer sessionId = membership.getSessionId();

    // Same lock order as Begin, whole-form submission and closure:
    // session first, membership second.
    var sessions = jdbc.query("""
        SELECT status, finalized_at, session_ended_at
        FROM cupping_sessions
        WHERE session_id = ?
        FOR UPDATE
        """,
        (rs, row) -> rs.getTimestamp("finalized_at") != null
            || rs.getTimestamp("session_ended_at") != null
            || "FINALIZED".equals(rs.getString("status"))
            || "CANCELLED".equals(rs.getString("status")),
        sessionId);

    if (sessions.isEmpty()) {
      throw new ResponseStatusException(
          HttpStatus.NOT_FOUND, "Session not found");
    }

    if (sessions.get(0)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Session is closed");
    }

    // Read current database values after acquiring the session lock.
    // Avoid relying on a previously loaded JPA membership.
    var active = jdbc.query("""
        SELECT user_id,
               evaluation_started_at,
               evaluation_ended_at,
               completion_outcome
        FROM session_evaluators
        WHERE session_evaluator_id = ?
          AND session_id = ?
        FOR UPDATE
        """,
        (rs, row) -> {
          if (rs.getInt("user_id") != user.getUserId()) {
            deny();
          }

          return rs.getTimestamp("evaluation_started_at") != null
              && rs.getTimestamp("evaluation_ended_at") == null
              && "IN_PROGRESS".equals(
                  rs.getString("completion_outcome"));
        },
        evaluatorId,
        sessionId);

    if (active.isEmpty()) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Evaluator was removed");
    }

    if (!active.get(0)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "Evaluation must be started and still in progress");
    }
  }
}
