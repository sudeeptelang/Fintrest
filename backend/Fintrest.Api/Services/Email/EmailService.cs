using Azure;
using Azure.Communication.Email;

namespace Fintrest.Api.Services.Email;

/// <summary>
/// Wraps Azure Communication Services (ACS) Email for transactional + marketing emails.
/// Gracefully no-ops when the connection string is missing (dev).
/// </summary>
public class EmailService
{
    private readonly ILogger<EmailService> _logger;
    private readonly EmailClient? _client;
    private readonly string _fromEmail;
    private readonly string _fromName;
    private readonly string? _replyTo;

    public EmailService(IConfiguration config, ILogger<EmailService> logger)
    {
        _logger = logger;
        _fromEmail = config["Acs:Email:FromEmail"] ?? "";
        _fromName = config["Acs:Email:FromName"] ?? "Fintrest Signals";
        _replyTo = config["Acs:Email:ReplyTo"];

        var connectionString = config["Acs:ConnectionString"];

        if (string.IsNullOrEmpty(connectionString) || string.IsNullOrEmpty(_fromEmail))
        {
            _logger.LogWarning("Azure ACS not configured — EmailService will log-only (no emails sent)");
            _client = null;
        }
        else
        {
            _client = new EmailClient(connectionString);
        }
    }

    public bool IsConfigured => _client is not null;

    /// <summary>Send a transactional email. No-ops if ACS config missing.</summary>
    public async Task<SendResult> SendAsync(
        string toEmail,
        string subject,
        string htmlBody,
        string? textBody = null,
        CancellationToken ct = default)
    {
        if (_client is null)
        {
            _logger.LogInformation(
                "[EMAIL STUB] To={To} Subject=\"{Subject}\" (ACS not configured — would have sent)",
                toEmail, subject);
            return new SendResult(false, null, "ACS Email not configured");
        }

        try
        {
            var content = new EmailContent(subject)
            {
                Html = htmlBody,
                PlainText = textBody ?? StripHtml(htmlBody),
            };

            var recipients = new EmailRecipients([new EmailAddress(toEmail)]);

            // ACS requires a bare email address for senderAddress. Display name is
            // configured on the MailFrom address itself in the Azure portal.
            var message = new EmailMessage(
                senderAddress: _fromEmail,
                content: content,
                recipients: recipients);

            if (!string.IsNullOrEmpty(_replyTo))
            {
                message.ReplyTo.Add(new EmailAddress(_replyTo));
            }

            var operation = await _client.SendAsync(
                wait: WaitUntil.Completed,
                message: message,
                cancellationToken: ct);

            var messageId = operation.Id;
            _logger.LogInformation("Email sent to {To} — MessageId={MessageId}", toEmail, messageId);
            return new SendResult(true, messageId, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {To}", toEmail);
            return new SendResult(false, null, ex.Message);
        }
    }

    /// <summary>Bulk send — iterates with single-send. ACS supports multi-recipient per message,
    /// but per-user personalization requires distinct calls.</summary>
    public async Task<BulkResult> SendBulkAsync(
        IEnumerable<(string email, string subject, string html)> messages,
        CancellationToken ct = default)
    {
        int sent = 0, failed = 0;
        foreach (var (email, subject, html) in messages)
        {
            var result = await SendAsync(email, subject, html, null, ct);
            if (result.Success) sent++;
            else failed++;
        }
        return new BulkResult(sent, failed);
    }

    private static string StripHtml(string html) =>
        System.Text.RegularExpressions.Regex.Replace(html, "<[^>]+>", " ")
            .Replace("&nbsp;", " ")
            .Replace("&amp;", "&")
            .Trim();
}

public record SendResult(bool Success, string? MessageId, string? Error);
public record BulkResult(int Sent, int Failed);
