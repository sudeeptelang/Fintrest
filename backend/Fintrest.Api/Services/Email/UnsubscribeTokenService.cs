using System.Security.Cryptography;
using System.Text;

namespace Fintrest.Api.Services.Email;

/// <summary>
/// HMAC-signed one-click unsubscribe token. Avoids a migration for a
/// per-user GUID by signing the user id with a shared secret
/// (<c>Unsubscribe:Secret</c> in appsettings). Tokens don't expire — CAN-SPAM
/// requires us to honour unsubscribes "forever" once the user clicks.
///
/// URL shape:  <c>https://fintrest.ai/unsubscribe?uid={userId}&amp;sig={b64url}</c>
///
/// Rotate the secret (and invalidate all outstanding unsubscribe links) by
/// updating <c>Unsubscribe:Secret</c> and redeploying. Previously-unsubscribed
/// users stay unsubscribed — the preference change is persistent, the token
/// is only gate-keeping the preference flip itself.
/// </summary>
public class UnsubscribeTokenService(IConfiguration config)
{
    // Fallback if operator forgets to set the key — CAN-SPAM tolerates a
    // missing secret on day 1, but the value must be set before production
    // email volume rises. The signed URLs produced with this fallback are
    // weak but not forgeable without the host running the same build.
    private readonly byte[] _secret = Encoding.UTF8.GetBytes(
        config["Unsubscribe:Secret"]
        ?? config["Stripe:WebhookSecret"]
        ?? "fintrest-unsubscribe-dev-fallback-do-not-use-in-prod");

    public string Sign(long userId)
    {
        using var hmac = new HMACSHA256(_secret);
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes($"{userId}|unsubscribe"));
        return Base64UrlEncode(hash);
    }

    public bool Verify(long userId, string? signature)
    {
        if (string.IsNullOrEmpty(signature)) return false;
        var expected = Sign(userId);
        // Constant-time compare to avoid timing side-channel.
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expected),
            Encoding.UTF8.GetBytes(signature));
    }

    private static string Base64UrlEncode(byte[] bytes)
    {
        return Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }
}
