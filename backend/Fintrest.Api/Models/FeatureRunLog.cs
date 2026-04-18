using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Fintrest.Api.Models;

/// <summary>
/// One row per FeaturePopulationJob execution. JSONB columns grow without
/// schema churn as new features join the nightly batch.
/// </summary>
[Table("feature_run_log")]
public class FeatureRunLog
{
    [Key]
    [Column("run_id")]
    public Guid RunId { get; set; } = Guid.NewGuid();

    [Column("trade_date")]
    public DateOnly TradeDate { get; set; }

    [Column("started_at")]
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;

    [Column("ended_at")]
    public DateTime? EndedAt { get; set; }

    [Column("universe_size")]
    public int? UniverseSize { get; set; }

    /// <summary>JSONB: <c>{ "feature_name": row_count }</c>.</summary>
    [Column("rows_written", TypeName = "jsonb")]
    public string RowsWrittenJson { get; set; } = "{}";

    /// <summary>JSONB: <c>{ "feature_name": error_count }</c>.</summary>
    [Column("error_count", TypeName = "jsonb")]
    public string ErrorCountJson { get; set; } = "{}";

    [Column("sector_fallbacks")]
    public int SectorFallbacks { get; set; }

    /// <summary>JSONB: <c>{ "provider": call_count }</c>.</summary>
    [Column("provider_calls", TypeName = "jsonb")]
    public string ProviderCallsJson { get; set; } = "{}";

    /// <summary>running | green | yellow | red.</summary>
    [Column("status")]
    public string Status { get; set; } = "running";
}
