using System.Text.Json;

namespace Fintrest.Api.Services.Scoring.V3;

/// <summary>
/// Loads <c>Config/sector_map.json</c> and resolves ticker → sector ETF. Used by
/// algo #14 (sector-relative strength) and the cross-sectional ranking layer
/// to compare stocks against their peers instead of the full universe.
/// </summary>
public class SectorMap
{
    private readonly Dictionary<string, string> _tickerToEtf;
    private readonly string _defaultEtf;
    private readonly ILogger<SectorMap> _logger;

    public SectorMap(ILogger<SectorMap> logger, IWebHostEnvironment env)
    {
        _logger = logger;

        var path = Path.Combine(env.ContentRootPath, "Config", "sector_map.json");
        if (!File.Exists(path))
        {
            _logger.LogWarning("SectorMap: {Path} not found — falling back to SPY for all tickers", path);
            _tickerToEtf = new();
            _defaultEtf = "SPY";
            return;
        }

        try
        {
            using var stream = File.OpenRead(path);
            using var doc = JsonDocument.Parse(stream);
            var root = doc.RootElement;

            _defaultEtf = root.TryGetProperty("default", out var d) ? d.GetString() ?? "SPY" : "SPY";

            _tickerToEtf = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            if (root.TryGetProperty("tickers", out var tickers) && tickers.ValueKind == JsonValueKind.Object)
            {
                foreach (var prop in tickers.EnumerateObject())
                {
                    var etf = prop.Value.GetString();
                    if (!string.IsNullOrWhiteSpace(etf))
                        _tickerToEtf[prop.Name] = etf;
                }
            }

            _logger.LogInformation("SectorMap loaded: {Count} tickers mapped, default={Default}",
                _tickerToEtf.Count, _defaultEtf);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SectorMap: failed to parse {Path}", path);
            _tickerToEtf = new();
            _defaultEtf = "SPY";
        }
    }

    /// <summary>
    /// Resolve a ticker to its sector ETF. Returns the default ETF (SPY) for
    /// unknown tickers so cross-sectional operations always have a peer group.
    /// </summary>
    public string GetSectorEtf(string ticker)
    {
        return _tickerToEtf.TryGetValue(ticker, out var etf) ? etf : _defaultEtf;
    }

    /// <summary>Enumerate all known (ticker, etf) pairs.</summary>
    public IReadOnlyDictionary<string, string> AllMappings => _tickerToEtf;
}
