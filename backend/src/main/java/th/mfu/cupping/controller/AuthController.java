package th.mfu.cupping.controller;

import java.util.Collections;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import th.mfu.cupping.dto.AuthUserResponse;
import th.mfu.cupping.dto.LoginRequest;
import th.mfu.cupping.dto.RegisterRequest;
import th.mfu.cupping.dto.RegisterResponse;
import th.mfu.cupping.service.AuthService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

  private final AuthService authService;

  public AuthController(
      AuthService authService) {
    this.authService = authService;
  }

  @PostMapping("/register")
  public ResponseEntity<RegisterResponse> register(
      @Valid @RequestBody RegisterRequest request) {

    RegisterResponse response = authService.register(request);

    return ResponseEntity
        .status(HttpStatus.CREATED)
        .body(response);
  }

  @PostMapping("/login")
  public ResponseEntity<AuthUserResponse> login(
      @Valid @RequestBody LoginRequest request,
      HttpServletRequest httpRequest) {

    AuthUserResponse user = authService.login(request);

    Authentication authentication = new UsernamePasswordAuthenticationToken(
        user.email(),
        null,
        Collections.emptyList());

    SecurityContext context = SecurityContextHolder
        .createEmptyContext();

    context.setAuthentication(
        authentication);

    SecurityContextHolder.setContext(
        context);

    HttpSession session = httpRequest.getSession(true);

    session.setAttribute(
        HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
        context);

    return ResponseEntity.ok(user);
  }

  @GetMapping("/me")
  public ResponseEntity<AuthUserResponse> me(
      Authentication authentication) {

    AuthUserResponse user = authService.getCurrentUser(
        authentication.getName());

    return ResponseEntity.ok(user);
  }

  @PostMapping("/logout")
  public ResponseEntity<Map<String, String>> logout(
      HttpServletRequest request) {

    HttpSession session = request.getSession(false);

    if (session != null) {
      session.invalidate();
    }

    SecurityContextHolder.clearContext();

    return ResponseEntity.ok(
        Map.of(
            "message",
            "Logged out successfully"));
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<String> handleBadRequest(
      IllegalArgumentException exception) {

    return ResponseEntity
        .badRequest()
        .body(exception.getMessage());
  }
}
