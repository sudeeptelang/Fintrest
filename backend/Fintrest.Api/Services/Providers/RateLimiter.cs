namespace Fintrest.Api.Services.Providers;

/// <summary>
/// Simple in-process sliding-window rate limiter.
/// Used to keep FMP Starter plan under its 300/min limit during bulk ingestion.
/// Thread-safe, async-friendly. One instance per provider.
/// </summary>
public class RateLimiter
{
    private readonly int _maxRequests;
    private readonly TimeSpan _window;
    private readonly Queue<DateTime> _timestamps = new();
    private readonly SemaphoreSlim _lock = new(1, 1);

    /// <summary>Create a rate limiter: max requests per window.</summary>
    public RateLimiter(int maxRequests, TimeSpan window)
    {
        _maxRequests = maxRequests;
        _window = window;
    }

    /// <summary>Wait until a request slot is available, then mark it used.</summary>
    public async Task WaitAsync(CancellationToken ct = default)
    {
        while (true)
        {
            TimeSpan? waitFor = null;
            await _lock.WaitAsync(ct);
            try
            {
                var now = DateTime.UtcNow;
                // Drop expired timestamps
                while (_timestamps.Count > 0 && now - _timestamps.Peek() > _window)
                    _timestamps.Dequeue();

                if (_timestamps.Count < _maxRequests)
                {
                    _timestamps.Enqueue(now);
                    return; // Slot available
                }

                // Compute how long to wait for the oldest request to fall out of the window
                var oldest = _timestamps.Peek();
                waitFor = _window - (now - oldest) + TimeSpan.FromMilliseconds(50);
            }
            finally
            {
                _lock.Release();
            }

            if (waitFor is { } delay && delay > TimeSpan.Zero)
                await Task.Delay(delay, ct);
        }
    }
}

/// <summary>FMP rate limiter: 250/min leaves safe headroom under Starter plan (300/min).</summary>
public sealed class FmpRateLimiter : RateLimiter
{
    public FmpRateLimiter() : base(250, TimeSpan.FromMinutes(1)) { }
}
