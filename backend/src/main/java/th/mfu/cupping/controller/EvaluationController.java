package th.mfu.cupping.controller;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;
import jakarta.validation.Valid;
import th.mfu.cupping.dto.EvaluationRequest;
import th.mfu.cupping.model.*;
import th.mfu.cupping.repository.*;
import th.mfu.cupping.service.CuppingAccessService;

@RestController
@RequestMapping("/api/evaluations")
public class EvaluationController {
  private final EvaluationRepository repo;
  private final CuppingAccessService access;
  private final DefectTypeRepository defectTypes;

  public EvaluationController(EvaluationRepository repo, CuppingAccessService access, DefectTypeRepository defectTypes) {
    this.repo = repo; this.access = access; this.defectTypes = defectTypes;
  }

  @GetMapping
  public List<Evaluation> list(Authentication auth) {
    User user = access.current(auth);
    return repo.findAll().stream()
        .filter(item -> { try { access.requireEvaluationRead(item.getEvaluationId(), user); return true; } catch (org.springframework.web.server.ResponseStatusException ex) { return false; } })
        .toList();
  }

  @GetMapping("/{id}")
  public Evaluation get(@PathVariable Integer id, Authentication auth) {
    User user = access.current(auth);
    Evaluation item = find(id);
    access.requireEvaluationRead(item.getEvaluationId(), user);
    return item;
  }

  private Evaluation find(Integer id) {
    return repo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Evaluation not found"));
  }

  @PostMapping
  @Transactional
  public ResponseEntity<Evaluation> create(@Valid @RequestBody EvaluationRequest request, Authentication auth) {
    User user = access.current(auth);
if (request.sessionEvaluatorId() == null || request.sessionSampleId() == null)
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "sessionEvaluatorId and sessionSampleId are required");
    access.validateEvaluationPair(request.sessionEvaluatorId(), request.sessionSampleId(), user);
    if (request.defectTypeId() != null && !defectTypes.existsById(request.defectTypeId()))
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Defect type not found");
    if (request.status() != null && !java.util.Set.of("DRAFT", "FINALIZED").contains(request.status()))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid evaluation status");
    Evaluation item = new Evaluation();
    item.setSessionEvaluatorId(request.sessionEvaluatorId());
    item.setSessionSampleId(request.sessionSampleId());
    item.setStatus(request.status());
    item.setDryAroma(request.dryAroma());
    item.setBreakAroma(request.breakAroma());
    item.setColorIntensity(request.colorIntensity());
    item.setAromaQualityScore(request.aromaQualityScore());
    item.setFlavorScore(request.flavorScore());
    item.setAftertasteScore(request.aftertasteScore());
    item.setAcidityScore(request.acidityScore());
    item.setBodyScore(request.bodyScore());
    item.setBalanceScore(request.balanceScore());
    item.setUniformityScore(request.uniformityScore());
    item.setCleanCupScore(request.cleanCupScore());
    item.setSweetnessScore(request.sweetnessScore());
    item.setOverallScore(request.overallScore());
    item.setAcidityIntensity(request.acidityIntensity());
    item.setBodyLevel(request.bodyLevel());
    item.setDefectTypeId(request.defectTypeId());
    item.setTotalScore(request.totalScore());
    item.setStatus(request.status() == null ? "DRAFT" : request.status());
    if ("FINALIZED".equals(item.getStatus())) item.setFinalizedAt(java.time.LocalDateTime.now());
    item = repo.saveAndFlush(item);
    return ResponseEntity.status(HttpStatus.CREATED).body(item);
  }

  @PutMapping("/{id}")
  @Transactional
  public Evaluation update(@PathVariable Integer id, @Valid @RequestBody EvaluationRequest request, Authentication auth) {
    User user = access.current(auth);
    Evaluation item = find(id);
    access.requireEvaluationWrite(id, user);
if (request.sessionEvaluatorId() != null && !item.getSessionEvaluatorId().equals(request.sessionEvaluatorId()))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot change evaluator");
    if (request.sessionSampleId() != null && !item.getSessionSampleId().equals(request.sessionSampleId()))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot change session sample");
    if (request.defectTypeId() != null && !defectTypes.existsById(request.defectTypeId()))
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Defect type not found");
    if (request.status() != null && !java.util.Set.of("DRAFT", "FINALIZED").contains(request.status()))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid evaluation status");
    item.setDryAroma(request.dryAroma());
    item.setBreakAroma(request.breakAroma());
    item.setColorIntensity(request.colorIntensity());
    item.setAromaQualityScore(request.aromaQualityScore());
    item.setFlavorScore(request.flavorScore());
    item.setAftertasteScore(request.aftertasteScore());
    item.setAcidityScore(request.acidityScore());
    item.setBodyScore(request.bodyScore());
    item.setBalanceScore(request.balanceScore());
    item.setUniformityScore(request.uniformityScore());
    item.setCleanCupScore(request.cleanCupScore());
    item.setSweetnessScore(request.sweetnessScore());
    item.setOverallScore(request.overallScore());
    item.setAcidityIntensity(request.acidityIntensity());
    item.setBodyLevel(request.bodyLevel());
    item.setDefectTypeId(request.defectTypeId());
    item.setTotalScore(request.totalScore());
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
    Evaluation item = find(id);
    access.requireEvaluationWrite(id, user);
    repo.delete(item);
    repo.flush();
  }
}
