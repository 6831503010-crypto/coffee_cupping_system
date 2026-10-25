package th.mfu.cupping.dto;

import jakarta.validation.constraints.*;

public record CoffeeSampleRequest(
    @NotBlank @Size(max = 255) String sampleName,
    @Size(max = 100) String process,
    @Min(1900) @Max(2100) Integer harvestYear,
    @Size(max = 255) String growingLocation,
    @Size(max = 255) String ownerProducer
) {}
