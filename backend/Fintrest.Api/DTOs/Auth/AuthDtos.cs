using System.ComponentModel.DataAnnotations;

namespace Fintrest.Api.DTOs.Auth;

public record SignupRequest(
    [Required, EmailAddress] string Email,
    [Required, MinLength(8)] string Password,
    string? FullName
);

public record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password
);

public record TokenResponse(string AccessToken, string TokenType = "bearer");

public record UserResponse(
    Guid Id,
    string Email,
    string? FullName,
    string Plan,
    bool IsActive
);
