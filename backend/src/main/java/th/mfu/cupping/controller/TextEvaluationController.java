package th.mfu.cupping.controller;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;
import jakarta.validation.Valid;
import th.mfu.cupping.dto.TextEvaluationRequest;
import th.mfu.cupping.model.*;
import th.mfu.cupping.repository.*;
import th.mfu.cupping.service.CuppingAccessService;

@RestController
@RequestMapping("/api/text-evaluations")
public class TextEvaluationController {
  private final TextEvaluationRepository repo;
  private final CuppingAccessService access;
  

  public TextEvaluationController(TextEvaluationRepository repo, CuppingAccessService access) {
    this.repo = repo; this.access = access; 
  }

  @GetMapping
  public List<TextEvaluation> list(Authentication auth) {
    User user = access.current(auth);
    return repo.findAll().stream()
        .filter(item -> { try { access.requireEvaluationRead(item.getEvaluationId(), user); return true; } catch (org.springframework.web.server.ResponseStatusException ex) { return false; } })
        .toList();
  }

  @GetMapping("/{id}")
  public TextEvaluation get(@PathVariable Integer id, Authentication auth) {
    User user = access.current(auth);
    TextEvaluation item = find(id);
    access.requireEvaluationRead(item.getEvaluationId(), user);
    return item;
  }

  private TextEvaluation find(Integer id) {
    return repo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "TextEvaluation not found"));
  }

  @PostMapping
  @Transactional
  public ResponseEntity<TextEvaluation> create(@Valid @RequestBody TextEvaluationRequest request, Authentication auth) {
    User user = access.current(auth);
access.requireEvaluationWrite(request.evaluationId(), user);

    TextEvaluation item = new TextEvaluation();
    item.setEvaluationId(request.evaluationId());
    item.setText(request.text());
    item.setStage(request.stage() == null ? "GENERAL" : request.stage());

    item = repo.saveAndFlush(item);

    return ResponseEntity.status(HttpStatus.CREATED).body(item);
  }

  @PutMapping("/{id}")
  @Transactional
  public TextEvaluation update(@PathVariable Integer id, @Valid @RequestBody TextEvaluationRequest request, Authentication auth) {
    User user = access.current(auth);
    TextEvaluation item = find(id);
    access.requireEvaluationWrite(item.getEvaluationId(), user);
if (!item.getEvaluationId().equals(request.evaluationId()))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot change parent evaluation");

    item.setText(request.text());
    if (request.stage() != null) item.setStage(request.stage());

    return repo.saveAndFlush(item);
  }

  @DeleteMapping("/{id}")
  @Transactional
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable Integer id, Authentication auth) {
    User user = access.current(auth);
    TextEvaluation item = find(id);
    access.requireEvaluationWrite(item.getEvaluationId(), user);
    repo.delete(item);
    repo.flush();
  }
}
