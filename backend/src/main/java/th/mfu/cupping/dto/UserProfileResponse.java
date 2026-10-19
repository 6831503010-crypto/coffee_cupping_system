package th.mfu.cupping.dto;

import java.time.LocalDateTime;
import th.mfu.cupping.model.User;

/** Never serialize a password hash. */
public record UserProfileResponse(Integer userId, String name, String email,
    String qualificationStatus, LocalDateTime qualificationConfirmedAt,
    LocalDateTime createdAt) {
  public static UserProfileResponse from(User user) {
    return new UserProfileResponse(user.getUserId(), user.getName(), user.getEmail(),
        user.getQualificationStatus(), user.getQualificationConfirmedAt(), user.getCreatedAt());
  }
}
