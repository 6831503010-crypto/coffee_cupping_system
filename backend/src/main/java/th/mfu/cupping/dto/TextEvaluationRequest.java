package th.mfu.cupping.dto;
import jakarta.validation.constraints.*;
public record TextEvaluationRequest(
    @NotNull Integer evaluationId,
    @NotBlank @Size(max = 1000) String text,
    @Pattern(regexp="GENERAL|AROMA|FLAVOR") String stage
) {}
