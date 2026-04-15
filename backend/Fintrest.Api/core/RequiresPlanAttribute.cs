using Fintrest.Api.Data;
using Fintrest.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Core;

/// <summary>
/// Server-side plan gate. Stack on top of <c>[Authorize]</c> to require the caller
/// is on <paramref name="Minimum"/> or higher. Returns 402 Payment Required with a
/// JSON body the frontend can use to render an upgrade prompt:
///
///   { error: "upgrade_required", required: "pro", current: "free" }
///
/// The frontend <c>PaywallGate</c> handles the UX; this attribute is the security boundary.
/// </summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public class RequiresPlanAttribute(PlanType minimum) : Attribute, IAsyncAuthorizationFilter
{
    public PlanType Minimum { get; } = minimum;

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        // Skip if another filter already set a result (e.g. [Authorize] rejected first).
        if (context.Result is not null) return;

        // Respect [AllowAnonymous] on the endpoint — public endpoints inside a gated
        // controller (e.g. portfolio-template.csv download) must stay open.
        var endpoint = context.HttpContext.GetEndpoint();
        if (endpoint?.Metadata.GetMetadata<Microsoft.AspNetCore.Authorization.IAllowAnonymous>() is not null)
            return;

        var db = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
        var principal = context.HttpContext.User;

        var userId = await principal.ResolveUserId(db);
        if (userId is null)
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        var user = await db.Users
            .Where(u => u.Id == userId.Value)
            .Select(u => new { u.Plan })
            .FirstOrDefaultAsync();

        var current = user?.Plan ?? PlanType.Free;
        if (Rank(current) >= Rank(Minimum)) return;

        context.Result = new ObjectResult(new
        {
            error = "upgrade_required",
            required = Minimum.ToString().ToLowerInvariant(),
            current = current.ToString().ToLowerInvariant(),
        })
        { StatusCode = StatusCodes.Status402PaymentRequired };
    }

    private static int Rank(PlanType p) => p switch
    {
        PlanType.Free => 0,
        PlanType.Pro => 1,
        PlanType.Elite => 2,
        _ => 0,
    };
}
