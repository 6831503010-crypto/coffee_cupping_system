package th.mfu.cupping.controller;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;
import jakarta.validation.Valid;
import th.mfu.cupping.dto.SessionEvaluatorRequest;
import th.mfu.cupping.model.*;
import th.mfu.cupping.repository.*;
import th.mfu.cupping.service.CuppingAccessService;

@RestController
@RequestMapping("/api/session-evaluators")
public class SessionEvaluatorController {
  private final SessionEvaluatorRepository repo;
  private final CuppingAccessService access;
  private final UserRepository users;

  public SessionEvaluatorController(SessionEvaluatorRepository repo, CuppingAccessService access, UserRepository users) {
    this.repo = repo; this.access = access; this.users = users;
  }

  @GetMapping
  public List<SessionEvaluator> list(Authentication auth) {
    User user = access.current(auth);
    return repo.findAll().stream()
        .filter(item -> { try { access.requireSessionRead(item.getSessionId(), user); return true; } catch (org.springframework.web.server.ResponseStatusException ex) { return false; } })
        .toList();
  }

  @GetMapping("/{id}")
  public SessionEvaluator get(@PathVariable Integer id, Authentication auth) {
    User user = access.current(auth);
    SessionEvaluator item = find(id);
    access.requireSessionRead(item.getSessionId(), user);
    return item;
  }

  private SessionEvaluator find(Integer id) {
    return repo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "SessionEvaluator not found"));
  }

  @PostMapping
  @Transactional
  public ResponseEntity<SessionEvaluator> create(@Valid @RequestBody SessionEvaluatorRequest request, Authentication auth) {
    User user = access.current(auth);
access.requireSessionOwner(request.sessionId(), user);
    access.requireSessionOpen(request.sessionId());
    if ("INDIVIDUAL".equals(access.session(request.sessionId()).getMode()))
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Individual session already has its sole evaluator");
    if (!users.existsById(request.userId()))
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");

    SessionEvaluator item = new SessionEvaluator();
    item.setSessionId(request.sessionId());
    item.setUserId(request.userId());
    item.setJoinedAt(request.joinedAt());

    item = repo.saveAndFlush(item);

    return ResponseEntity.status(HttpStatus.CREATED).body(item);
  }

  @PutMapping("/{id}")
  @Transactional
  public SessionEvaluator update(@PathVariable Integer id, @Valid @RequestBody SessionEvaluatorRequest request, Authentication auth) {
    User user = access.current(auth);
    SessionEvaluator item = find(id);
    access.requireSessionOwner(item.getSessionId(), user); access.requireSessionOpen(item.getSessionId());
if (!item.getSessionId().equals(request.sessionId()) || !item.getUserId().equals(request.userId()))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot change session or evaluator identity");

    item.setJoinedAt(request.joinedAt());

    return repo.saveAndFlush(item);
  }

  @DeleteMapping("/{id}")
  @Transactional
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable Integer id, Authentication auth) {
    User user = access.current(auth);
    SessionEvaluator item = find(id);
    access.requireSessionOwner(item.getSessionId(), user); access.requireSessionOpen(item.getSessionId());
    repo.delete(item);
    repo.flush();
  }
}
