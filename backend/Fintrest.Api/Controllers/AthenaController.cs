using System.Text.Json;
using Fintrest.Api.Core;
using Fintrest.Api.Data;
using Fintrest.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Fintrest.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/athena")]
public class AthenaController(AppDbContext db, AthenaService athena) : ControllerBase
{
    private async Task<long> GetUserId()
    {
        var id = await User.ResolveUserId(db);
        return id ?? throw new UnauthorizedAccessException();
    }

    /// <summary>Send a message to Athena and get a response.</summary>
    [HttpPost("chat")]
    public async Task<IActionResult> Chat([FromBody] AthenaChatRequest request, CancellationToken ct)
    {
        var userId = await GetUserId();
        var reply = await athena.ChatAsync(userId, request.SessionId, request.Message, ct);
        return Ok(new { reply, sessionId = request.SessionId });
    }

    /// <summary>List chat sessions for the authenticated user.</summary>
    [HttpGet("sessions")]
    public async Task<IActionResult> ListSessions(CancellationToken ct)
    {
        var userId = await GetUserId();
        var sessions = await athena.GetSessionsAsync(userId, ct);
        return Ok(sessions);
    }

    /// <summary>Get a single chat session with messages.</summary>
    [HttpGet("sessions/{id}")]
    public async Task<IActionResult> GetSession(long id, CancellationToken ct)
    {
        var userId = await GetUserId();
        var session = await athena.GetSessionAsync(userId, id, ct);
        if (session is null) return NotFound();

        var messages = JsonSerializer.Deserialize<List<object>>(session.Messages) ?? [];
        return Ok(new { session.Id, session.Title, messages, session.CreatedAt, session.UpdatedAt });
    }

    /// <summary>Delete a chat session.</summary>
    [HttpDelete("sessions/{id}")]
    public async Task<IActionResult> DeleteSession(long id, CancellationToken ct)
    {
        var userId = await GetUserId();
        var deleted = await athena.DeleteSessionAsync(userId, id, ct);
        return deleted ? NoContent() : NotFound();
    }
}

public record AthenaChatRequest(string Message, long? SessionId = null);
