using System.Text;
using Fintrest.Api.Models;

namespace Fintrest.Api.Services.Email;

/// <summary>
/// Plain C# HTML email templates. Inline styles (required for email clients).
/// All templates share the Fintrest header + compliance footer.
/// </summary>
public static class EmailTemplates
{
    private const string Brand = "#2563EB";
    private const string Accent = "#8B5CF6";
    private const string Gain = "#10B981";
    private const string Loss = "#EF4444";
    private const string Amber = "#F59E0B";
    private const string TextColor = "#0F172A";
    private const string MutedText = "#64748B";
    private const string Border = "#E2E8F0";
    private const string Background = "#F8FAFC";

    // ════════════════════════════════════════════════════════════════
    // MORNING BRIEFING — daily signal recap
    // ════════════════════════════════════════════════════════════════

    public static string MorningBriefing(string userName, List<Signal> topSignals, DateTime scanDate)
    {
        var sb = new StringBuilder();
        sb.Append(Header("Your Morning Signals"));

        sb.Append($@"
<div style='padding:28px 24px;'>
  <p style='margin:0 0 8px; color:{TextColor}; font-size:16px;'>Good morning{(string.IsNullOrEmpty(userName) ? "" : $", {userName}")},</p>
  <p style='margin:0 0 24px; color:{MutedText}; font-size:14px;'>
    Here are today's top {topSignals.Count} signals from our scan on <strong>{scanDate:MMM d, yyyy}</strong>.
    Athena analyzed {topSignals.Count * 23} data points across the S&P 500.
  </p>
  <table cellspacing='0' cellpadding='0' style='width:100%; border-collapse:collapse; border:1px solid {Border}; border-radius:12px; overflow:hidden;'>
    <thead>
      <tr style='background:{Background};'>
        <th style='padding:12px; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:0.05em; color:{MutedText};'>Ticker</th>
        <th style='padding:12px; text-align:right; font-size:11px; text-transform:uppercase; letter-spacing:0.05em; color:{MutedText};'>Score</th>
        <th style='padding:12px; text-align:right; font-size:11px; text-transform:uppercase; letter-spacing:0.05em; color:{MutedText};'>Entry</th>
        <th style='padding:12px; text-align:right; font-size:11px; text-transform:uppercase; letter-spacing:0.05em; color:{MutedText};'>Target</th>
        <th style='padding:12px; text-align:right; font-size:11px; text-transform:uppercase; letter-spacing:0.05em; color:{MutedText};'>Stop</th>
      </tr>
    </thead>
    <tbody>");

        foreach (var sig in topSignals.Take(10))
        {
            var signalColor = sig.SignalType == SignalType.BUY_TODAY ? Gain : Amber;
            var entryDisplay = sig.EntryLow.HasValue && sig.EntryHigh.HasValue
                ? $"${sig.EntryLow.Value:F0}–${sig.EntryHigh.Value:F0}" : "—";
            var targetDisplay = sig.TargetLow.HasValue && sig.TargetHigh.HasValue
                ? $"${sig.TargetLow.Value:F0}–${sig.TargetHigh.Value:F0}" : "—";
            var stopDisplay = sig.StopLoss.HasValue ? $"${sig.StopLoss.Value:F0}" : "—";

            sb.Append($@"
      <tr style='border-top:1px solid {Border};'>
        <td style='padding:14px 12px;'>
          <div style='font-family:Monaco,Courier,monospace; font-weight:700; color:{TextColor}; font-size:14px;'>
            <a href='https://fintrest.ai/stock/{sig.Stock.Ticker}' style='color:{Brand}; text-decoration:none;'>{sig.Stock.Ticker}</a>
          </div>
          <div style='font-size:11px; color:{MutedText}; margin-top:2px;'>{sig.Stock.Name}</div>
          <span style='display:inline-block; margin-top:6px; padding:2px 8px; border-radius:9999px; background-color:{signalColor}1A; color:{signalColor}; font-size:10px; font-weight:600;'>
            {sig.SignalType.ToString().Replace("_", " ")}
          </span>
        </td>
        <td style='padding:14px 12px; text-align:right; font-family:Monaco,Courier,monospace; font-weight:700; color:{TextColor}; font-size:18px;'>
          {Math.Round(sig.ScoreTotal)}
        </td>
        <td style='padding:14px 12px; text-align:right; font-family:Monaco,Courier,monospace; color:{TextColor}; font-size:13px;'>
          {entryDisplay}
        </td>
        <td style='padding:14px 12px; text-align:right; font-family:Monaco,Courier,monospace; color:{Gain}; font-size:13px;'>
          {targetDisplay}
        </td>
        <td style='padding:14px 12px; text-align:right; font-family:Monaco,Courier,monospace; color:{Loss}; font-size:13px;'>
          {stopDisplay}
        </td>
      </tr>");
        }

        sb.Append($@"
    </tbody>
  </table>
  <div style='margin-top:24px; text-align:center;'>
    <a href='https://fintrest.ai/picks' style='display:inline-block; background:{Brand}; color:white; padding:12px 24px; border-radius:12px; text-decoration:none; font-weight:600; font-size:14px;'>
      View All Signals →
    </a>
  </div>
</div>");

        sb.Append(Footer());
        return sb.ToString();
    }

    // ════════════════════════════════════════════════════════════════
    // SIGNAL ALERT — single stock triggered alert
    // ════════════════════════════════════════════════════════════════

    public static string SignalAlert(string userName, Signal signal, string alertReason)
    {
        var sb = new StringBuilder();
        sb.Append(Header("Signal Alert"));

        var signalColor = signal.SignalType == SignalType.BUY_TODAY ? Gain : Amber;

        sb.Append($@"
<div style='padding:28px 24px;'>
  <div style='text-align:center; margin-bottom:24px;'>
    <span style='display:inline-block; padding:4px 12px; border-radius:9999px; background-color:{signalColor}1A; color:{signalColor}; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em;'>
      {signal.SignalType.ToString().Replace("_", " ")}
    </span>
    <h1 style='margin:12px 0 4px; font-size:32px; font-weight:800; color:{TextColor};'>
      {signal.Stock.Ticker}
    </h1>
    <p style='margin:0 0 8px; color:{MutedText}; font-size:14px;'>{signal.Stock.Name}</p>
    <p style='margin:0; font-size:14px; color:{TextColor};'>
      <strong>Score: {Math.Round(signal.ScoreTotal)}/100</strong>
    </p>
  </div>

  <div style='background:{Background}; border:1px solid {Border}; border-radius:12px; padding:20px; margin-bottom:20px;'>
    <p style='margin:0 0 8px; font-size:11px; text-transform:uppercase; letter-spacing:0.05em; color:{MutedText}; font-weight:600;'>
      Why this alert fired
    </p>
    <p style='margin:0; color:{TextColor}; font-size:14px; line-height:1.5;'>
      {alertReason}
    </p>
  </div>

  <div style='display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:24px;'>
    {TradeLevel("Entry", signal.EntryLow.HasValue && signal.EntryHigh.HasValue ? $"${signal.EntryLow:F0}–${signal.EntryHigh:F0}" : "—", TextColor)}
    {TradeLevel("Target", signal.TargetLow.HasValue && signal.TargetHigh.HasValue ? $"${signal.TargetLow:F0}–${signal.TargetHigh:F0}" : "—", Gain)}
    {TradeLevel("Stop Loss", signal.StopLoss.HasValue ? $"${signal.StopLoss:F0}" : "—", Loss)}
  </div>

  <div style='text-align:center;'>
    <a href='https://fintrest.ai/stock/{signal.Stock.Ticker}' style='display:inline-block; background:{Brand}; color:white; padding:12px 28px; border-radius:12px; text-decoration:none; font-weight:600; font-size:14px;'>
      View Full Analysis →
    </a>
  </div>
</div>");

        sb.Append(Footer());
        return sb.ToString();
    }

    // ════════════════════════════════════════════════════════════════
    // WEEKLY NEWSLETTER — summary + top picks
    // ════════════════════════════════════════════════════════════════

    public static string WeeklyNewsletter(
        string userName,
        string marketSummary,
        List<Signal> weeklyPicks,
        DateTime weekOf)
    {
        var sb = new StringBuilder();
        sb.Append(Header($"Week of {weekOf:MMM d}"));

        sb.Append($@"
<div style='padding:28px 24px;'>
  <h2 style='margin:0 0 16px; font-size:20px; font-weight:700; color:{TextColor};'>
    📊 This Week in Markets
  </h2>
  <p style='margin:0 0 24px; color:{TextColor}; font-size:15px; line-height:1.6;'>
    {marketSummary}
  </p>

  <h2 style='margin:32px 0 16px; font-size:20px; font-weight:700; color:{TextColor};'>
    ⭐ Top Picks This Week
  </h2>
  <div style='margin-bottom:24px;'>");

        foreach (var sig in weeklyPicks.Take(5))
        {
            sb.Append($@"
    <div style='border:1px solid {Border}; border-radius:12px; padding:16px; margin-bottom:12px;'>
      <div style='display:flex; justify-content:space-between; align-items:center;'>
        <div>
          <a href='https://fintrest.ai/stock/{sig.Stock.Ticker}' style='color:{Brand}; text-decoration:none; font-weight:700; font-size:16px; font-family:Monaco,Courier,monospace;'>
            {sig.Stock.Ticker}
          </a>
          <p style='margin:2px 0 0; color:{MutedText}; font-size:12px;'>{sig.Stock.Name}</p>
        </div>
        <div style='text-align:right;'>
          <div style='font-size:24px; font-weight:800; color:{TextColor}; font-family:Monaco,Courier,monospace;'>
            {Math.Round(sig.ScoreTotal)}
          </div>
          <div style='font-size:10px; color:{MutedText}; text-transform:uppercase;'>Score</div>
        </div>
      </div>
      {(sig.Breakdown?.WhyNowSummary != null ? $@"
      <p style='margin:12px 0 0; color:{TextColor}; font-size:13px; line-height:1.5;'>
        {sig.Breakdown.WhyNowSummary}
      </p>" : "")}
    </div>");
        }

        sb.Append($@"
  </div>

  <div style='text-align:center; margin-top:32px;'>
    <a href='https://fintrest.ai/picks' style='display:inline-block; background:{Brand}; color:white; padding:12px 28px; border-radius:12px; text-decoration:none; font-weight:600; font-size:14px;'>
      See All Signals →
    </a>
  </div>
</div>");

        sb.Append(Footer());
        return sb.ToString();
    }

    // ════════════════════════════════════════════════════════════════
    // HELPERS
    // ════════════════════════════════════════════════════════════════

    private static string Header(string title) => $@"
<!DOCTYPE html>
<html>
<head>
  <meta charset='UTF-8'>
  <title>{title}</title>
</head>
<body style='margin:0; padding:20px; background:{Background}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;'>
  <div style='max-width:600px; margin:0 auto; background:white; border-radius:16px; overflow:hidden; box-shadow:0 4px 20px rgba(15,23,42,0.08);'>
    <div style='background:linear-gradient(135deg,{Brand},{Accent}); padding:24px; text-align:center;'>
      <div style='font-size:22px; font-weight:800; color:white; letter-spacing:-0.02em;'>fintrest.ai</div>
      <div style='font-size:11px; color:rgba(255,255,255,0.7); margin-top:4px; text-transform:uppercase; letter-spacing:0.1em;'>
        {title}
      </div>
    </div>";

    private static string Footer() => $@"
    <div style='padding:20px 24px; background:{Background}; border-top:1px solid {Border};'>
      <p style='margin:0 0 8px; font-size:11px; color:{MutedText}; text-align:center;'>
        <strong>Educational content only — not financial advice.</strong>
      </p>
      <p style='margin:0 0 12px; font-size:10px; color:{MutedText}; text-align:center; line-height:1.5;'>
        Past signal performance does not guarantee future results.
        Signals are generated by algorithms and AI, not personalized investment advice.
      </p>
      <p style='margin:0; font-size:10px; color:{MutedText}; text-align:center;'>
        <a href='https://fintrest.ai/settings' style='color:{MutedText}; text-decoration:underline;'>Manage preferences</a>
        &nbsp;·&nbsp;
        <a href='https://fintrest.ai/unsubscribe' style='color:{MutedText}; text-decoration:underline;'>Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>";

    private static string TradeLevel(string label, string value, string color) => $@"
    <div style='flex:1; background:{Background}; border:1px solid {Border}; border-radius:10px; padding:12px; text-align:center;'>
      <div style='font-size:10px; color:{MutedText}; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:4px;'>{label}</div>
      <div style='font-family:Monaco,Courier,monospace; font-weight:700; font-size:14px; color:{color};'>{value}</div>
    </div>";
}
