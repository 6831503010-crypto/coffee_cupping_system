package th.mfu.cupping.controller;

import java.util.List;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import th.mfu.cupping.dto.EvaluationSubmissionDtos.*;
import th.mfu.cupping.service.EvaluationSubmissionService;

@RestController
@RequestMapping("/api/individual-sessions")
public class EvaluationSubmissionController {
  private final EvaluationSubmissionService service;

  public EvaluationSubmissionController(EvaluationSubmissionService service) {
    this.service = service;
  }

  @GetMapping("/{sessionId}/my-evaluations")
  public List<SavedSample> load(@PathVariable Integer sessionId, Authentication auth) {
    return service.load(sessionId, auth.getName());
  }

  @PutMapping("/{sessionId}/my-evaluations")
  public List<SavedSample> save(@PathVariable Integer sessionId,
      @Valid @RequestBody Submission submission, Authentication auth) {
    return service.save(sessionId, submission, auth.getName());
  }

  @GetMapping("/my-evaluation-history")
  public List<HistoryEntry> history(Authentication auth) {
    return service.history(auth.getName());
  }

  @GetMapping("/{sessionId}/my-evaluation-progress")
  public EvaluationProgress progress(
      @PathVariable Integer sessionId,
      Authentication auth) {

    return service.progress(sessionId, auth.getName());
  }

  @PostMapping("/{sessionId}/my-evaluations/lock-aroma")
  public EvaluationProgress lockAroma(
      @PathVariable Integer sessionId,
      @Valid @RequestBody AromaLockRequest request,
      Authentication auth) {

    return service.lockAroma(
        sessionId, request, auth.getName());
  }
}
