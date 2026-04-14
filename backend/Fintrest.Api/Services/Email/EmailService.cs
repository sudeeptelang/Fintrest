using Amazon;
using Amazon.Runtime;
using Amazon.SimpleEmailV2;
using Amazon.SimpleEmailV2.Model;

namespace Fintrest.Api.Services.Email;

/// <summary>
/// Wraps AWS SES for transactional + marketing emails.
/// Gracefully no-ops when credentials are missing (dev).
/// </summary>
public class EmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _logger;
    private readonly AmazonSimpleEmailServiceV2Client? _client;
    private readonly string _fromEmail;
    private readonly string _fromName;
    private readonly string? _replyTo;

    public EmailService(IConfiguration config, ILogger<EmailService> logger)
    {
        _config = config;
        _logger = logger;
        _fromEmail = config["Aws:Ses:FromEmail"] ?? "signals@fintrest.ai";
        _fromName = config["Aws:Ses:FromName"] ?? "Fintrest Signals";
        _replyTo = config["Aws:Ses:ReplyTo"];

        var accessKey = config["Aws:AccessKey"];
        var secretKey = config["Aws:SecretKey"];
        var regionName = config["Aws:Region"] ?? "us-east-1";

        if (string.IsNullOrEmpty(accessKey) || string.IsNullOrEmpty(secretKey))
        {
            _logger.LogWarning("AWS credentials not configured — EmailService will log-only (no emails sent)");
            _client = null;
        }
        else
        {
            var credentials = new BasicAWSCredentials(accessKey, secretKey);
            _client = new AmazonSimpleEmailServiceV2Client(
                credentials, RegionEndpoint.GetBySystemName(regionName));
        }
    }

    public bool IsConfigured => _client is not null;

    /// <summary>Send a transactional email. No-ops if AWS creds missing.</summary>
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
                "[EMAIL STUB] To={To} Subject=\"{Subject}\" (AWS SES not configured — would have sent)",
                toEmail, subject);
            return new SendResult(false, null, "AWS SES not configured");
        }

        try
        {
            var request = new SendEmailRequest
            {
                FromEmailAddress = $"{_fromName} <{_fromEmail}>",
                Destination = new Destination { ToAddresses = [toEmail] },
                Content = new EmailContent
                {
                    Simple = new Message
                    {
                        Subject = new Content { Data = subject, Charset = "UTF-8" },
                        Body = new Body
                        {
                            Html = new Content { Data = htmlBody, Charset = "UTF-8" },
                            Text = new Content
                            {
                                Data = textBody ?? StripHtml(htmlBody),
                                Charset = "UTF-8"
                            },
                        },
                    },
                },
                ReplyToAddresses = _replyTo is null ? null : [_replyTo],
            };

            var response = await _client.SendEmailAsync(request, ct);
            _logger.LogInformation("Email sent to {To} — MessageId={MessageId}", toEmail, response.MessageId);
            return new SendResult(true, response.MessageId, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {To}", toEmail);
            return new SendResult(false, null, ex.Message);
        }
    }

    /// <summary>Bulk send (up to 50 per call per SES limits). Iterates with single-send for simplicity.</summary>
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
