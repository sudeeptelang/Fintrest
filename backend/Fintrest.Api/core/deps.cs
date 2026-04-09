using System.Security.Claims;
using Fintrest.Api.Data;
using Fintrest.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Core;

/// <summary>
/// Extracts Supabase user ID from JWT and loads the local User record.
/// Use as an action filter on controllers that need the full User object.
/// </summary>
public static class AuthExtensions
{
    /// <summary>Get the Supabase user ID (long) from JWT "sub" claim.</summary>
    public static long? GetUserId(this ClaimsPrincipal principal)
    {
        var sub = principal.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? principal.FindFirstValue("sub");
        return long.TryParse(sub, out var id) ? id : null;
    }

    /// <summary>Check if the JWT has admin role.</summary>
    public static bool IsAdmin(this ClaimsPrincipal principal)
    {
        // Supabase custom claims or app_metadata.role
        return principal.IsInRole("Admin")
               || principal.HasClaim("user_role", "admin")
               || principal.HasClaim("role", "admin");
    }
}
