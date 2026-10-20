package th.mfu.cupping.dto;
import jakarta.validation.constraints.*;
public record DefectCupEvaluationRequest(
    @NotNull Integer evaluationId,
    @NotNull Integer cupNumber,
    Boolean uniformity,
    Boolean cleanCup,
    Boolean sweetness
) {}
