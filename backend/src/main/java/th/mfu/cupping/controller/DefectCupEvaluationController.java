package th.mfu.cupping.controller;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;
import jakarta.validation.Valid;
import th.mfu.cupping.dto.DefectCupEvaluationRequest;
import th.mfu.cupping.model.*;
import th.mfu.cupping.repository.*;
import th.mfu.cupping.service.CuppingAccessService;

@RestController
@RequestMapping("/api/defect-cup-evaluations")
public class DefectCupEvaluationController {
  private final DefectCupEvaluationRepository repo;
  private final CuppingAccessService access;
  private final th.mfu.cupping.service.EvaluationScoreService scores;
  

  public DefectCupEvaluationController(DefectCupEvaluationRepository repo, CuppingAccessService access, th.mfu.cupping.service.EvaluationScoreService scores) {
    this.repo = repo; this.access = access; this.scores = scores; 
  }

  @GetMapping
  public List<DefectCupEvaluation> list(Authentication auth) {
    User user = access.current(auth);
    return repo.findAll().stream()
        .filter(item -> { try { access.requireEvaluationRead(item.getEvaluationId(), user); return true; } catch (org.springframework.web.server.ResponseStatusException ex) { return false; } })
        .toList();
  }

  @GetMapping("/{id}")
  public DefectCupEvaluation get(@PathVariable Integer id, Authentication auth) {
    User user = access.current(auth);
    DefectCupEvaluation item = find(id);
    access.requireEvaluationRead(item.getEvaluationId(), user);
    return item;
  }

  private DefectCupEvaluation find(Integer id) {
    return repo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "DefectCupEvaluation not found"));
  }

  @PostMapping
  @Transactional
  public ResponseEntity<DefectCupEvaluation> create(@Valid @RequestBody DefectCupEvaluationRequest request, Authentication auth) {
    User user = access.current(auth);
access.requireEvaluationWrite(request.evaluationId(), user);

    DefectCupEvaluation item = new DefectCupEvaluation();
    item.setEvaluationId(request.evaluationId());
    item.setCupNumber(request.cupNumber());
    item.setUniformity(request.uniformity());
    item.setCleanCup(request.cleanCup());
    item.setSweetness(request.sweetness());

    item = repo.saveAndFlush(item);
    scores.recalculate(item.getEvaluationId());
    return ResponseEntity.status(HttpStatus.CREATED).body(item);
  }

  @PutMapping("/{id}")
  @Transactional
  public DefectCupEvaluation update(@PathVariable Integer id, @Valid @RequestBody DefectCupEvaluationRequest request, Authentication auth) {
    User user = access.current(auth);
    DefectCupEvaluation item = find(id);
    access.requireEvaluationWrite(item.getEvaluationId(), user);
if (!item.getEvaluationId().equals(request.evaluationId()))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot change parent evaluation");

    item.setCupNumber(request.cupNumber());
    item.setUniformity(request.uniformity());
    item.setCleanCup(request.cleanCup());
    item.setSweetness(request.sweetness());

    item = repo.saveAndFlush(item);
    scores.recalculate(item.getEvaluationId());
    return item;
  }

  @DeleteMapping("/{id}")
  @Transactional
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable Integer id, Authentication auth) {
    User user = access.current(auth);
    DefectCupEvaluation item = find(id);
    access.requireEvaluationWrite(item.getEvaluationId(), user);
    repo.delete(item);
    repo.flush();
    scores.recalculate(item.getEvaluationId());
  }
}
