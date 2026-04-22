using System.Text.Json;
using Fintrest.Api.Data;
using Fintrest.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Services.Email;

/// <summary>
/// Walks every active user alert, compares the trigger condition against the
/// latest market data bar for the alert's stock, and fires (send + record +
/// deactivate) when the condition is met. Complements <see cref="AlertDispatcher"/>
/// which fires post-scan signal-level alerts; this service is for the
/// user-defined price / stop-loss / target / volume triggers.
///
/// <para>
/// MVP semantics:
///   <c>price</c> — fires when latest close ≥ trigger (upward cross).
///   <c>target</c> — fires when latest close ≥ trigger (target reached).
///   <c>stop_loss</c> — fires when latest close ≤ trigger (downward cross).
///   <c>volume</c> — fires when latest volume / 30-day average × 100 ≥ trigger percent.
/// </para>
///
/// <para>
/// One-shot: the alert row is flipped to <c>Active = false</c> after firing.
/// Users can recreate or reactivate from the UI. Avoids the classic
/// "phone buzzes every 10 minutes because TSLA is above $250 all day"
/// anti-pattern.
/// </para>
/// </summary>
public class AlertEvaluator(
    AppDbContext db,
    EmailService emailService,
    UnsubscribeTokenService unsubscribeTokens,
    IConfiguration config,
    ILogger<AlertEvaluator> logger)
{
    private readonly string _siteUrl = config["Site:Url"] ?? "https://fintrest.ai";

    private string UnsubscribeUrlFor(long userId)
    {
        var sig = unsubscribeTokens.Sign(userId);
        return $"{_siteUrl}/unsubscribe?uid={userId}&sig={sig}";
    }

    public record EvaluateResult(int Evaluated, int Matched, int Sent, int Failed);

    public async Task<EvaluateResult> RunOnceAsync(CancellationToken ct = default)
    {
        var alerts = await db.Alerts
            .Include(a => a.User)
            .Include(a => a.Stock)
            .Where(a => a.Active
                        && a.StockId != null
                        && a.User.ReceiveSignalAlerts
                        && !string.IsNullOrEmpty(a.User.Email))
            .ToListAsync(ct);

        if (alerts.Count == 0)
            return new EvaluateResult(0, 0, 0, 0);

        // Batch-load latest 30 bars per stock so we can compute avg volume for
        // the "volume" trigger without N×1 round trips.
        var stockIds = alerts.Select(a => a.StockId!.Value).Distinct().ToList();
        var cutoff = DateTime.UtcNow.AddDays(-45);
        var recentBars = await db.MarketData
            .Where(m => stockIds.Contains(m.StockId) && m.Ts >= cutoff)
            .OrderByDescending(m => m.Ts)
            .Select(m => new BarRow(m.StockId, m.Ts, m.Close, m.Volume))
            .ToListAsync(ct);

        var barsByStock = recentBars
            .GroupBy(m => m.StockId)
            .ToDictionary(g => g.Key, g => g.ToList());

        int matched = 0, sent = 0, failed = 0;

        foreach (var alert in alerts)
        {
            if (!barsByStock.TryGetValue(alert.StockId!.Value, out var bars) || bars.Count == 0)
                continue;

            var latest = bars[0];
            var trigger = ParseTrigger(alert.ThresholdJson);
            if (trigger is null) continue;

            bool fired = alert.AlertType switch
            {
                "price"     => latest.Close >= trigger.Value,
                "target"    => latest.Close >= trigger.Value,
                "stop_loss" => latest.Close <= trigger.Value,
                "volume"    => EvaluateVolume(bars, trigger.Value),
                _           => false,
            };

            if (!fired) continue;
            matched++;

            var ticker = alert.Stock?.Ticker ?? "—";
            var subject = alert.AlertType switch
            {
                "price"     => $"{ticker} crossed ${trigger.Value:F2}",
                "target"    => $"{ticker} reached your target of ${trigger.Value:F2}",
                "stop_loss" => $"{ticker} fell to your stop of ${trigger.Value:F2}",
                "volume"    => $"{ticker} — volume spike {trigger.Value:F0}% of average",
                _           => $"{ticker} — alert triggered",
            };
            var html = EmailTemplates.PriceAlert(
                alert.User.FullName ?? "",
                ticker,
                alert.AlertType,
                trigger.Value,
                latest.Close,
                UnsubscribeUrlFor(alert.User.Id));

            var result = await emailService.SendAsync(alert.User.Email, subject, html, null, ct);
            if (result.Success)
            {
                sent++;
                alert.Active = false; // one-shot
            }
            else
            {
                failed++;
            }

            db.AlertDeliveries.Add(new AlertDelivery
            {
                AlertId = alert.Id,
                UserId = alert.UserId,
                DeliveryChannel = "email",
                DeliveryStatus = result.Success ? "sent" : "failed",
                SentAt = result.Success ? DateTime.UtcNow : null,
                ProviderMessageId = result.MessageId,
            });
        }

        await db.SaveChangesAsync(ct);

        logger.LogInformation(
            "AlertEvaluator: evaluated={Evaluated} matched={Matched} sent={Sent} failed={Failed}",
            alerts.Count, matched, sent, failed);

        return new EvaluateResult(alerts.Count, matched, sent, failed);
    }

    private static double? ParseTrigger(string? json)
    {
        if (string.IsNullOrEmpty(json)) return null;
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("value", out var v) && v.ValueKind == JsonValueKind.Number)
                return v.GetDouble();
        }
        catch { /* malformed json — ignore */ }
        return null;
    }

    private static bool EvaluateVolume(List<BarRow> bars, double pctTrigger)
    {
        if (bars.Count < 5) return false;
        var latestVol = (double)bars[0].Volume;
        var baseline = bars.Skip(1).Take(30)
            .Select(b => (double)b.Volume)
            .DefaultIfEmpty(0.0)
            .Average();
        if (baseline <= 0) return false;
        var ratio = latestVol / baseline * 100.0;
        return ratio >= pctTrigger;
    }

    private record BarRow(long StockId, DateTime Ts, double Close, long Volume);
}
