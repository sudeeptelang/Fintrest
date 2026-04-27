using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Models;

/// <summary>
/// Intraday live-quote cache. One row per ticker, overwritten on each
/// refresh cycle. The screener overlays this onto EOD market_data bars
/// so users see today's price in real time (within the refresh cadence).
/// Migration 027.
/// </summary>
[Table("live_quotes")]
[Index(nameof(AsOf))]
public class LiveQuote
{
    [Key]
    [MaxLength(20)]
    public string Ticker { get; set; } = string.Empty;

    [Column(TypeName = "numeric(18,4)")]
    public decimal? Price { get; set; }

    [Column(TypeName = "numeric(18,4)")]
    public decimal? PreviousClose { get; set; }

    [Column("change_value", TypeName = "numeric(18,4)")]
    public decimal? ChangeValue { get; set; }

    [Column(TypeName = "numeric(10,4)")]
    public decimal? ChangePct { get; set; }

    [Column(TypeName = "numeric(18,4)")]
    public decimal? DayHigh { get; set; }

    [Column(TypeName = "numeric(18,4)")]
    public decimal? DayLow { get; set; }

    [Column(TypeName = "numeric(18,4)")]
    public decimal? Open { get; set; }

    // 52-week range — sourced from FMP /batch-quote.yearHigh/yearLow
    // so we don't have to re-derive from 252 historical bars (which
    // gets wrong values when ingest is gappy).
    [Column(TypeName = "numeric(18,4)")]
    public decimal? YearHigh { get; set; }

    [Column(TypeName = "numeric(18,4)")]
    public decimal? YearLow { get; set; }

    // 50-day / 200-day moving averages — also from FMP. Replaces our
    // bars.Take(50).Average() / bars.Average() derivation in the
    // screener path.
    [Column(TypeName = "numeric(18,4)")]
    public decimal? PriceAvg50 { get; set; }

    [Column(TypeName = "numeric(18,4)")]
    public decimal? PriceAvg200 { get; set; }

    [Column(TypeName = "numeric(20,2)")]
    public decimal? MarketCap { get; set; }

    public long? Volume { get; set; }

    public DateTime AsOf { get; set; }

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
