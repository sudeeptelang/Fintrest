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

        return Ok(new UserResponse(
            user.Id,
            user.Email,
            user.FullName,
            user.Plan.ToString()
        ));
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

        return Ok(new UserResponse(
            user.Id,
            user.Email,
            user.FullName,
            user.Plan.ToString()
        ));
    }

    private Guid? GetSupabaseUuid()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? User.FindFirstValue("sub");
        return Guid.TryParse(sub, out var guid) ? guid : null;
    }
}

public record SyncProfileRequest(string? FullName);
