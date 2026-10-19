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

@RestController
@RequestMapping("/api/sessions")
public class CuppingSessionController {
  private final CuppingSessionRepository repo;
  private final CuppingAccessService access;
  private final SessionEvaluatorRepository evaluators;

  public CuppingSessionController(CuppingSessionRepository repo, CuppingAccessService access, SessionEvaluatorRepository evaluators) {
    this.repo = repo; this.access = access; this.evaluators = evaluators;
  }

  @GetMapping
  public List<CuppingSession> list(Authentication auth) {
    User user = access.current(auth);
    return repo.findAll().stream()
        .filter(item -> { try { access.requireSessionRead(item.getSessionId(), user); return true; } catch (org.springframework.web.server.ResponseStatusException ex) { return false; } })
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
    return repo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "CuppingSession not found"));
  }

  @PostMapping
  @Transactional
  public ResponseEntity<CuppingSession> create(@Valid @RequestBody CuppingSessionRequest request, Authentication auth) {
    User user = access.current(auth);
if (!java.util.Set.of("INDIVIDUAL", "EVENT").contains(request.mode()))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mode must be INDIVIDUAL or EVENT");
    if (request.status() != null && !java.util.Set.of("DRAFT", "IN_PROGRESS", "FINALIZED", "CANCELLED").contains(request.status()))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid session status");
    if (request.resultVisibility() != null && !java.util.Set.of("PRIVATE", "PUBLIC").contains(request.resultVisibility()))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid visibility");
    CuppingSession item = new CuppingSession();
    item.setSessionName(request.sessionName());
    item.setMode(request.mode());
    item.setDescription(request.description());
    item.setCuppingDate(request.cuppingDate());
    item.setCreatedBy(user.getUserId());
    item.setStatus("DRAFT");
    item.setResultVisibility(request.resultVisibility() == null ? "PRIVATE" : request.resultVisibility());
    item = repo.saveAndFlush(item);
    if ("INDIVIDUAL".equals(item.getMode())) {
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
  public CuppingSession update(@PathVariable Integer id, @Valid @RequestBody CuppingSessionRequest request, Authentication auth) {
    User user = access.current(auth);
    CuppingSession item = find(id);
    access.requireSessionOwner(id, user); access.requireSessionOpen(id);
if (!java.util.Set.of("INDIVIDUAL", "EVENT").contains(request.mode())
        || !request.mode().equals(item.getMode()))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mode cannot be changed");
    if (request.status() != null && !java.util.Set.of("DRAFT", "IN_PROGRESS", "FINALIZED", "CANCELLED").contains(request.status()))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid session status");
    if (request.resultVisibility() != null && !java.util.Set.of("PRIVATE", "PUBLIC").contains(request.resultVisibility()))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid visibility");
    item.setSessionName(request.sessionName());
    item.setDescription(request.description());
    item.setCuppingDate(request.cuppingDate());
    item.setResultVisibility(request.resultVisibility() == null ? item.getResultVisibility() : request.resultVisibility());
    if (request.status() != null) {
      item.setStatus(request.status());
      if ("FINALIZED".equals(request.status())) item.setFinalizedAt(java.time.LocalDateTime.now());
    }
    return repo.saveAndFlush(item);
  }

  @DeleteMapping("/{id}")
  @Transactional
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable Integer id, Authentication auth) {
    User user = access.current(auth);
    CuppingSession item = find(id);
    access.requireSessionOwner(id, user); access.requireSessionOpen(id);
    repo.delete(item);
    repo.flush();
  }
}
