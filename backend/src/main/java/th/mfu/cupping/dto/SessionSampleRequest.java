package th.mfu.cupping.dto;
import jakarta.validation.constraints.*;
public record SessionSampleRequest(
    @NotNull Integer sessionId,
    @NotNull Integer sampleId,
    @NotBlank String sampleCode,
    @NotNull Integer displayOrder
) {}
