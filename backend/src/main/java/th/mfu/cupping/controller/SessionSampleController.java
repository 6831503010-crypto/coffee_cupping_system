package th.mfu.cupping.controller;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;
import jakarta.validation.Valid;
import th.mfu.cupping.dto.SessionSampleRequest;
import th.mfu.cupping.model.*;
import th.mfu.cupping.repository.*;
import th.mfu.cupping.service.CuppingAccessService;

@RestController
@RequestMapping("/api/session-samples")
public class SessionSampleController {
  private final SessionSampleRepository repo;
  private final CuppingAccessService access;

  public SessionSampleController(SessionSampleRepository repo, CuppingAccessService access) {
    this.repo = repo;
    this.access = access;
  }

  public record SessionSampleView(
      Integer sessionSampleId,
      Integer sessionId,
      Integer sampleId,
      String sampleCode,
      Integer displayOrder) {
  }

  private SessionSampleView toView(SessionSample item, User user) {
    CuppingSession session = access.session(item.getSessionId());

    boolean isCreator = session.getCreatedBy().equals(user.getUserId());

    boolean completed = "FINALIZED".equals(session.getStatus())
        && session.getFinalizedAt() != null;

    return new SessionSampleView(
        item.getSessionSampleId(),
        item.getSessionId(),
        isCreator || completed ? item.getSampleId() : null,
        item.getSampleCode(),
        item.getDisplayOrder());
  }

  @GetMapping
  public List<SessionSampleView> list(Authentication auth) {
    User user = access.current(auth);

    return repo.findAll().stream()
        .filter(item -> access.canReadSession(
            access.session(item.getSessionId()), user))
        .map(item -> toView(item, user))
        .toList();
  }

  @GetMapping("/{id}")
  public SessionSampleView get(
      @PathVariable Integer id,
      Authentication auth) {

    User user = access.current(auth);
    SessionSample item = find(id);

    access.requireSessionRead(item.getSessionId(), user);

    return toView(item, user);
  }

  private SessionSample find(Integer id) {
    return repo.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "SessionSample not found"));
  }

  @PostMapping
  @Transactional
  public ResponseEntity<SessionSample> create(@Valid @RequestBody SessionSampleRequest request, Authentication auth) {
    User user = access.current(auth);
    access.requireSessionOwner(request.sessionId(), user);
    access.requireSessionOpen(request.sessionId());
    access.requireSampleOwner(request.sampleId(), user);

    SessionSample item = new SessionSample();
    item.setSessionId(request.sessionId());
    item.setSampleId(request.sampleId());
    item.setSampleCode(request.sampleCode());
    item.setDisplayOrder(request.displayOrder());

    item = repo.saveAndFlush(item);

    return ResponseEntity.status(HttpStatus.CREATED).body(item);
  }

  @PutMapping("/{id}")
  @Transactional
  public SessionSample update(@PathVariable Integer id, @Valid @RequestBody SessionSampleRequest request,
      Authentication auth) {
    User user = access.current(auth);
    SessionSample item = find(id);
    access.requireSessionOwner(item.getSessionId(), user);
    access.requireSessionOpen(item.getSessionId());
    if (!item.getSessionId().equals(request.sessionId()))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "sessionId cannot be changed");
    access.requireSampleOwner(request.sampleId(), user);

    item.setSampleId(request.sampleId());
    item.setSampleCode(request.sampleCode());
    item.setDisplayOrder(request.displayOrder());

    return repo.saveAndFlush(item);
  }

  @DeleteMapping("/{id}")
  @Transactional
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable Integer id, Authentication auth) {
    User user = access.current(auth);
    SessionSample item = find(id);
    access.requireSessionOwner(item.getSessionId(), user);
    access.requireSessionOpen(item.getSessionId());
    repo.delete(item);
    repo.flush();
  }
}
