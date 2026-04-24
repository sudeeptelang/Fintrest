using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Models;

/// <summary>
/// Raw Form 4 insider transaction row ingested from SEC EDGAR. Scoring
/// filters on transaction_code='P' + is_10b5_1=false + is_open_market=true.
/// Everything else (grants, option exercises, 10b5-1 scheduled sales, gifts)
/// is noise and must not influence the insider score.
/// </summary>
[Table("insider_transactions")]
[Index(nameof(Ticker), nameof(TransactionDate), AllDescending = false)]
[Index(nameof(FilingDate))]
public class InsiderTransaction
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    [Required, MaxLength(50)]
    public string AccessionNumber { get; set; } = string.Empty;

    [Required, MaxLength(20)]
    public string CompanyCik { get; set; } = string.Empty;

    [Required, MaxLength(20)]
    public string Ticker { get; set; } = string.Empty;

    [Required, MaxLength(20)]
    public string InsiderCik { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string InsiderName { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? InsiderTitle { get; set; }

    public bool IsOfficer { get; set; }
    public bool IsDirector { get; set; }
    public bool Is10PctOwner { get; set; }

    [Column(TypeName = "date")]
    public DateTime TransactionDate { get; set; }

    [Column(TypeName = "date")]
    public DateTime FilingDate { get; set; }

    /// <summary>
    /// Form 4 transaction code. 'P' = open-market purchase (the signal),
    /// 'S' = open-market sale, 'A' = grant/award (comp, not conviction),
    /// 'M' = derivative exercise (often tax-driven), 'F' = tax withholding,
    /// 'D' = disposition to issuer, 'G' = bona fide gift.
    /// </summary>
    [Required, MaxLength(1)]
    public string TransactionCode { get; set; } = string.Empty;

    [Column(TypeName = "numeric(18,4)")]
    public decimal Shares { get; set; }

    [Column(TypeName = "numeric(18,4)")]
    public decimal? PricePerShare { get; set; }

    [Column(TypeName = "numeric(18,2)")]
    public decimal? TotalValue { get; set; }

    [Column(TypeName = "numeric(18,4)")]
    public decimal? SharesOwnedAfter { get; set; }

    /// <summary>10b5-1 scheduled trades are pre-arranged, not discretionary. Excluded from scoring.</summary>
    public bool Is10b5_1 { get; set; }

    public bool IsOpenMarket { get; set; } = true;

    public string? RawXmlUrl { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
