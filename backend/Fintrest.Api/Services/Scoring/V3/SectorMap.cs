using System.Text.Json;

namespace Fintrest.Api.Services.Scoring.V3;

/// <summary>
/// Loads <c>Config/sector_map.json</c> and resolves a GICS sector label to its
/// SPDR sector ETF (e.g. "Information Technology" → "XLK").
///
/// Design:
///   - This class owns ONLY the sector-label → ETF map + alias normalization.
///   - Ticker → sector lookup is NOT maintained here. It lives in the
///     <c>stocks.sector</c> column (populated from FMP on ingestion).
///   - Callers resolve ticker → sector via DbContext, then hand the raw label
///     to <see cref="GetEtfForSectorLabel"/> for ETF resolution.
///
/// Used by:
///   - Algorithm #14 (sector-relative strength)
///   - Cross-sectional ranking (per-sector percentile buckets)
///   - Any future factor that needs a sector benchmark series
/// </summary>
public class SectorMap
{
    private readonly Dictionary<string, string> _sectorEtfs;     // canonical label → ETF
    private readonly Dictionary<string, string> _aliases;        // alias → canonical label
    private readonly string _marketBenchmark;                    // fallback ETF (SPY)
    private readonly ILogger<SectorMap> _logger;

    public SectorMap(ILogger<SectorMap> logger, IWebHostEnvironment env)
    {
        _logger = logger;
        _sectorEtfs = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        _aliases    = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        _marketBenchmark = "SPY";

        var path = Path.Combine(env.ContentRootPath, "Config", "sector_map.json");
        if (!File.Exists(path))
        {
            _logger.LogWarning("SectorMap: {Path} not found — every resolution will fall back to SPY", path);
            return;
        }

        try
        {
            using var stream = File.OpenRead(path);
            using var doc = JsonDocument.Parse(stream);
            var root = doc.RootElement;

            if (root.TryGetProperty("sector_etfs", out var sectors) && sectors.ValueKind == JsonValueKind.Object)
            {
                foreach (var prop in sectors.EnumerateObject())
                {
                    var etf = prop.Value.GetString();
                    if (!string.IsNullOrWhiteSpace(etf))
                        _sectorEtfs[prop.Name] = etf;
                }
            }

            if (root.TryGetProperty("label_aliases", out var aliases) && aliases.ValueKind == JsonValueKind.Object)
            {
                foreach (var prop in aliases.EnumerateObject())
                {
                    var canonical = prop.Value.GetString();
                    if (!string.IsNullOrWhiteSpace(canonical))
                        _aliases[prop.Name] = canonical;
                }
            }

            if (root.TryGetProperty("market_benchmark_etf", out var bench))
                _marketBenchmark = bench.GetString() ?? "SPY";

            _logger.LogInformation(
                "SectorMap loaded: {SectorCount} sectors, {AliasCount} aliases, benchmark={Benchmark}",
                _sectorEtfs.Count, _aliases.Count, _marketBenchmark);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SectorMap: failed to parse {Path}", path);
        }
    }

    /// <summary>The default market benchmark ETF (SPY). Returned when a label can't be resolved.</summary>
    public string MarketBenchmarkEtf => _marketBenchmark;

    /// <summary>
    /// Resolve a GICS sector label to its SPDR sector ETF.
    /// Runs the 4-step resolution order from <c>sector_map.json</c>:
    ///   1. Raw label (case-insensitive) direct lookup
    ///   2. Alias normalization
    ///   3. Normalized label lookup
    ///   4. Fall back to market benchmark (SPY) with a WARNING log
    /// </summary>
    public string GetEtfForSectorLabel(string? sectorLabel, string? tickerForLog = null)
    {
        if (string.IsNullOrWhiteSpace(sectorLabel))
        {
            _logger.LogWarning("SectorMap: null/empty sector label (ticker={Ticker}) — falling back to {Fallback}",
                tickerForLog ?? "?", _marketBenchmark);
            return _marketBenchmark;
        }

        // Step 1: direct canonical lookup
        if (_sectorEtfs.TryGetValue(sectorLabel, out var direct))
            return direct;

        // Step 2 + 3: alias → canonical → ETF
        if (_aliases.TryGetValue(sectorLabel, out var canonical)
            && _sectorEtfs.TryGetValue(canonical, out var viaAlias))
            return viaAlias;

        // Step 4: fallback with audit trail
        _logger.LogWarning(
            "SectorMap: unresolved label '{Label}' (ticker={Ticker}) — falling back to {Fallback}",
            sectorLabel, tickerForLog ?? "?", _marketBenchmark);
        return _marketBenchmark;
    }

    /// <summary>All known canonical sector labels (for iteration + validation).</summary>
    public IReadOnlyCollection<string> CanonicalSectorLabels => _sectorEtfs.Keys;
}
