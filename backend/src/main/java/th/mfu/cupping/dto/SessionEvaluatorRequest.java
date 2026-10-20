package th.mfu.cupping.dto;
import java.time.LocalDateTime;
import jakarta.validation.constraints.*;
public record SessionEvaluatorRequest(
    @NotNull Integer sessionId,
    @NotNull Integer userId,
    LocalDateTime joinedAt
) {}
