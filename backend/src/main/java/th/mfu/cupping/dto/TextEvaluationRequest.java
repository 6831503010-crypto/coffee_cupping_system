package th.mfu.cupping.dto;
import jakarta.validation.constraints.*;
public record TextEvaluationRequest(
    @NotNull Integer evaluationId,
    @NotBlank String text
) {}
