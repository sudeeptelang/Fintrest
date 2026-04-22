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
    long Id,
    string Email,
    string? FullName,
    string Plan,
    bool ReceiveMorningBriefing,
    bool ReceiveSignalAlerts,
    bool ReceiveWeeklyNewsletter,
    // Onboarding state — lets the frontend decide whether to redirect a
    // user to /onboarding on first app load. Null completed + not skipped
    // = greet the user; otherwise land on /markets.
    bool OnboardingCompleted,
    bool OnboardingSkipped
);

public record UpdatePreferencesRequest(
    bool? ReceiveMorningBriefing,
    bool? ReceiveSignalAlerts,
    bool? ReceiveWeeklyNewsletter,
    string? FullName
);
