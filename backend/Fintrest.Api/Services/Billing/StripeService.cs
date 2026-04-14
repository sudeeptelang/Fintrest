using Stripe;
using Stripe.Checkout;

namespace Fintrest.Api.Services.Billing;

/// <summary>
/// Wraps Stripe.NET for checkout session creation, customer portal, and
/// subscription lookup. Gracefully errors when SecretKey is missing (dev).
/// </summary>
public class StripeService
{
    private readonly IConfiguration _config;
    private readonly ILogger<StripeService> _logger;
    private readonly bool _enabled;
    private readonly string _successUrl;
    private readonly string _cancelUrl;

    public StripeService(IConfiguration config, ILogger<StripeService> logger)
    {
        _config = config;
        _logger = logger;

        var key = config["Stripe:SecretKey"];
        _enabled = !string.IsNullOrEmpty(key);
        if (_enabled)
        {
            StripeConfiguration.ApiKey = key;
        }
        else
        {
            _logger.LogWarning("Stripe:SecretKey not configured — StripeService will return stub responses");
        }

        _successUrl = config["Stripe:SuccessUrl"] ?? "http://localhost:3000/settings?checkout=success";
        _cancelUrl = config["Stripe:CancelUrl"] ?? "http://localhost:3000/pricing?checkout=canceled";
    }

    public bool IsConfigured => _enabled;

    /// <summary>Create a Stripe Checkout Session for a subscription plan.</summary>
    public async Task<CheckoutResult> CreateCheckoutSessionAsync(
        string userId,
        string email,
        string plan,
        string? existingCustomerId = null,
        CancellationToken ct = default)
    {
        if (!_enabled) return CheckoutResult.Stub("Stripe not configured");

        var priceId = plan.ToLowerInvariant() switch
        {
            "starter" => _config["Stripe:Prices:StarterMonthly"],
            "pro" => _config["Stripe:Prices:ProMonthly"],
            "elite" or "premium" => _config["Stripe:Prices:EliteMonthly"],
            _ => null,
        };

        if (string.IsNullOrEmpty(priceId))
            return CheckoutResult.Fail($"No Stripe price ID configured for plan '{plan}'");

        try
        {
            var options = new SessionCreateOptions
            {
                Mode = "subscription",
                LineItems = [new SessionLineItemOptions { Price = priceId, Quantity = 1 }],
                SuccessUrl = $"{_successUrl}&session_id={{CHECKOUT_SESSION_ID}}",
                CancelUrl = _cancelUrl,
                ClientReferenceId = userId,
                CustomerEmail = existingCustomerId is null ? email : null,
                Customer = existingCustomerId,
                SubscriptionData = new SessionSubscriptionDataOptions
                {
                    Metadata = new Dictionary<string, string>
                    {
                        ["user_id"] = userId,
                        ["plan"] = plan,
                    },
                },
                AllowPromotionCodes = true,
            };

            var service = new SessionService();
            var session = await service.CreateAsync(options, cancellationToken: ct);

            return new CheckoutResult(true, session.Url, session.Id, null);
        }
        catch (StripeException ex)
        {
            _logger.LogError(ex, "Stripe checkout creation failed for user {UserId}", userId);
            return CheckoutResult.Fail(ex.Message);
        }
    }

    /// <summary>Create a customer portal session for managing an existing subscription.</summary>
    public async Task<PortalResult> CreatePortalSessionAsync(string customerId, CancellationToken ct = default)
    {
        if (!_enabled) return PortalResult.Stub("Stripe not configured");

        try
        {
            var options = new Stripe.BillingPortal.SessionCreateOptions
            {
                Customer = customerId,
                ReturnUrl = _config["Stripe:SuccessUrl"]?.Replace("?checkout=success", "") ?? "http://localhost:3000/settings",
            };

            var service = new Stripe.BillingPortal.SessionService();
            var session = await service.CreateAsync(options, cancellationToken: ct);

            return new PortalResult(true, session.Url, null);
        }
        catch (StripeException ex)
        {
            _logger.LogError(ex, "Stripe portal creation failed");
            return PortalResult.Fail(ex.Message);
        }
    }

    /// <summary>Verify a webhook payload came from Stripe and return the parsed event.</summary>
    public Event? VerifyWebhook(string json, string signature)
    {
        var secret = _config["Stripe:WebhookSecret"];
        if (string.IsNullOrEmpty(secret))
        {
            _logger.LogWarning("Stripe:WebhookSecret not configured — cannot verify webhook");
            return null;
        }

        try
        {
            return EventUtility.ConstructEvent(json, signature, secret);
        }
        catch (StripeException ex)
        {
            _logger.LogWarning(ex, "Stripe webhook signature verification failed");
            return null;
        }
    }
}

public record CheckoutResult(bool Success, string? Url, string? SessionId, string? Error)
{
    public static CheckoutResult Stub(string reason) =>
        new(false, null, null, reason);
    public static CheckoutResult Fail(string reason) =>
        new(false, null, null, reason);
}

public record PortalResult(bool Success, string? Url, string? Error)
{
    public static PortalResult Stub(string reason) =>
        new(false, null, reason);
    public static PortalResult Fail(string reason) =>
        new(false, null, reason);
}
