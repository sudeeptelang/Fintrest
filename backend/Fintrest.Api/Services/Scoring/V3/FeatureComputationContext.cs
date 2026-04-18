using Fintrest.Api.Models;

namespace Fintrest.Api.Services.Scoring.V3;

/// <summary>
/// Shared state for one <see cref="FeaturePopulationJob"/> run. Contains everything
/// an <see cref="IFeature"/> can read from without hitting external services again:
/// the trade date, pre-loaded OHLCV bars, sector-ETF bars, and provider call
/// counters for the run log.
///
/// Populated once per run by the job orchestrator; <see cref="IFeature"/>
/// implementations receive it as a read-only input.
/// </summary>
public class FeatureComputationContext
{
    /// <summary>The date features are being computed FOR. This is the value that
    /// goes into <c>features.trade_date</c>.</summary>
    public DateOnly TradeDate { get; init; }

    /// <summary>Full universe the job is iterating over.</summary>
    public IReadOnlyList<string> UniverseTickers { get; init; } = Array.Empty<string>();

    /// <summary>OHLCV bars per ticker, sorted ascending by Ts. Pre-loaded once at
    /// the top of the run so each feature doesn't hit the DB 468 times.</summary>
    public IReadOnlyDictionary<string, IReadOnlyList<MarketData>> BarsByTicker { get; init; }
        = new Dictionary<string, IReadOnlyList<MarketData>>();

    /// <summary>Sector ETF (XL*) bars keyed by ETF ticker. Used by
    /// sector-relative-strength and anything else that needs a sector benchmark.</summary>
    public IReadOnlyDictionary<string, IReadOnlyList<MarketData>> SectorBars { get; init; }
        = new Dictionary<string, IReadOnlyList<MarketData>>();

    /// <summary>Stock metadata lookup — sector label, beta, next earnings, etc.
    /// One entry per ticker in <see cref="UniverseTickers"/>.</summary>
    public IReadOnlyDictionary<string, Stock> StocksByTicker { get; init; }
        = new Dictionary<string, Stock>();

    /// <summary>Per-provider call counter. Feature implementations that call an
    /// external API must increment their provider's counter — the run log uses
    /// this for the weekly health report.</summary>
    public RunCounters Counters { get; init; } = new();
}

/// <summary>
/// Mutable per-run counters. Thread-safe via <see cref="Interlocked"/> because the
/// compute loop uses <c>Parallel.ForEachAsync</c>.
/// </summary>
public class RunCounters
{
    private int _polygon;
    private int _fmp;
    private int _finnhub;
    private int _fred;
    private int _sectorFallbacks;

    public int Polygon => _polygon;
    public int Fmp => _fmp;
    public int Finnhub => _finnhub;
    public int Fred => _fred;
    public int SectorFallbacks => _sectorFallbacks;

    public void IncrementPolygon()         => Interlocked.Increment(ref _polygon);
    public void IncrementFmp()             => Interlocked.Increment(ref _fmp);
    public void IncrementFinnhub()         => Interlocked.Increment(ref _finnhub);
    public void IncrementFred()            => Interlocked.Increment(ref _fred);
    public void IncrementSectorFallback()  => Interlocked.Increment(ref _sectorFallbacks);
}
