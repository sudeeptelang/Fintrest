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

    private const string SystemPrompt = """
        You are Athena, an AI market assistant for Fintrest.ai.
        You explain stocks, signals, and market concepts clearly and concisely.
        You are knowledgeable about technical analysis, fundamental analysis, and market dynamics.

        Rules you MUST follow:
        - Never give personalized financial advice ("you should buy/sell X")
        - Never recommend specific dollar amounts to invest
        - Never predict future prices with certainty
        - Never claim signals are always accurate
        - Always frame insights as educational context
        - End any response that discusses specific securities with: "Educational context only — not financial advice."
        - Keep responses concise (under 200 words unless the user asks for detail)
        - Use plain English, avoid jargon unless explaining it
        """;

    public record ChatMessage(string Role, string Content);

    public async Task<string> ChatAsync(long userId, long? sessionId, string userMessage, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(_apiKey))
            return "Athena is not configured — API key missing. Please contact support.";

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
