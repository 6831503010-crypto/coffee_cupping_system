package th.mfu.cupping.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(

    @NotBlank(message = "Name is required") @Size(max = 100) String name,

    @NotBlank(message = "Email is required") @Email(message = "Please enter a valid email") @Size(max = 255) String email,

    @NotBlank(message = "Password is required") @Size(min = 8, max = 72, message = "Password must be between 8 and 72 characters") String password,

    @NotBlank(message = "Please confirm your password") String confirmPassword

) {
}
