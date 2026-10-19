
package th.mfu.cupping.controller;

import java.util.List;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import th.mfu.cupping.dto.IndividualSessionDtos.*;
import th.mfu.cupping.service.IndividualSessionService;

@RestController
@RequestMapping("/api/individual-sessions")
public class IndividualSessionController {

  private final IndividualSessionService service;

  public IndividualSessionController(
      IndividualSessionService service) {
    this.service = service;
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
}
