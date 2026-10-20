package th.mfu.cupping.dto;
import jakarta.validation.constraints.*;
public record EvaluationOptionSelectionRequest(
    @NotNull Integer evaluationId,
    @NotNull Integer optionId
) {}
