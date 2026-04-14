using Fintrest.Api.Data;
using Fintrest.Api.Models;
using Fintrest.Api.Services.Email;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Controllers;

/// <summary>
/// Admin-only endpoints for previewing and sending emails.
/// Not auth-gated in dev so the team can test templates quickly.
/// </summary>
[ApiController]
[Route("api/v1/email")]
public class EmailController(AppDbContext db, EmailService emailService) : ControllerBase
{
    [HttpGet("status")]
    public IActionResult Status() => Ok(new
    {
        configured = emailService.IsConfigured,
        message = emailService.IsConfigured
            ? "AWS SES is wired. Emails will be sent to real recipients."
            : "AWS credentials missing — emails log only, none sent. Set Aws:AccessKey and Aws:SecretKey in appsettings.",
    });

    /// <summary>Preview the morning briefing template in your browser (HTML only).</summary>
    [HttpGet("preview/briefing")]
    public async Task<IActionResult> PreviewBriefing()
    {
        var signals = await LoadTopSignalsAsync(10);
        if (signals.Count == 0) return NotFound(new { message = "No signals in DB yet. Run /seed/scan first." });

        var html = EmailTemplates.MorningBriefing("Alex", signals, signals[0].CreatedAt);
        return Content(html, "text/html");
    }

    /// <summary>Preview a signal alert email.</summary>
    [HttpGet("preview/alert/{ticker}")]
    public async Task<IActionResult> PreviewAlert(string ticker)
    {
        var signal = await db.Signals
            .Include(s => s.Stock)
            .Include(s => s.Breakdown)
            .Where(s => s.Stock.Ticker.ToUpper() == ticker.ToUpper())
            .OrderByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync();

        if (signal is null) return NotFound(new { message = $"No signal for {ticker}" });

        var html = EmailTemplates.SignalAlert(
            "Alex", signal,
            signal.Breakdown?.WhyNowSummary ?? "Your custom alert conditions triggered.");
        return Content(html, "text/html");
    }

    /// <summary>Preview the weekly newsletter.</summary>
    [HttpGet("preview/newsletter")]
    public async Task<IActionResult> PreviewNewsletter()
    {
        var signals = await LoadTopSignalsAsync(5);
        var summary = "Markets closed mixed this week with the S&P 500 flat as investors " +
                      "digested earnings from the tech sector. Financials led gains while " +
                      "energy lagged on falling oil prices. Our algorithm flagged strong " +
                      "momentum in AI names including NVDA and GOOGL.";

        var html = EmailTemplates.WeeklyNewsletter("Alex", summary, signals, DateTime.UtcNow);
        return Content(html, "text/html");
    }

    /// <summary>Send a test email to yourself. POST with ?to=you@domain.com</summary>
    [HttpPost("test")]
    public async Task<IActionResult> SendTest(
        [FromQuery] string to,
        [FromQuery] string template = "briefing",
        CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(to))
            return BadRequest(new { message = "Provide ?to=email@address" });

        var signals = await LoadTopSignalsAsync(10);
        if (signals.Count == 0)
            return BadRequest(new { message = "No signals in DB — run /seed/scan first" });

        (string subject, string html) = template.ToLowerInvariant() switch
        {
            "briefing" or "morning" => (
                $"Your Morning Signals — {DateTime.UtcNow:MMM d}",
                EmailTemplates.MorningBriefing("there", signals, signals[0].CreatedAt)),
            "alert" => (
                $"Signal Alert: {signals[0].Stock.Ticker}",
                EmailTemplates.SignalAlert("there", signals[0], signals[0].Breakdown?.WhyNowSummary ?? "New signal.")),
            "newsletter" or "weekly" => (
                $"Week of {DateTime.UtcNow:MMM d} — Fintrest Weekly",
                EmailTemplates.WeeklyNewsletter("there",
                    "Markets this week: mixed action with tech leading. Our algorithm flagged strong momentum in AI names.",
                    signals, DateTime.UtcNow)),
            _ => ("Fintrest Test", "<p>Test email from fintrest.ai — templates working.</p>"),
        };

        var result = await emailService.SendAsync(to, subject, html, null, ct);

        return Ok(new
        {
            configured = emailService.IsConfigured,
            template,
            to,
            subject,
            success = result.Success,
            messageId = result.MessageId,
            error = result.Error,
        });
    }

    private async Task<List<Signal>> LoadTopSignalsAsync(int limit)
    {
        var latestScan = await db.ScanRuns
            .Where(s => s.Status == "COMPLETED")
            .OrderByDescending(s => s.CompletedAt)
            .FirstOrDefaultAsync();

        if (latestScan is null) return [];

        return await db.Signals
            .Include(s => s.Stock)
            .Include(s => s.Breakdown)
            .Where(s => s.ScanRunId == latestScan.Id)
            .OrderByDescending(s => s.ScoreTotal)
            .Take(limit)
            .ToListAsync();
    }
}
