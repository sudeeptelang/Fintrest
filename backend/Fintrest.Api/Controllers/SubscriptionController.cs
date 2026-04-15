using Fintrest.Api.Core;
using Fintrest.Api.Data;
using Fintrest.Api.Models;
using Fintrest.Api.Services.Billing;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Stripe;

namespace Fintrest.Api.Controllers;

[ApiController]
[Route("api/v1/subscription")]
public class SubscriptionController(AppDbContext db, StripeService stripe, ILogger<SubscriptionController> logger) : ControllerBase
{
    private async Task<long> GetUserId()
    {
        var id = await User.ResolveUserId(db);
        return id ?? throw new UnauthorizedAccessException();
    }

    [Authorize]
    [HttpGet]
    public async Task<IActionResult> GetSubscription()
    {
        var userId = await GetUserId();
        var user = await db.Users.Include(u => u.Subscription).FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return NotFound();

        // Self-heal: if we have a Stripe Subscription ID, pull the latest state from Stripe
        // and reconcile our DB. This closes the gap when webhooks missed an update (e.g. SDK API
        // version mismatch, transient error, local dev without stripe listen running earlier).
        if (stripe.IsConfigured && user.Subscription?.StripeSubscriptionId is string subId)
        {
            try
            {
                var svc = new Stripe.SubscriptionService();
                var stripeSub = await svc.GetAsync(subId);
                if (stripeSub is not null)
                {
                    user.Subscription.Status = stripeSub.Status?.Trim().ToLowerInvariant() switch
                    {
                        "active" => SubscriptionStatus.Active,
                        "trialing" => SubscriptionStatus.Trialing,
                        "past_due" => SubscriptionStatus.PastDue,
                        "canceled" or "cancelled" => SubscriptionStatus.Canceled,
                        _ => SubscriptionStatus.Inactive,
                    };
                    var periodEnd = ResolveCurrentPeriodEnd(stripeSub);
                    if (periodEnd.HasValue) user.Subscription.CurrentPeriodEnd = periodEnd;
                    if (stripeSub.Metadata.TryGetValue("plan", out var planStr)
                        && Enum.TryParse<PlanType>(planStr, ignoreCase: true, out var plan))
                    {
                        user.Subscription.Plan = plan;
                        user.Plan = plan;
                    }
                    user.Subscription.UpdatedAt = DateTime.UtcNow;
                    await db.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Stripe self-heal sync failed for user {UserId}", userId);
            }
        }

        var sub = user.Subscription;
        return Ok(new
        {
            Plan = user.Plan.ToString(),
            Status = sub?.Status.ToString() ?? "Inactive",
            StripeCustomerId = sub?.StripeCustomerId,
            StripeSubscriptionId = sub?.StripeSubscriptionId,
            CurrentPeriodEnd = sub?.CurrentPeriodEnd,
            StripeConfigured = stripe.IsConfigured,
        });
    }

    /// <summary>Create a Stripe Checkout session for the selected plan.</summary>
    [Authorize]
    [HttpPost("checkout")]
    public async Task<IActionResult> CreateCheckout([FromBody] CheckoutRequest request)
    {
        var userId = await GetUserId();
        var user = await db.Users.Include(u => u.Subscription).FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return NotFound();

        var result = await stripe.CreateCheckoutSessionAsync(
            userId: userId.ToString(),
            email: user.Email,
            plan: request.Plan,
            existingCustomerId: user.Subscription?.StripeCustomerId
        );

        if (!result.Success)
            return BadRequest(new { error = result.Error ?? "Checkout failed", configured = stripe.IsConfigured });

        return Ok(new { url = result.Url, sessionId = result.SessionId });
    }

    /// <summary>Create a Customer Portal session for managing the existing subscription.</summary>
    [Authorize]
    [HttpPost("portal")]
    public async Task<IActionResult> CreatePortal()
    {
        var userId = await GetUserId();
        var user = await db.Users.Include(u => u.Subscription).FirstOrDefaultAsync(u => u.Id == userId);
        if (user?.Subscription?.StripeCustomerId is null)
            return BadRequest(new { error = "No active Stripe customer — subscribe first" });

        var result = await stripe.CreatePortalSessionAsync(user.Subscription.StripeCustomerId);

        if (!result.Success)
            return BadRequest(new { error = result.Error });

        return Ok(new { url = result.Url });
    }

    /// <summary>
    /// Stripe webhook endpoint — receives subscription lifecycle events.
    /// Configure Stripe dashboard to POST to https://your.domain/api/v1/subscription/webhook
    /// with the webhook secret matching Stripe:WebhookSecret in config.
    /// </summary>
    [HttpPost("webhook")]
    public async Task<IActionResult> Webhook()
    {
        using var reader = new StreamReader(HttpContext.Request.Body);
        var json = await reader.ReadToEndAsync();
        var signature = Request.Headers["Stripe-Signature"].ToString();

        var stripeEvent = stripe.VerifyWebhook(json, signature);
        if (stripeEvent is null) return BadRequest(new { error = "Invalid signature" });

        logger.LogInformation("Stripe webhook received: {Type}", stripeEvent.Type);

        switch (stripeEvent.Type)
        {
            case "checkout.session.completed":
                await HandleCheckoutCompleted(stripeEvent);
                break;

            case "customer.subscription.created":
            case "customer.subscription.updated":
                await HandleSubscriptionUpdated(stripeEvent);
                break;

            case "customer.subscription.deleted":
                await HandleSubscriptionDeleted(stripeEvent);
                break;
        }

        return Ok(new { received = true });
    }

    private async Task HandleCheckoutCompleted(Event evt)
    {
        if (evt.Data.Object is not Stripe.Checkout.Session session) return;
        if (!long.TryParse(session.ClientReferenceId, out var userId)) return;

        var user = await db.Users.Include(u => u.Subscription).FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return;

        var sub = user.Subscription ?? new Models.Subscription { UserId = userId };
        sub.StripeCustomerId = session.CustomerId;
        sub.StripeSubscriptionId = session.SubscriptionId;
        sub.Status = SubscriptionStatus.Active;
        sub.UpdatedAt = DateTime.UtcNow;

        if (user.Subscription is null) db.Subscriptions.Add(sub);
        await db.SaveChangesAsync();
        logger.LogInformation("Subscription activated for user {UserId}", userId);
    }

    private async Task HandleSubscriptionUpdated(Event evt)
    {
        if (evt.Data.Object is not Stripe.Subscription stripeSub) return;

        var sub = await db.Subscriptions
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.StripeSubscriptionId == stripeSub.Id);
        if (sub is null) return;

        // Stripe statuses: active, trialing, past_due, canceled, unpaid, incomplete,
        // incomplete_expired, paused. Anything not explicitly mapped falls through to Inactive,
        // but we case-insensitive-match since Stripe occasionally ships uppercase/spaced values.
        sub.Status = stripeSub.Status?.Trim().ToLowerInvariant() switch
        {
            "active" => SubscriptionStatus.Active,
            "trialing" => SubscriptionStatus.Trialing,
            "past_due" => SubscriptionStatus.PastDue,
            "canceled" or "cancelled" => SubscriptionStatus.Canceled,
            _ => SubscriptionStatus.Inactive,
        };
        // CurrentPeriodEnd — in API version 2025-02-24+ (dahlia), it moved from the Subscription
        // top-level onto each SubscriptionItem. Older versions had it on the top level. Try both.
        var periodEnd = ResolveCurrentPeriodEnd(stripeSub);
        if (periodEnd.HasValue && periodEnd.Value.Year > 2000)
            sub.CurrentPeriodEnd = periodEnd;

        // Map Stripe price/product to our plan enum if metadata present
        if (stripeSub.Metadata.TryGetValue("plan", out var planStr)
            && Enum.TryParse<PlanType>(planStr, ignoreCase: true, out var plan))
        {
            sub.Plan = plan;
            sub.User.Plan = plan;
        }

        sub.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        logger.LogInformation("Subscription {Id} updated to status={Status}", stripeSub.Id, sub.Status);
    }

    private async Task HandleSubscriptionDeleted(Event evt)
    {
        if (evt.Data.Object is not Stripe.Subscription stripeSub) return;

        var sub = await db.Subscriptions
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.StripeSubscriptionId == stripeSub.Id);
        if (sub is null) return;

        sub.Status = SubscriptionStatus.Canceled;
        sub.Plan = PlanType.Free;
        sub.User.Plan = PlanType.Free;
        sub.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        logger.LogInformation("Subscription {Id} canceled for user {UserId}", stripeSub.Id, sub.UserId);
    }
}

    /// <summary>
    /// Extract CurrentPeriodEnd from a Stripe Subscription across API versions.
    ///   - Legacy (pre-dahlia): Subscription.CurrentPeriodEnd is a DateTime on the object.
    ///   - Dahlia+: lives on each SubscriptionItem as Items.Data[i].CurrentPeriodEnd.
    /// Falls back to reflection so this tolerates future SDK moves too.
    /// </summary>
    private static DateTime? ResolveCurrentPeriodEnd(Stripe.Subscription stripeSub)
    {
        // Try the new items-level location first.
        if (stripeSub.Items?.Data is { Count: > 0 } items)
        {
            var itemProp = items[0].GetType().GetProperty("CurrentPeriodEnd");
            if (itemProp?.GetValue(items[0]) is DateTime itemEnd && itemEnd.Year > 2000)
                return itemEnd;
        }
        // Fall back to the legacy top-level property.
        var topProp = stripeSub.GetType().GetProperty("CurrentPeriodEnd");
        if (topProp?.GetValue(stripeSub) is DateTime topEnd && topEnd.Year > 2000)
            return topEnd;
        return null;
    }
}

public record CheckoutRequest(string Plan);
