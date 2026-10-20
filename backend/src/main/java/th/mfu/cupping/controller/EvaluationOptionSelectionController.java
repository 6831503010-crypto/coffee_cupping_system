package th.mfu.cupping.controller;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import jakarta.validation.Valid;
import th.mfu.cupping.dto.EvaluationOptionSelectionRequest;
import th.mfu.cupping.model.*;
import th.mfu.cupping.repository.*;
import th.mfu.cupping.service.CuppingAccessService;

@RestController
@RequestMapping("/api/evaluation-option-selections")
public class EvaluationOptionSelectionController {
  private final EvaluationOptionSelectionRepository repo;
  private final EvaluationOptionRepository options;
  private final CuppingAccessService access;
  public EvaluationOptionSelectionController(EvaluationOptionSelectionRepository repo,
      EvaluationOptionRepository options, CuppingAccessService access) {
    this.repo = repo; this.options = options; this.access = access;
  }

  @GetMapping
  public List<EvaluationOptionSelection> list(Authentication auth) {
    User user = access.current(auth);
    return repo.findAll().stream().filter(s -> access.canReadEvaluation(access.evaluation(s.getEvaluationId()), user)).toList();
  }

  @GetMapping("/{evaluationId}/{optionId}")
  public EvaluationOptionSelection get(@PathVariable Integer evaluationId, @PathVariable Integer optionId,
      Authentication auth) {
    access.requireEvaluationRead(evaluationId, access.current(auth));
    return find(evaluationId, optionId);
  }

  private EvaluationOptionSelection find(Integer evaluationId, Integer optionId) {
    return repo.findById(new EvaluationOptionSelectionId(evaluationId, optionId))
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Selection not found"));
  }

  @PostMapping
  public ResponseEntity<EvaluationOptionSelection> create(
      @Valid @RequestBody EvaluationOptionSelectionRequest request, Authentication auth) {
    access.requireEvaluationWrite(request.evaluationId(), access.current(auth));
    if (!options.existsById(request.optionId()))
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Option not found");
    EvaluationOptionSelectionId id = new EvaluationOptionSelectionId(request.evaluationId(), request.optionId());
    if (repo.existsById(id))
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Option already selected");
    EvaluationOptionSelection selection = new EvaluationOptionSelection();
    selection.setEvaluationId(request.evaluationId());
    selection.setOptionId(request.optionId());
    return ResponseEntity.status(HttpStatus.CREATED).body(repo.saveAndFlush(selection));
  }

  @DeleteMapping("/{evaluationId}/{optionId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable Integer evaluationId, @PathVariable Integer optionId,
      Authentication auth) {
    access.requireEvaluationWrite(evaluationId, access.current(auth));
    repo.delete(find(evaluationId, optionId));
    repo.flush();
  }
  // A join row has only PK columns. Change selection using DELETE followed by POST.
}
