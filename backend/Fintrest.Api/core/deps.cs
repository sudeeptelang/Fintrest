using System.Security.Claims;
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
    public static bool IsAdmin(this ClaimsPrincipal principal)
    {
        return principal.IsInRole("Admin")
               || principal.HasClaim("user_role", "admin")
               || principal.HasClaim("role", "admin");
    }
}
