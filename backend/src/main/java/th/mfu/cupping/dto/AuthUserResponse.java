package th.mfu.cupping.dto;

public record AuthUserResponse(
    Integer userId,
    String name,
    String email) {
}
