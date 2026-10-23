package th.mfu.cupping.dto;

import java.time.LocalDateTime;
import jakarta.validation.constraints.*;

public record CuppingSessionRequest(
    @NotBlank @Size(max = 255) String sessionName,
    @NotBlank String mode,
    String description,
    LocalDateTime cuppingDate,
    String status,
    String resultVisibility,
    @Min(1) @Max(10) Integer evaluatorLimit,
    Boolean creatorParticipates) {
}
