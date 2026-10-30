package th.mfu.cupping.controller;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import th.mfu.cupping.dto.EvaluationTimingDtos.TimingView;
import th.mfu.cupping.service.EvaluationTimingService;
import th.mfu.cupping.dto.EvaluationTimingDtos.SessionTimingView;

@RestController
@RequestMapping("/api/sessions")
public class EvaluationTimingController {

  private final EvaluationTimingService timing;

  public EvaluationTimingController(EvaluationTimingService timing) {
    this.timing = timing;
  }

  @GetMapping("/{sessionId}/timing")
  public SessionTimingView getSessionTiming(
      @PathVariable Integer sessionId,
      Authentication authentication) {

    return timing.getSessionTiming(
        sessionId,
        authenticatedEmail(authentication));
  }

  @GetMapping("/{sessionId}/my-timing")
  public TimingView get(
      @PathVariable Integer sessionId,
      Authentication authentication) {

    return timing.get(sessionId, authenticatedEmail(authentication));
  }

  @PostMapping("/{sessionId}/begin-evaluation")
  public TimingView begin(
      @PathVariable Integer sessionId,
      Authentication authentication) {

    return timing.begin(sessionId, authenticatedEmail(authentication));
  }

  private String authenticatedEmail(Authentication authentication) {
    if (authentication == null || !authentication.isAuthenticated()) {
      throw new ResponseStatusException(
          HttpStatus.UNAUTHORIZED, "Login required");
    }

    return authentication.getName();
  }
}
