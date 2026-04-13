using System.Net;

namespace Fintrest.Api.Services.Providers;

/// <summary>
/// Tiny retry helper for HTTP-based provider calls. Hand-rolled instead of pulling in Polly
/// to avoid an extra dependency. Retries on transient HTTP failures with exponential backoff.
/// Caller cancellation is never retried.
/// </summary>
public static class HttpRetry
{
    /// <summary>Run an HTTP operation with up to <paramref name="maxAttempts"/> attempts.
    /// Delay between attempts is <paramref name="baseDelayMs"/> × 2^(attempt-1) (e.g. 500ms, 1s, 2s).
    /// On non-transient errors or final failure, the exception propagates.</summary>
    public static async Task<T?> WithBackoffAsync<T>(
        Func<CancellationToken, Task<T?>> operation,
        ILogger logger,
        string operationName,
        int maxAttempts = 3,
        int baseDelayMs = 500,
        CancellationToken ct = default)
    {
        for (int attempt = 1; attempt <= maxAttempts; attempt++)
        {
            try
            {
                return await operation(ct);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                throw; // Caller asked us to stop — never retry
            }
            catch (Exception ex) when (attempt < maxAttempts && IsTransient(ex))
            {
                var delayMs = baseDelayMs * (int)Math.Pow(2, attempt - 1);
                logger.LogDebug(
                    "{Op}: attempt {Attempt}/{Max} failed ({Reason}), retrying in {Delay}ms",
                    operationName, attempt, maxAttempts, ex.GetType().Name, delayMs);
                await Task.Delay(delayMs, ct);
            }
        }

        // Final attempt — let any exception propagate so caller can decide
        return await operation(ct);
    }

    private static bool IsTransient(Exception ex)
    {
        // Request timeouts (HttpClient surfaces these as TaskCanceledException when ct didn't ask)
        if (ex is TaskCanceledException) return true;

        if (ex is HttpRequestException hre)
        {
            // No status = network/socket failure → retry
            if (hre.StatusCode is null) return true;
            return hre.StatusCode is HttpStatusCode.TooManyRequests
                or HttpStatusCode.RequestTimeout
                or HttpStatusCode.InternalServerError
                or HttpStatusCode.BadGateway
                or HttpStatusCode.ServiceUnavailable
                or HttpStatusCode.GatewayTimeout;
        }

        return false;
    }
}
