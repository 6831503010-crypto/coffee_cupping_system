package th.mfu.cupping.dto;
import jakarta.validation.constraints.*;
public record EvaluationOptionRequest(
    @NotBlank String optionName,
    @NotBlank String optionType,
    Integer parentOptionId,
    Boolean active
) {}
