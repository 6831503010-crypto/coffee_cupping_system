package th.mfu.cupping.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import th.mfu.cupping.dto.RegisterRequest;
import th.mfu.cupping.dto.RegisterResponse;
import th.mfu.cupping.model.User;
import th.mfu.cupping.repository.UserRepository;
import th.mfu.cupping.dto.AuthUserResponse;
import th.mfu.cupping.dto.LoginRequest;

@Service
public class AuthService {

  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;

  public AuthService(
      UserRepository userRepository,
      PasswordEncoder passwordEncoder) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
  }

  public RegisterResponse register(
      RegisterRequest request) {

    String email = request.email()
        .trim()
        .toLowerCase();

    if (!request.password()
        .equals(request.confirmPassword())) {
      throw new IllegalArgumentException(
          "Passwords do not match");
    }

    if (userRepository
        .existsByEmailIgnoreCase(email)) {
      throw new IllegalArgumentException(
          "An account with this email already exists");
    }

    User user = new User();

    user.setName(
        request.name().trim());

    user.setEmail(email);

    user.setPasswordHash(
        passwordEncoder.encode(
            request.password()));

    User saved = userRepository.save(user);

    return new RegisterResponse(
        saved.getUserId(),
        saved.getName(),
        saved.getEmail(),
        "Account created successfully");
  }

  public AuthUserResponse login(
      LoginRequest request) {

    String email = request.email()
        .trim()
        .toLowerCase();

    User user = userRepository
        .findByEmailIgnoreCase(email)
        .orElseThrow(
            () -> new IllegalArgumentException(
                "Invalid email or password"));

    if (!passwordEncoder.matches(
        request.password(),
        user.getPasswordHash())) {
      throw new IllegalArgumentException(
          "Invalid email or password");
    }

    return new AuthUserResponse(
        user.getUserId(),
        user.getName(),
        user.getEmail());
  }

  public AuthUserResponse getCurrentUser(
      String email) {

    User user = userRepository
        .findByEmailIgnoreCase(email)
        .orElseThrow(
            () -> new IllegalArgumentException(
                "User not found"));

    return new AuthUserResponse(
        user.getUserId(),
        user.getName(),
        user.getEmail());
  }
}
