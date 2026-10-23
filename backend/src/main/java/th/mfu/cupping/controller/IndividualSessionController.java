
package th.mfu.cupping.controller;

import java.util.List;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import th.mfu.cupping.dto.IndividualSessionDtos.*;
import th.mfu.cupping.service.IndividualSessionService;
import th.mfu.cupping.service.SessionParticipationService;

@RestController
@RequestMapping("/api/individual-sessions")
public class IndividualSessionController {

  private final IndividualSessionService service;
  private final SessionParticipationService participation;

  public IndividualSessionController(
      IndividualSessionService service,
      SessionParticipationService participation) {
    this.service = service;
    this.participation = participation;
  }

  @GetMapping("/library")
  public List<LibrarySample> library(
      Authentication authentication) {
    return service.library(authentication.getName());
  }

  @PostMapping
  public ResponseEntity<SessionView> create(
      @Valid @RequestBody CreateRequest request,
      Authentication authentication) {

    SessionView result = service.create(
        request, authentication.getName());

    return ResponseEntity.status(HttpStatus.CREATED)
        .body(result);
  }

  @GetMapping("/{id}")
  public SessionView get(
      @PathVariable Integer id,
      Authentication authentication) {

    return service.get(id, authentication.getName());
  }

  @PostMapping("/{id}/evaluators")
  public ParticipationResult assignEvaluator(
      @PathVariable Integer id,
      @Valid @RequestBody AssignEvaluatorRequest request,
      Authentication authentication) {

    return participation.assign(
        id,
        request.email(),
        authentication.getName());
  }

  @PostMapping("/{id}/participation-link")
  public ParticipationLink participationLink(
      @PathVariable Integer id,
      Authentication authentication) {

    return participation.getOrCreateLink(
        id,
        authentication.getName());
  }

  @PostMapping("/join/{token}")
  public ParticipationResult join(
      @PathVariable String token,
      Authentication authentication) {

    return participation.join(
        token,
        authentication.getName());
  }

  @GetMapping("/join/{token}")
  public JoinPreview preview(
      @PathVariable String token,
      Authentication authentication) {

    return participation.preview(
        token,
        authentication.getName());
  }

  @GetMapping("/{id}/evaluators")
  public List<EvaluatorView> listEvaluators(
      @PathVariable Integer id,
      Authentication authentication) {

    return participation.listEvaluators(
        id,
        authentication.getName());
  }

  @GetMapping("/{id}/evaluator-candidates")
  public List<EvaluatorCandidate> searchEvaluatorCandidates(
      @PathVariable Integer id,
      @RequestParam(name = "q", defaultValue = "") String query,
      Authentication authentication) {

    return participation.searchEvaluatorCandidates(
        id,
        query,
        authentication.getName());
  }
}
