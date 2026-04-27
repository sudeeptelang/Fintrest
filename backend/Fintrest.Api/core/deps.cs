using System.Security.Claims;
using System.Text.Json;
using Fintrest.Api.Data;
using Fintrest.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Core;

public static class AuthExtensions
{
    /// <summary>Get the Supabase UUID from JWT "sub" claim.</summary>
    public static Guid? GetSupabaseUuid(this ClaimsPrincipal principal)
    {
        var sub = principal.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? principal.FindFirstValue("sub");
        return Guid.TryParse(sub, out var guid) ? guid : null;
    }

    /// <summary>
    /// Resolve the local bigint user ID from the Supabase UUID.
    /// Requires the AppDbContext to look up the mapping.
    /// </summary>
    public static async Task<long?> ResolveUserId(this ClaimsPrincipal principal, AppDbContext db)
    {
        var uuid = principal.GetSupabaseUuid();
        if (uuid is null) return null;
        var user = await db.Users.FirstOrDefaultAsync(u => u.SupabaseId == uuid.Value);
        return user?.Id;
    }

    /// <summary>Check if the JWT has admin role.</summary>
    // Supabase JWTs nest custom roles inside `app_metadata` rather than emitting
    // them as top-level claims, so HasClaim("user_role", "admin") never matches
    // even when the user's app_metadata is `{"user_role":"admin"}`. Parse the
    // app_metadata JSON blob and check the nested user_role/role fields too.
    public static bool IsAdmin(this ClaimsPrincipal principal)
    {
        if (principal.IsInRole("Admin")
            || principal.HasClaim("user_role", "admin")
            || principal.HasClaim("role", "admin"))
        {
            return true;
        }

        var appMeta = principal.FindFirstValue("app_metadata");
        if (string.IsNullOrEmpty(appMeta)) return false;
        try
        {
            using var doc = JsonDocument.Parse(appMeta);
            var root = doc.RootElement;
            if (root.ValueKind != JsonValueKind.Object) return false;
            foreach (var key in new[] { "user_role", "role" })
            {
                if (root.TryGetProperty(key, out var v)
                    && v.ValueKind == JsonValueKind.String
                    && string.Equals(v.GetString(), "admin", StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }
        }
        catch (JsonException)
        {
            // Malformed app_metadata claim — treat as non-admin.
        }
        return false;
    }
}
