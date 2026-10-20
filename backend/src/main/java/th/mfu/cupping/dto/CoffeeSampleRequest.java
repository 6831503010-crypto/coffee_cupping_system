package th.mfu.cupping.dto;
import jakarta.validation.constraints.*;
public record CoffeeSampleRequest(
    @NotBlank String sampleName,
    String process,
    Integer harvestYear,
    String growingLocation,
    String ownerProducer
) {}
