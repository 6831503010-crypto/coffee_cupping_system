package th.mfu.cupping.controller;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;
import jakarta.validation.Valid;
import th.mfu.cupping.dto.EvaluationOptionRequest;
import th.mfu.cupping.model.*;
import th.mfu.cupping.repository.*;
import th.mfu.cupping.service.CuppingAccessService;

@RestController
@RequestMapping("/api/evaluation-options")
public class EvaluationOptionController {
  private final EvaluationOptionRepository repo;
  private final CuppingAccessService access;
  

  public EvaluationOptionController(EvaluationOptionRepository repo, CuppingAccessService access) {
    this.repo = repo; this.access = access; 
  }

  @GetMapping
  public List<EvaluationOption> list(Authentication auth) {
    access.current(auth);
    return repo.findAll().stream()

        .toList();
  }

  @GetMapping("/{id}")
  public EvaluationOption get(@PathVariable Integer id, Authentication auth) {
    access.current(auth);
    EvaluationOption item = find(id);
    
    return item;
  }

  private EvaluationOption find(Integer id) {
    return repo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "EvaluationOption not found"));
  }

  @PostMapping
  @Transactional
  public ResponseEntity<EvaluationOption> create(@Valid @RequestBody EvaluationOptionRequest request, Authentication auth) {
    access.current(auth);
if (request.parentOptionId() != null && !repo.existsById(request.parentOptionId()))
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Parent option not found");

    EvaluationOption item = new EvaluationOption();
    item.setOptionName(request.optionName());
    item.setOptionType(request.optionType());
    item.setParentOptionId(request.parentOptionId());
    item.setActive(request.active());

    item = repo.saveAndFlush(item);

    return ResponseEntity.status(HttpStatus.CREATED).body(item);
  }

  @PutMapping("/{id}")
  @Transactional
  public EvaluationOption update(@PathVariable Integer id, @Valid @RequestBody EvaluationOptionRequest request, Authentication auth) {
    access.current(auth);
    EvaluationOption item = find(id);
    
if (request.parentOptionId() != null && request.parentOptionId().equals(id))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Option cannot parent itself");
    if (request.parentOptionId() != null && !repo.existsById(request.parentOptionId()))
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Parent option not found");

    item.setOptionName(request.optionName());
    item.setOptionType(request.optionType());
    item.setParentOptionId(request.parentOptionId());
    item.setActive(request.active());

    return repo.saveAndFlush(item);
  }

  @DeleteMapping("/{id}")
  @Transactional
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable Integer id, Authentication auth) {
    access.current(auth);
    EvaluationOption item = find(id);
    
    repo.delete(item);
    repo.flush();
  }
}
