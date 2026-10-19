package th.mfu.cupping.dto;
import jakarta.validation.constraints.*;
public record DefectTypeRequest(
    @NotBlank String defectName,
    @NotNull Integer pointsPerCup,
    String description
) {}
