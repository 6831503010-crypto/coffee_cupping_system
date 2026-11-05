package th.mfu.cupping.controller;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import th.mfu.cupping.dto.*;
import th.mfu.cupping.model.User;
import th.mfu.cupping.repository.UserRepository;
import th.mfu.cupping.service.CuppingAccessService;
import th.mfu.cupping.service.GraderVerificationService;
import org.springframework.web.server.ResponseStatusException;

/**
 * Account creation remains POST /api/auth/register. No password hashes are
 * returned.
 */
@RestController
@RequestMapping("/api/users")
public class UserController {
  private final UserRepository repo;
  private final CuppingAccessService access;
  private final GraderVerificationService verification;

  public UserController(UserRepository repo, CuppingAccessService access, GraderVerificationService verification) {
    this.repo = repo;
    this.access = access;
    this.verification = verification;
  }

  @GetMapping
  public List<UserProfileResponse> list(Authentication auth) {
    return List.of(UserProfileResponse.from(access.current(auth)));
  }

  @GetMapping("/{id}")
  public UserProfileResponse get(@PathVariable Integer id, Authentication auth) {
    User user = access.current(auth);
    access.requireSelf(id, user);
    return UserProfileResponse.from(user);
  }

  @PutMapping("/{id}")
  public UserProfileResponse update(
      @PathVariable Integer id,
      @Valid @RequestBody UpdateUserRequest request,
      Authentication auth) {

    User user = access.current(auth);
    access.requireSelf(id, user);

    return verification.updateName(
        user.getUserId(),
        request.name());
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable Integer id, Authentication auth) {
    User user = access.current(auth);
    access.requireSelf(id, user);
    repo.delete(user);
    repo.flush();
  }

  @PostMapping("/me/qualification/verify")
  public UserProfileResponse verifyQualification(
      @Valid @RequestBody VerifyGraderRequest request,
      Authentication auth) {

    User user = access.current(auth);

    return verification.verify(
        user.getUserId(),
        request);
  }

  @ExceptionHandler(ResponseStatusException.class)
  public ResponseEntity<java.util.Map<String, String>> handleRequestError(
      ResponseStatusException ex) {

    String message = ex.getReason() == null
        ? "Request failed."
        : ex.getReason();

    return ResponseEntity
        .status(ex.getStatusCode())
        .body(java.util.Map.of("error", message));
  }
}
