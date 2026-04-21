using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Fintrest.Api.Models;

/// <summary>
/// Cached row from a daily firehose pull (insider / senate / house). Controllers
/// read from this table instead of calling FMP at request time, so a provider
/// blip or rate-limit never produces an empty /insiders or /congress page.
/// </summary>
[Table("market_firehose_snapshot")]
public class MarketFirehoseSnapshot
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    /// <summary><c>"insider"</c> | <c>"senate"</c> | <c>"house"</c>.</summary>
    [Column("kind")]
    public string Kind { get; set; } = "";

    [Column("ticker")]
    public string? Ticker { get; set; }

    [Column("transaction_date")]
    public DateOnly? TransactionDate { get; set; }

    [Column("disclosure_date")]
    public DateOnly? DisclosureDate { get; set; }

    [Column("filing_date")]
    public DateOnly? FilingDate { get; set; }

    /// <summary>Reporting name (insider) or representative name (congress).</summary>
    [Column("actor_name")]
    public string? ActorName { get; set; }

    /// <summary>Relationship/role (insider) or office (congress).</summary>
    [Column("actor_role")]
    public string? ActorRole { get; set; }

    /// <summary><c>"senate"</c> | <c>"house"</c> | null for insider rows.</summary>
    [Column("chamber")]
    public string? Chamber { get; set; }

    [Column("transaction_type")]
    public string? TransactionType { get; set; }

    [Column("shares")]
    public double? Shares { get; set; }

    [Column("price")]
    public double? Price { get; set; }

    [Column("total_value")]
    public double? TotalValue { get; set; }

    /// <summary>Congress: disclosed as bucketed range (e.g. "$1,001 – $15,000").</summary>
    [Column("amount_range")]
    public string? AmountRange { get; set; }

    [Column("asset_description")]
    public string? AssetDescription { get; set; }

    [Column("source_url")]
    public string? SourceUrl { get; set; }

    /// <summary>Raw provider row — future-proofs against schema drift.</summary>
    [Column("payload_json", TypeName = "jsonb")]
    public string? PayloadJson { get; set; }

    [Column("captured_at")]
    public DateTime CapturedAt { get; set; } = DateTime.UtcNow;
}
