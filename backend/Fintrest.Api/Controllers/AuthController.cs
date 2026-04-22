using Fintrest.Api.Data;
using Fintrest.Api.DTOs.Auth;
using Fintrest.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Fintrest.Api.Controllers;

/// <summary>
/// Auth is handled by Supabase. This controller syncs Supabase users
/// to our local users table and returns profile info.
/// </summary>
[ApiController]
[Route("api/v1/auth")]
public class AuthController(AppDbContext db) : ControllerBase
{
    /// <summary>
    /// Get or create the local user record from Supabase JWT claims.
    /// Called after the frontend authenticates via Supabase.
    /// </summary>
    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<UserResponse>> GetMe()
    {
        var supabaseUuid = GetSupabaseUuid();
        if (supabaseUuid is null) return Unauthorized();

        var email = User.FindFirstValue(ClaimTypes.Email)
                    ?? User.FindFirstValue("email")
                    ?? "";

        // Find by supabase_id (UUID mapping)
        var user = await db.Users.FirstOrDefaultAsync(u => u.SupabaseId == supabaseUuid.Value);

        // Fallback: find by email (for users created before supabase_id column)
        if (user is null)
            user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (user is null)
        {
            // First time this Supabase user hits our API — create local record
            user = new User
            {
                SupabaseId = supabaseUuid.Value,
                Email = email,
                PasswordHash = "supabase_auth",
                FullName = User.FindFirstValue("user_metadata.full_name"),
            };
            db.Users.Add(user);
            await db.SaveChangesAsync();
        }
        else if (user.SupabaseId is null)
        {
            // Link existing user to their Supabase UUID
            user.SupabaseId = supabaseUuid.Value;
            if (!string.IsNullOrEmpty(email)) user.Email = email;
            user.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }

        return Ok(ToDto(user));
    }

    /// <summary>
    /// Sync user profile data from Supabase after signup.
    /// Frontend calls this after supabase.auth.signUp() succeeds.
    /// </summary>
    [Authorize]
    [HttpPost("sync")]
    public async Task<ActionResult<UserResponse>> SyncProfile([FromBody] SyncProfileRequest request)
    {
        var supabaseUuid = GetSupabaseUuid();
        if (supabaseUuid is null) return Unauthorized();

        var email = User.FindFirstValue(ClaimTypes.Email)
                    ?? User.FindFirstValue("email")
                    ?? "";

        var user = await db.Users.FirstOrDefaultAsync(u => u.SupabaseId == supabaseUuid.Value)
                   ?? await db.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (user is null)
        {
            user = new User
            {
                SupabaseId = supabaseUuid.Value,
                Email = email,
                PasswordHash = "supabase_auth",
                FullName = request.FullName,
            };
            db.Users.Add(user);
        }
        else
        {
            if (user.SupabaseId is null) user.SupabaseId = supabaseUuid.Value;
            if (request.FullName is not null) user.FullName = request.FullName;
            user.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync();

        return Ok(ToDto(user));
    }

    /// <summary>Update email preferences + optional profile fields.</summary>
    [Authorize]
    [HttpPatch("me/preferences")]
    public async Task<ActionResult<UserResponse>> UpdatePreferences([FromBody] UpdatePreferencesRequest request)
    {
        var supabaseUuid = GetSupabaseUuid();
        if (supabaseUuid is null) return Unauthorized();

        var user = await db.Users.FirstOrDefaultAsync(u => u.SupabaseId == supabaseUuid.Value);
        if (user is null) return NotFound();

        if (request.ReceiveMorningBriefing.HasValue) user.ReceiveMorningBriefing = request.ReceiveMorningBriefing.Value;
        if (request.ReceiveSignalAlerts.HasValue) user.ReceiveSignalAlerts = request.ReceiveSignalAlerts.Value;
        if (request.ReceiveWeeklyNewsletter.HasValue) user.ReceiveWeeklyNewsletter = request.ReceiveWeeklyNewsletter.Value;
        if (request.FullName is not null) user.FullName = request.FullName;
        user.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Ok(ToDto(user));
    }

    /// <summary>
    /// Save / update onboarding state. Called from the 4-step onboarding
    /// funnel (docs/FINTREST_UX_SPEC.md §16). Every field is optional so the
    /// step 2/3/4 UI can PATCH just what that step collects without
    /// disturbing earlier answers. Setting `completed: true` stamps
    /// `onboarding_completed_at` and the user exits the funnel.
    /// </summary>
    [Authorize]
    [HttpPatch("me/onboarding")]
    public async Task<ActionResult<OnboardingResponse>> UpdateOnboarding(
        [FromBody] OnboardingRequest request)
    {
        var supabaseUuid = GetSupabaseUuid();
        if (supabaseUuid is null) return Unauthorized();

        var user = await db.Users.FirstOrDefaultAsync(u => u.SupabaseId == supabaseUuid.Value);
        if (user is null) return NotFound();

        if (request.ExperienceLevel is not null)
            user.ExperienceLevel = request.ExperienceLevel;
        if (request.RiskAppetite is not null)
            user.RiskAppetite = request.RiskAppetite;
        if (request.PreferredSectors is not null)
            user.PreferredSectors = System.Text.Json.JsonSerializer.Serialize(request.PreferredSectors);
        if (request.ReceiveMorningBriefing.HasValue)
            user.ReceiveMorningBriefing = request.ReceiveMorningBriefing.Value;
        if (request.ReceiveSignalAlerts.HasValue)
            user.ReceiveSignalAlerts = request.ReceiveSignalAlerts.Value;
        if (request.ReceiveWeeklyNewsletter.HasValue)
            user.ReceiveWeeklyNewsletter = request.ReceiveWeeklyNewsletter.Value;

        if (request.Completed == true)
        {
            user.OnboardingCompletedAt = DateTime.UtcNow;
            user.OnboardingSkipped = false;
        }
        else if (request.Skipped == true)
        {
            user.OnboardingSkipped = true;
            user.OnboardingCompletedAt = DateTime.UtcNow;
        }

        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Ok(new OnboardingResponse(
            user.OnboardingCompletedAt != null,
            user.OnboardingSkipped,
            user.ExperienceLevel,
            user.RiskAppetite,
            user.PreferredSectors
        ));
    }

    /// <summary>
    /// One-click unsubscribe — CAN-SPAM honours the request immediately.
    /// Anonymous: signed URL validates the user_id; no login required.
    /// Flips all three email opt-ins to false. Idempotent — re-hitting
    /// the endpoint is a no-op.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("unsubscribe")]
    public async Task<IActionResult> Unsubscribe(
        [FromQuery] long uid,
        [FromQuery] string sig,
        [FromServices] Fintrest.Api.Services.Email.UnsubscribeTokenService tokens,
        CancellationToken ct)
    {
        if (!tokens.Verify(uid, sig))
            return Ok(new UnsubscribeResponse(false, "Invalid or expired unsubscribe link."));

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == uid, ct);
        if (user is null)
            return Ok(new UnsubscribeResponse(false, "Account not found."));

        user.ReceiveMorningBriefing = false;
        user.ReceiveSignalAlerts = false;
        user.ReceiveWeeklyNewsletter = false;
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        return Ok(new UnsubscribeResponse(true, $"Unsubscribed {user.Email} from all Fintrest emails."));
    }

    private Guid? GetSupabaseUuid()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? User.FindFirstValue("sub");
        return Guid.TryParse(sub, out var guid) ? guid : null;
    }

    private static UserResponse ToDto(User user) => new(
        user.Id,
        user.Email,
        user.FullName,
        user.Plan.ToString(),
        user.ReceiveMorningBriefing,
        user.ReceiveSignalAlerts,
        user.ReceiveWeeklyNewsletter,
        user.OnboardingCompletedAt != null,
        user.OnboardingSkipped
    );
}

public record SyncProfileRequest(string? FullName);

public record UnsubscribeResponse(bool Success, string Message);

public record OnboardingRequest(
    string? ExperienceLevel,
    string? RiskAppetite,
    List<string>? PreferredSectors,
    bool? ReceiveMorningBriefing,
    bool? ReceiveSignalAlerts,
    bool? ReceiveWeeklyNewsletter,
    bool? Completed,
    bool? Skipped);

public record OnboardingResponse(
    bool Completed,
    bool Skipped,
    string? ExperienceLevel,
    string? RiskAppetite,
    string? PreferredSectors);
