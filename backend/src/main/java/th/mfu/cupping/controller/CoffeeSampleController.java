package th.mfu.cupping.controller;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;
import jakarta.validation.Valid;
import th.mfu.cupping.dto.CoffeeSampleRequest;
import th.mfu.cupping.model.*;
import th.mfu.cupping.repository.*;
import th.mfu.cupping.service.CuppingAccessService;

@RestController
@RequestMapping("/api/samples")
public class CoffeeSampleController {
  private final CoffeeSampleRepository repo;
  private final CuppingAccessService access;
  

  public CoffeeSampleController(CoffeeSampleRepository repo, CuppingAccessService access) {
    this.repo = repo; this.access = access; 
  }

  @GetMapping
  public List<CoffeeSample> list(Authentication auth) {
    User user = access.current(auth);
    return repo.findAll().stream()
        .filter(item -> { try { access.requireSampleRead(item.getSampleId(), user); return true; } catch (org.springframework.web.server.ResponseStatusException ex) { return false; } })
        .toList();
  }

  @GetMapping("/{id}")
  public CoffeeSample get(@PathVariable Integer id, Authentication auth) {
    User user = access.current(auth);
    CoffeeSample item = find(id);
    access.requireSampleRead(item.getSampleId(), user);
    return item;
  }

  private CoffeeSample find(Integer id) {
    return repo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "CoffeeSample not found"));
  }

  @PostMapping
  @Transactional
  public ResponseEntity<CoffeeSample> create(@Valid @RequestBody CoffeeSampleRequest request, Authentication auth) {
    User user = access.current(auth);


    CoffeeSample item = new CoffeeSample();
    item.setSampleName(request.sampleName());
    item.setProcess(request.process());
    item.setHarvestYear(request.harvestYear());
    item.setGrowingLocation(request.growingLocation());
    item.setOwnerProducer(request.ownerProducer());
    item.setCreatedBy(user.getUserId());
    item = repo.saveAndFlush(item);

    return ResponseEntity.status(HttpStatus.CREATED).body(item);
  }

  @PutMapping("/{id}")
  @Transactional
  public CoffeeSample update(@PathVariable Integer id, @Valid @RequestBody CoffeeSampleRequest request, Authentication auth) {
    User user = access.current(auth);
    CoffeeSample item = find(id);
    access.requireSampleOwner(id, user);


    item.setSampleName(request.sampleName());
    item.setProcess(request.process());
    item.setHarvestYear(request.harvestYear());
    item.setGrowingLocation(request.growingLocation());
    item.setOwnerProducer(request.ownerProducer());

    return repo.saveAndFlush(item);
  }

  @DeleteMapping("/{id}")
  @Transactional
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable Integer id, Authentication auth) {
    User user = access.current(auth);
    CoffeeSample item = find(id);
    access.requireSampleOwner(id, user);
    repo.delete(item);
    repo.flush();
  }
}
