package th.mfu.cupping.dto;
import java.time.LocalDateTime;
import jakarta.validation.constraints.*;
public record CuppingSessionRequest(
    @NotBlank String sessionName,
    @NotBlank String mode,
    String description,
    LocalDateTime cuppingDate,
    String status,
    String resultVisibility
) {}
