package th.mfu.cupping.controller;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;
import jakarta.validation.Valid;
import th.mfu.cupping.dto.CuppingSessionRequest;
import th.mfu.cupping.model.*;
import th.mfu.cupping.repository.*;
import th.mfu.cupping.service.CuppingAccessService;
import th.mfu.cupping.service.SessionClosureService;

@RestController
@RequestMapping("/api/sessions")
public class CuppingSessionController {
  private final CuppingSessionRepository repo;
  private final CuppingAccessService access;
  private final SessionEvaluatorRepository evaluators;
  private final SessionClosureService closure;

  public CuppingSessionController(
      CuppingSessionRepository repo,
      CuppingAccessService access,
      SessionEvaluatorRepository evaluators,
      SessionClosureService closure) {

    this.repo = repo;
    this.access = access;
    this.evaluators = evaluators;
    this.closure = closure;
  }

  @GetMapping
  public List<CuppingSession> list(Authentication auth) {
    User user = access.current(auth);
    return repo.findAll().stream()
        .filter(item -> {
          try {
            access.requireSessionRead(item.getSessionId(), user);
            return true;
          } catch (org.springframework.web.server.ResponseStatusException ex) {
            return false;
          }
        })
        .toList();
  }

  @GetMapping("/{id}")
  public CuppingSession get(@PathVariable Integer id, Authentication auth) {
    User user = access.current(auth);
    CuppingSession item = find(id);
    access.requireSessionRead(item.getSessionId(), user);
    return item;
  }

  private CuppingSession find(Integer id) {
    return repo.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "CuppingSession not found"));
  }

  @PostMapping
  @Transactional
  public ResponseEntity<CuppingSession> create(@Valid @RequestBody CuppingSessionRequest request, Authentication auth) {
    User user = access.current(auth);
    if (!java.util.Set.of("INDIVIDUAL", "EVENT").contains(request.mode()))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mode must be INDIVIDUAL or EVENT");
    if (request.status() != null
        && !java.util.Set.of("DRAFT", "IN_PROGRESS", "FINALIZED", "CANCELLED").contains(request.status()))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid session status");
    if (request.resultVisibility() != null
        && !java.util.Set.of("PRIVATE", "PUBLIC").contains(request.resultVisibility()))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid visibility");

    boolean individual = "INDIVIDUAL".equals(request.mode());

    if (individual
        && (request.evaluatorLimit() == null
            || request.creatorParticipates() == null)) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "Individual sessions require evaluatorLimit and creatorParticipates");
    }

    CuppingSession item = new CuppingSession();
    item.setSessionName(request.sessionName());
    item.setMode(request.mode());
    item.setDescription(request.description());
    item.setCuppingDate(request.cuppingDate());
    item.setCreatedBy(user.getUserId());
    item.setStatus("DRAFT");
    item.setResultVisibility(request.resultVisibility() == null ? "PRIVATE" : request.resultVisibility());

    if (individual) {
      item.setEvaluatorCapacity(request.evaluatorLimit());
      item.setCreatorParticipates(request.creatorParticipates());
    }

    item = repo.saveAndFlush(item);
    if (individual && Boolean.TRUE.equals(request.creatorParticipates())) {
      SessionEvaluator evaluator = new SessionEvaluator();
      evaluator.setSessionId(item.getSessionId());
      evaluator.setUserId(user.getUserId());
      evaluator.setJoinedAt(java.time.LocalDateTime.now());
      evaluators.save(evaluator);
    }
    return ResponseEntity.status(HttpStatus.CREATED).body(item);
  }

  @PutMapping("/{id}")
  @Transactional
  public CuppingSession update(@PathVariable Integer id, @Valid @RequestBody CuppingSessionRequest request,
      Authentication auth) {
    User user = access.current(auth);

    CuppingSession item = repo.findByIdForUpdate(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND,
            "CuppingSession not found"));

    if (request.evaluatorLimit() != null
        && !request.evaluatorLimit().equals(item.getEvaluatorCapacity())) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "Evaluator capacity cannot be changed after creation");
    }

    if (request.creatorParticipates() != null
        && !request.creatorParticipates().equals(item.getCreatorParticipates())) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "Creator participation cannot be changed after creation");
    }

    access.requireSessionOwner(id, user);
    access.requireSessionOpen(id);
    if (!java.util.Set.of("INDIVIDUAL", "EVENT").contains(request.mode())
        || !request.mode().equals(item.getMode()))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mode cannot be changed");
    if (request.status() != null
        && !java.util.Set.of("DRAFT", "IN_PROGRESS", "FINALIZED", "CANCELLED").contains(request.status()))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid session status");
    if (request.resultVisibility() != null
        && !java.util.Set.of("PRIVATE", "PUBLIC").contains(request.resultVisibility()))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid visibility");
    item.setSessionName(request.sessionName());
    item.setDescription(request.description());
    item.setCuppingDate(request.cuppingDate());
    item.setResultVisibility(
        request.resultVisibility() == null ? item.getResultVisibility() : request.resultVisibility());
    if (request.status() != null) {
      boolean closing = "FINALIZED".equals(request.status())
          || "CANCELLED".equals(request.status());

      if (closing) {
        closure.close(
            item,
            request.status(),
            Boolean.TRUE.equals(request.acknowledgeIncomplete()));
      } else {
        item.setStatus(request.status());
      }
    }
    return repo.saveAndFlush(item);
  }

  /** Publication can be changed after closure; only the session creator may do so. */
  public record VisibilityUpdate(String resultVisibility) {}

  @PatchMapping("/{id}/visibility")
  @Transactional
  public CuppingSession updateVisibility(@PathVariable Integer id,
      @RequestBody VisibilityUpdate request, Authentication auth) {
    User user = access.current(auth);
    access.requireSessionOwner(id, user);
    if (request == null || !java.util.Set.of("PUBLIC", "PRIVATE").contains(request.resultVisibility())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Visibility must be PUBLIC or PRIVATE");
    }
    CuppingSession session = repo.findByIdForUpdate(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found"));
    session.setResultVisibility(request.resultVisibility());
    return repo.saveAndFlush(session);
  }

  @DeleteMapping("/{id}")
  @Transactional
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable Integer id, Authentication auth) {
    User user = access.current(auth);
    CuppingSession item = find(id);
    access.requireSessionOwner(id, user);
    access.requireSessionOpen(id);
    repo.delete(item);
    repo.flush();
  }
}
