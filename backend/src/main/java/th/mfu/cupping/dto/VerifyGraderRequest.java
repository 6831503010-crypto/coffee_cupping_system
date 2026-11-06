package th.mfu.cupping.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record VerifyGraderRequest(

    @NotBlank(message = "Enter the certificate name.") @Size(max = 100, message = "Certificate name must be 100 characters or fewer.") String certificateName,

    @NotBlank(message = "Enter the license code.") @Pattern(regexp = "^Q-[0-9]{6}$", message = "License code must use the format Q-123456.") String licenseCode

) {
}
