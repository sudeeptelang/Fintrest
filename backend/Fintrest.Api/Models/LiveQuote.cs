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

    public long? Volume { get; set; }

    public DateTime AsOf { get; set; }

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
