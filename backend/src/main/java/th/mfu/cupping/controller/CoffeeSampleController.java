package th.mfu.cupping.controller;

import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
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
  private final JdbcTemplate jdbc;
  private final SessionSampleRepository sessionSamples;


  public CoffeeSampleController(CoffeeSampleRepository repo, CuppingAccessService access,
      JdbcTemplate jdbc, SessionSampleRepository sessionSamples) {
    this.repo = repo;
    this.access = access;
    this.jdbc = jdbc;
    this.sessionSamples = sessionSamples;
  }

  @GetMapping
  public List<CoffeeSample> list(Authentication auth) {
    User user = access.current(auth);
    return repo.findAll().stream()
        .filter(item -> { try { access.requireSampleRead(item.getSampleId(), user); return true; } catch (org.springframework.web.server.ResponseStatusException ex) { return false; } })
        .toList();
  }

  // Personal inventory never includes samples shared through other users' sessions.
  @GetMapping("/mine")
  public List<InventorySampleResponse> mine(Authentication auth) {
    int userId = access.current(auth).getUserId();
    return jdbc.query("""
        SELECT c.sample_id, c.sample_name, c.process, c.harvest_year,
               c.growing_location, c.owner_producer, c.created_at,
               COUNT(ss.session_sample_id) AS session_count
        FROM coffee_samples c
        LEFT JOIN session_samples ss ON ss.sample_id = c.sample_id
        WHERE c.created_by = ?
        GROUP BY c.sample_id, c.sample_name, c.process, c.harvest_year,
                 c.growing_location, c.owner_producer, c.created_at
        ORDER BY c.sample_id DESC
        """, (rs, row) -> new InventorySampleResponse(
            rs.getInt("sample_id"),
            rs.getString("sample_name"),
            rs.getString("process"),
            (Integer) rs.getObject("harvest_year"),
            rs.getString("growing_location"),
            rs.getString("owner_producer"),
            rs.getTimestamp("created_at") == null ? null :
                rs.getTimestamp("created_at").toLocalDateTime(),
            rs.getInt("session_count")), userId);
  }

  public record InventorySampleResponse(
      Integer sampleId, String sampleName, String process,
      Integer harvestYear, String growingLocation, String ownerProducer,
      java.time.LocalDateTime createdAt, int sessionCount) {}

  // Limit the ID route to digits so /mine is never interpreted as a sample ID.
  @GetMapping("/{id:[0-9]+}")
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
    // Prevent silent modification of coffee metadata displayed in historical sessions.
    requireUnused(id);

    item.setSampleName(request.sampleName());
    item.setProcess(request.process());
    item.setHarvestYear(request.harvestYear());
    item.setGrowingLocation(request.growingLocation());
    item.setOwnerProducer(request.ownerProducer());

    return repo.saveAndFlush(item);
  }

  private void requireUnused(Integer id) {
    if (sessionSamples.existsBySampleId(id)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT,
          "Coffee already belongs to a cupping session. Edit/delete is disabled to preserve history.");
    }
  }

  @DeleteMapping("/{id}")
  @Transactional
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable Integer id, Authentication auth) {
    User user = access.current(auth);
    CoffeeSample item = find(id);
    access.requireSampleOwner(id, user);
    requireUnused(id);
    repo.delete(item);
    repo.flush();
  }
}
