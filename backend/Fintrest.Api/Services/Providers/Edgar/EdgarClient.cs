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
        // Format must conform to RFC 7231 User-Agent — email goes in
        // parentheses as a "comment" because bare emails fail
        // HttpHeaders.ParseAdd validation ("ops@fintrest.ai is invalid").
        var ua = config["Edgar:UserAgent"]
                 ?? "Fintrest.ai/1.0 (ops@fintrest.ai)";
        _http.DefaultRequestHeaders.UserAgent.Clear();
        // TryAddWithoutValidation skips the strict RFC product/comment
        // parsing — necessary if a future config override puts a bare
        // email back in. SEC accepts any non-empty UA in practice.
        _http.DefaultRequestHeaders.TryAddWithoutValidation("User-Agent", ua);
        _http.DefaultRequestHeaders.Accept.ParseAdd("*/*");
        // Don't manually set Accept-Encoding — the HttpClientHandler in
        // Program.cs has AutomaticDecompression=GZip|Deflate which adds
        // the header AND transparently decompresses responses. Setting
        // it manually here previously caused the handler to skip
        // decompression and return raw gzipped bytes (parsed as plain
        // text → 0 form 4s detected).
        _http.Timeout = TimeSpan.FromSeconds(30);
    }

    public async Task<string?> GetStringAsync(string url, CancellationToken ct = default)
    {
        await ThrottleAsync(ct);
        try
        {
            var resp = await _http.GetAsync(url, ct);
            if (resp.StatusCode == HttpStatusCode.NotFound)
            {
                _logger.LogInformation("EDGAR 404 (weekend/holiday or not yet published): {Url}", url);
                return null;
            }
            if (resp.StatusCode == (HttpStatusCode)429)
            {
                _logger.LogWarning("EDGAR 429 throttled for {Url}; backing off 5s", url);
                await Task.Delay(5000, ct);
                return null;
            }
            if (!resp.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "EDGAR {Status} for {Url} — response suppressed",
                    (int)resp.StatusCode, url);
                return null;
            }
            var body = await resp.Content.ReadAsStringAsync(ct);
            _logger.LogInformation(
                "EDGAR fetched {Url}: {Bytes} bytes, encoding={Enc}",
                url, body.Length,
                resp.Content.Headers.ContentEncoding.Count > 0
                    ? string.Join(",", resp.Content.Headers.ContentEncoding) : "identity");
            return body;
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
