using System.Security.Claims;
using Fintrest.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/subscription")]
public class SubscriptionController(AppDbContext db) : ControllerBase
{
    private long UserId => long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> GetSubscription()
    {
        var user = await db.Users.Include(u => u.Subscription).FirstOrDefaultAsync(u => u.Id == UserId);
        if (user is null) return NotFound();

        var sub = user.Subscription;
        return Ok(new
        {
            Plan = user.Plan.ToString(),
            Status = sub?.Status.ToString() ?? "Inactive",
            StripeCustomerId = sub?.StripeCustomerId,
            CurrentPeriodEnd = sub?.CurrentPeriodEnd,
        });
    }

    [HttpPost("checkout")]
    public IActionResult CreateCheckout()
    {
        // TODO: Integrate Stripe checkout session creation
        return Ok(new
        {
            Message = "Stripe checkout integration pending",
            UserId,
        });
    }
}
