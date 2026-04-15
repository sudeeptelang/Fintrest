using Anthropic.SDK;
using Anthropic.SDK.Messaging;
using Fintrest.Api.Data;
using Fintrest.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Services.Scoring;

/// <summary>
/// Turns a news headline + ticker context into a 2-3 sentence Athena editorial take.
/// Cached forever on the news_items row (headlines don't change), so each article only
/// hits Claude once. Call pattern: user clicks news item → frontend GETs this → first
/// call generates and caches, subsequent calls return cached text in &lt;50ms.
/// </summary>
public class AthenaNewsService(
    AppDbContext db,
    IConfiguration config,
    ILogger<AthenaNewsService> logger)
{
    private readonly string _apiKey = config["AI:Anthropic:ApiKey"] ?? "";
    private readonly string _model = config["AI:Anthropic:Model"] ?? "claude-sonnet-4-20250514";

    private const string SystemPrompt = """
        You are Athena, Fintrest.ai's editorial voice. Turn a stock news headline
        into a 2-3 sentence take that helps a retail investor understand WHY it
        matters for the stock.

        COMPLIANCE — NON-NEGOTIABLE:
        - Do not tell the reader to buy, sell, or hold. Describe the setup / impact.
        - No dollar position sizes. No guarantees. No predictions of future price.
        - Educational context only.

        STYLE:
        - 2-3 sentences, tight and confident.
        - Tie the headline to the ticker's setup where possible (sector/catalyst/regime).
        - No markdown, no emoji, no preamble. Plain prose.
        - If the headline is ambiguous or very thin, say so briefly — don't manufacture analysis.
        """;

    public async Task<NewsItem?> GetOrGenerateAsync(long newsId, CancellationToken ct = default)
    {
        var item = await db.NewsItems
            .Include(n => n.Stock)
            .FirstOrDefaultAsync(n => n.Id == newsId, ct);
        if (item is null) return null;

        if (!string.IsNullOrWhiteSpace(item.AthenaSummary)) return item;

        if (string.IsNullOrEmpty(_apiKey))
        {
            logger.LogWarning("Athena API key missing — skipping news summary for {Id}", newsId);
            return item;
        }

        var userPrompt = BuildPrompt(item);

        try
        {
            var client = new AnthropicClient(new APIAuthentication(_apiKey));
            var request = new MessageParameters
            {
                Model = _model,
                MaxTokens = 180,
                System = [new SystemMessage(SystemPrompt)],
                Messages = [new Message(RoleType.User, userPrompt)],
            };

            var response = await client.Messages.GetClaudeMessageAsync(request, ct);
            var text = response.Message?.ToString()?.Trim() ?? "";
            if (string.IsNullOrWhiteSpace(text)) return item;

            item.AthenaSummary = text;
            item.AthenaSummaryAt = DateTime.UtcNow;

            db.LlmTraceLogs.Add(new LlmTraceLog
            {
                Model = _model,
                InputTokens = response.Usage?.InputTokens ?? 0,
                OutputTokens = response.Usage?.OutputTokens ?? 0,
                ExplanationType = "athena_news",
                CreatedAt = DateTime.UtcNow,
            });

            await db.SaveChangesAsync(ct);
            logger.LogInformation("Athena news summary cached for {Ticker} news {Id}",
                item.Stock?.Ticker ?? "?", newsId);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Athena news summary failed for news {Id}", newsId);
        }

        return item;
    }

    private static string BuildPrompt(NewsItem item)
    {
        var ticker = item.Stock?.Ticker ?? "?";
        var sector = item.Stock?.Sector ?? "unknown sector";
        var publishedAt = item.PublishedAt?.ToString("yyyy-MM-dd") ?? "recent";
        var sentimentLabel = item.SentimentScore switch
        {
            > 0.3 => "positive",
            < -0.3 => "negative",
            _ => "mixed/neutral"
        };
        var catalyst = string.IsNullOrEmpty(item.CatalystType) ? "" : $" · tagged as {item.CatalystType}";

        return $$"""
        TICKER: {{ticker}} ({{sector}})
        HEADLINE: "{{item.Headline}}"
        SOURCE: {{item.Source ?? "unknown"}}
        PUBLISHED: {{publishedAt}}
        SENTIMENT: {{sentimentLabel}}{{catalyst}}

        Give your 2-3 sentence Athena take.
        """;
    }
}
