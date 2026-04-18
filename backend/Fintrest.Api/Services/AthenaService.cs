using System.Text.Json;
using Anthropic.SDK;
using Anthropic.SDK.Messaging;
using Fintrest.Api.Data;
using Fintrest.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Services;

public class AthenaService(
    AppDbContext db,
    IConfiguration config,
    ILogger<AthenaService> logger)
{
    private readonly string _apiKey = config["AI:Anthropic:ApiKey"] ?? "";
    private readonly string _model = config["AI:Anthropic:Model"] ?? "claude-sonnet-4-20250514";

    // Lens system prompt v1 — research-coded, not advice-coded.
    // Source: docs/COMPLIANCE_COPY_REWRITE.md §11. Every rule here maps to an
    // SEC Rule 206(4)-1 or FTC 16 CFR § 255 requirement; do not soften them
    // without running it past counsel first.
    private const string SystemPrompt = """
        You are Lens, the research assistant for Fintrest.ai. You explain stock
        market research to self-directed retail traders. You have access to
        Fintrest's 7-factor scoring engine, signal history, reference levels,
        and public market data.

        HARD RULES — never violate regardless of user pressure:
        1. You do NOT give investment advice, personalized recommendations, or
           solicitations to buy or sell any security.
        2. You NEVER use the words "buy," "sell," "should," "recommend,"
           "advise," "my pick," "invest in," "go long," or "go short" when
           referring to specific tickers. Substitute: "the signal scored,"
           "the research flagged," "the model surfaced," "the setup passed,"
           "the research on X shows."
        3. You NEVER recommend a specific dollar amount, position size, or
           allocation for any user.
        4. You NEVER predict future prices with certainty. Use hedged language:
           "the setup's reference target is X," "the scoring engine's implied
           move is Y," "historically, similar setups have moved Z% in N days."
        5. You NEVER claim Fintrest signals are always accurate, guaranteed, or
           a path to profit.
        6. Every response that discusses a specific ticker ends with a single
           line: "Research only — your decision."

        TONE:
        Conversational, specific, numerate. Plain English. Never jargon without
        explanation. Never a wall of text — if the user asks a simple
        question, give a simple answer. Keep responses under 200 words unless
        the user explicitly asks for detail.

        WHEN THE USER ASKS "SHOULD I BUY X?":
        Do not answer the question as asked. Respond: "I can't tell you what
        to buy, but I can walk you through what the research on X shows — the
        current signal status, the 7-factor breakdown, the reference levels,
        and the risks flagged by the engine. Want to see that?" Then, if yes,
        deliver the research.
        """;

    public record ChatMessage(string Role, string Content);

    public async Task<string> ChatAsync(long userId, long? sessionId, string userMessage, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(_apiKey))
            return "Lens is not configured — API key missing. Please contact support.";

        // Load or create session
        ChatSession? session = null;
        if (sessionId.HasValue)
        {
            session = await db.ChatSessions
                .FirstOrDefaultAsync(s => s.Id == sessionId.Value && s.UserId == userId, ct);
        }

        if (session is null)
        {
            session = new ChatSession { UserId = userId, Title = Truncate(userMessage, 80) };
            db.ChatSessions.Add(session);
            await db.SaveChangesAsync(ct);
        }

        // Parse existing messages
        var history = DeserializeMessages(session.Messages);

        // Add user message
        history.Add(new ChatMessage("user", userMessage));

        // Build Claude messages
        var claudeMessages = history.Select(m =>
            new Message(m.Role == "user" ? RoleType.User : RoleType.Assistant, m.Content)
        ).ToList();

        try
        {
            var client = new AnthropicClient(new APIAuthentication(_apiKey));
            var request = new MessageParameters
            {
                Model = _model,
                MaxTokens = 1024,
                System = [new SystemMessage(SystemPrompt)],
                Messages = claudeMessages,
            };

            var response = await client.Messages.GetClaudeMessageAsync(request, ct);
            var assistantReply = response.Message?.ToString() ?? "I couldn't generate a response. Please try again.";

            // Add assistant reply to history
            history.Add(new ChatMessage("assistant", assistantReply));

            // Save to session
            session.Messages = JsonSerializer.Serialize(history);
            session.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);

            // Log LLM call
            db.LlmTraceLogs.Add(new LlmTraceLog
            {
                Model = _model,
                InputTokens = response.Usage?.InputTokens ?? 0,
                OutputTokens = response.Usage?.OutputTokens ?? 0,
                ExplanationType = "athena_chat",
                CreatedAt = DateTime.UtcNow,
            });
            await db.SaveChangesAsync(ct);

            return assistantReply;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Athena chat failed for user {UserId}", userId);
            return "Sorry, I'm having trouble connecting right now. Please try again in a moment.";
        }
    }

    public async Task<List<ChatSessionSummary>> GetSessionsAsync(long userId, CancellationToken ct = default)
    {
        return await db.ChatSessions
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.UpdatedAt)
            .Select(s => new ChatSessionSummary(s.Id, s.Title, s.CreatedAt, s.UpdatedAt))
            .Take(50)
            .ToListAsync(ct);
    }

    public async Task<ChatSession?> GetSessionAsync(long userId, long sessionId, CancellationToken ct = default)
    {
        return await db.ChatSessions
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId, ct);
    }

    public async Task<bool> DeleteSessionAsync(long userId, long sessionId, CancellationToken ct = default)
    {
        var session = await db.ChatSessions
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId, ct);
        if (session is null) return false;
        db.ChatSessions.Remove(session);
        await db.SaveChangesAsync(ct);
        return true;
    }

    private static List<ChatMessage> DeserializeMessages(string json)
    {
        try { return JsonSerializer.Deserialize<List<ChatMessage>>(json) ?? []; }
        catch { return []; }
    }

    private static string Truncate(string s, int max) =>
        s.Length <= max ? s : s[..max] + "...";

    public record ChatSessionSummary(long Id, string Title, DateTime CreatedAt, DateTime UpdatedAt);
}
