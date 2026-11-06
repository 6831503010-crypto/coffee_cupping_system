package th.mfu.cupping.service;

import java.time.LocalDateTime;
import java.util.Locale;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import th.mfu.cupping.dto.UserProfileResponse;
import th.mfu.cupping.dto.VerifyGraderRequest;

@Service
public class GraderVerificationService {

  private final JdbcTemplate jdbc;

  public GraderVerificationService(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  private static String normalizeName(String name) {
    return name == null
        ? ""
        : name.replaceAll("(?U)\\s+", " ")
            .trim()
            .toLowerCase(Locale.ROOT);
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public UserProfileResponse verify(
      int userId,
      VerifyGraderRequest request) {

    // Lock the account so simultaneous requests cannot
    // link different licenses to the same account.
    UserProfileResponse user = loadProfile(userId, true);

    if (request.licenseCode() == null
        || !request.licenseCode().matches("^Q-[0-9]{6}$")) {

      throw failure(
          HttpStatus.BAD_REQUEST,
          "License code must use the format Q-123456.");
    }

    String certificateName = normalizeName(request.certificateName());

    if (certificateName.isEmpty()
        || !certificateName.equals(normalizeName(user.name()))) {

      throw failure(
          HttpStatus.BAD_REQUEST,
          "Certificate name must match your profile name.");
    }

    var existingLicenses = jdbc.query("""
        SELECT license_code
        FROM grader_credentials
        WHERE claimed_by_user_id = ?
        """,
        (rs, row) -> rs.getString("license_code"),
        userId);

    if (!existingLicenses.isEmpty()
        && !existingLicenses.get(0).equals(request.licenseCode())) {

      throw failure(
          HttpStatus.CONFLICT,
          "Your account is already linked to another license.");
    }

    // Lock the certificate so two accounts cannot claim it
    // at the same time.
    var credentials = jdbc.query("""
        SELECT credential_id,
               certificate_name,
               claimed_by_user_id
        FROM grader_credentials
        WHERE license_code = ?
        FOR UPDATE
        """,
        (rs, row) -> new Credential(
            rs.getInt("credential_id"),
            rs.getString("certificate_name"),
            rs.getObject("claimed_by_user_id", Integer.class)),
        request.licenseCode());

    if (credentials.isEmpty()
        || !certificateName.equals(
            normalizeName(credentials.get(0).certificateName()))) {

      throw failure(
          HttpStatus.BAD_REQUEST,
          "No matching qualification credentials were found.");
    }

    Credential credential = credentials.get(0);

    if (credential.claimedByUserId() != null
        && credential.claimedByUserId() != userId) {

      throw failure(
          HttpStatus.CONFLICT,
          "This license is already linked to another account.");
    }

    if (credential.claimedByUserId() == null) {
      jdbc.update("""
          UPDATE grader_credentials
          SET claimed_by_user_id = ?,
              claimed_at = UTC_TIMESTAMP(6)
          WHERE credential_id = ?
            AND claimed_by_user_id IS NULL
          """,
          userId,
          credential.credentialId());
    }

    // Repeating verification with the same account and license
    // succeeds without changing the original confirmation time.
    jdbc.update("""
        UPDATE users
        SET qualification_confirmed_at =
                CASE
                    WHEN qualification_status = 'QUALIFIED'
                         AND qualification_confirmed_at IS NOT NULL
                    THEN qualification_confirmed_at
                    ELSE UTC_TIMESTAMP(6)
                END,
            qualification_status = 'QUALIFIED'
        WHERE user_id = ?
        """,
        userId);

    return loadProfile(userId, false);
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public UserProfileResponse updateName(int userId, String name) {
    // Same account lock used by verification and evaluation finalization.
    UserProfileResponse user = loadProfile(userId, true);

    String trimmedName = name == null ? "" : name.trim();

    if (normalizeName(trimmedName).isEmpty()
        || trimmedName.length() > 100) {
      throw failure(
          HttpStatus.BAD_REQUEST,
          "Name must contain between 1 and 100 characters.");
    }

    boolean meaningfulChange = !normalizeName(user.name()).equals(normalizeName(trimmedName));

    if (meaningfulChange) {
      jdbc.update("""
          UPDATE users
          SET name = ?,
              qualification_status = NULL,
              qualification_confirmed_at = NULL
          WHERE user_id = ?
          """,
          trimmedName,
          userId);
    } else {
      // Capitalization and whitespace changes preserve verification.
      jdbc.update("""
          UPDATE users
          SET name = ?
          WHERE user_id = ?
          """,
          trimmedName,
          userId);
    }

    // Keep the license claim and finalized-result snapshots unchanged.
    return loadProfile(userId, false);
  }

  private UserProfileResponse loadProfile(
      int userId,
      boolean lock) {

    String sql = """
        SELECT user_id,
               name,
               email,
               qualification_status,
               qualification_confirmed_at,
               created_at
        FROM users
        WHERE user_id = ?
        """ + (lock ? " FOR UPDATE" : "");

    var users = jdbc.query(
        sql,
        (rs, row) -> new UserProfileResponse(
            rs.getInt("user_id"),
            rs.getString("name"),
            rs.getString("email"),
            rs.getString("qualification_status"),
            rs.getObject(
                "qualification_confirmed_at",
                LocalDateTime.class),
            rs.getObject(
                "created_at",
                LocalDateTime.class)),
        userId);

    if (users.isEmpty()) {
      throw failure(
          HttpStatus.UNAUTHORIZED,
          "Account not found.");
    }

    return users.get(0);
  }

  private static ResponseStatusException failure(
      HttpStatus status,
      String message) {

    return new ResponseStatusException(status, message);
  }

  private record Credential(
      int credentialId,
      String certificateName,
      Integer claimedByUserId) {
  }
}
