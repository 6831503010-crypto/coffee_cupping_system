package th.mfu.cupping.dto;

public record RegisterResponse(
    Integer userId,
    String name,
    String email,
    String message) {
}
