package th.mfu.cupping.service;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import th.mfu.cupping.model.*;
import th.mfu.cupping.repository.*;

@Service
public class CuppingAccessService {
  private final UserRepository users;
  private final CuppingSessionRepository sessions;
  private final CoffeeSampleRepository samples;
  private final SessionSampleRepository sessionSamples;
  private final SessionEvaluatorRepository evaluators;
  private final EvaluationRepository evaluations;

  public CuppingAccessService(UserRepository users, CuppingSessionRepository sessions,
      CoffeeSampleRepository samples, SessionSampleRepository sessionSamples,
      SessionEvaluatorRepository evaluators, EvaluationRepository evaluations) {
    this.users = users;
    this.sessions = sessions;
    this.samples = samples;
    this.sessionSamples = sessionSamples;
    this.evaluators = evaluators;
    this.evaluations = evaluations;
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
    if (!canReadSession(session(id), user)) deny();
  }

  public void requireSessionOwner(Integer id, User user) {
    if (!session(id).getCreatedBy().equals(user.getUserId())) deny();
  }

  public void requireSessionOpen(Integer id) {
    String status = session(id).getStatus();
    if ("FINALIZED".equals(status) || "CANCELLED".equals(status))
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Session is closed");
  }

  public boolean canReadSample(CoffeeSample sample, User user) {
    if (sample.getCreatedBy().equals(user.getUserId())) return true;
    return sessionSamples.findBySampleId(sample.getSampleId()).stream()
        .anyMatch(ss -> canReadSession(session(ss.getSessionId()), user));
  }

  public void requireSampleRead(Integer id, User user) {
    if (!canReadSample(sample(id), user)) deny();
  }

  public void requireSampleOwner(Integer id, User user) {
    if (!sample(id).getCreatedBy().equals(user.getUserId())) deny();
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
    if (!canReadEvaluation(evaluation(id), user)) deny();
  }

  public void requireEvaluationWrite(Integer id, User user) {
    Evaluation evaluation = evaluation(id);
    SessionEvaluator evaluator = evaluator(evaluation.getSessionEvaluatorId());
    if (!evaluator.getUserId().equals(user.getUserId())) deny();
    requireSessionOpen(evaluator.getSessionId());
    if ("FINALIZED".equals(evaluation.getStatus()))
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Evaluation is finalized");
  }

  public void validateEvaluationPair(Integer evaluatorId, Integer sessionSampleId, User user) {
    SessionEvaluator evaluator = evaluator(evaluatorId);
    SessionSample sample = sessionSample(sessionSampleId);
    if (!evaluator.getSessionId().equals(sample.getSessionId()))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Evaluator and sample must belong to same session");
    if (!evaluator.getUserId().equals(user.getUserId())) deny();
    requireSessionOpen(evaluator.getSessionId());
  }

  public void requireSelf(Integer userId, User user) {
    if (!user.getUserId().equals(userId)) deny();
  }

  public void deny() {
    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
  }
}
