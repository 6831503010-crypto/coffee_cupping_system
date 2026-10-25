package th.mfu.cupping.controller;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;
import jakarta.validation.Valid;
import th.mfu.cupping.dto.DefectTypeRequest;
import th.mfu.cupping.model.*;
import th.mfu.cupping.repository.*;
import th.mfu.cupping.service.CuppingAccessService;

@RestController
@RequestMapping("/api/defect-types")
public class DefectTypeController {
  private final DefectTypeRepository repo;
  private final CuppingAccessService access;
  

  public DefectTypeController(DefectTypeRepository repo, CuppingAccessService access) {
    this.repo = repo; this.access = access; 
  }

  @GetMapping
  public List<DefectType> list(Authentication auth) {
    access.current(auth);
    return repo.findAll().stream()

        .toList();
  }

  @GetMapping("/{id}")
  public DefectType get(@PathVariable Integer id, Authentication auth) {
    access.current(auth);
    DefectType item = find(id);
    
    return item;
  }

  private DefectType find(Integer id) {
    return repo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "DefectType not found"));
  }

  @PostMapping
  @Transactional
  public ResponseEntity<DefectType> create(@Valid @RequestBody DefectTypeRequest request, Authentication auth) {
    access.current(auth);


    DefectType item = new DefectType();
    item.setDefectName(request.defectName());
    item.setPointsPerCup(request.pointsPerCup());
    item.setDescription(request.description());

    item = repo.saveAndFlush(item);

    return ResponseEntity.status(HttpStatus.CREATED).body(item);
  }

  @PutMapping("/{id}")
  @Transactional
  public DefectType update(@PathVariable Integer id, @Valid @RequestBody DefectTypeRequest request, Authentication auth) {
    access.current(auth);
    DefectType item = find(id);
    


    item.setDefectName(request.defectName());
    item.setPointsPerCup(request.pointsPerCup());
    item.setDescription(request.description());

    return repo.saveAndFlush(item);
  }

  @DeleteMapping("/{id}")
  @Transactional
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable Integer id, Authentication auth) {
    access.current(auth);
    DefectType item = find(id);
    
    repo.delete(item);
    repo.flush();
  }
}
