using System.Net;

namespace Fintrest.Api.Services.Providers.Edgar;

/// <summary>
/// Thin HTTP client for SEC EDGAR. Handles the mandatory User-Agent header
/// (SEC requires a contact email per fair-access policy) + a light 10-rps
/// rate limiter. Exceeding the rate gets you 403'd for 10 minutes, so the
/// gate is strict.
///
/// All EDGAR paths are rooted at https://www.sec.gov/ (archives + daily
/// index) or https://data.sec.gov/ (submissions API + company-tickers).
/// </summary>
public class EdgarClient
{
    private static readonly SemaphoreSlim _gate = new(1, 1);
    private static DateTime _lastRequest = DateTime.MinValue;
    private static readonly TimeSpan _minInterval = TimeSpan.FromMilliseconds(110); // ~9 rps, stays below 10

    private readonly HttpClient _http;
    private readonly ILogger<EdgarClient> _logger;

    public EdgarClient(HttpClient http, IConfiguration config, ILogger<EdgarClient> logger)
    {
        _http = http;
        _logger = logger;

        // User-Agent is MANDATORY per SEC fair-access. Must include a
        // contact email the SEC can reach if our crawl misbehaves.
        var ua = config["Edgar:UserAgent"]
                 ?? "Fintrest.ai Research ops@fintrest.ai";
        _http.DefaultRequestHeaders.UserAgent.Clear();
        _http.DefaultRequestHeaders.UserAgent.ParseAdd(ua);
        _http.DefaultRequestHeaders.Accept.ParseAdd("*/*");
        _http.DefaultRequestHeaders.AcceptEncoding.ParseAdd("gzip, deflate");
        _http.Timeout = TimeSpan.FromSeconds(30);
    }

    public async Task<string?> GetStringAsync(string url, CancellationToken ct = default)
    {
        await ThrottleAsync(ct);
        try
        {
            var resp = await _http.GetAsync(url, ct);
            if (resp.StatusCode == HttpStatusCode.NotFound) return null;
            if (resp.StatusCode == (HttpStatusCode)429)
            {
                _logger.LogWarning("EDGAR 429 throttled for {Url}; backing off 5s", url);
                await Task.Delay(5000, ct);
                return null;
            }
            resp.EnsureSuccessStatusCode();
            return await resp.Content.ReadAsStringAsync(ct);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "EDGAR fetch failed: {Url}", url);
            return null;
        }
    }

    private static async Task ThrottleAsync(CancellationToken ct)
    {
        await _gate.WaitAsync(ct);
        try
        {
            var elapsed = DateTime.UtcNow - _lastRequest;
            if (elapsed < _minInterval)
                await Task.Delay(_minInterval - elapsed, ct);
            _lastRequest = DateTime.UtcNow;
        }
        finally
        {
            _gate.Release();
        }
    }
}
