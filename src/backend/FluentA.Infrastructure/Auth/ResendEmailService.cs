using FluentA.Application.BoundedContexts.Auth;
using Microsoft.Extensions.Logging;
using Resend;
using AppEmailMessage = FluentA.Application.BoundedContexts.Auth.DTOs.EmailMessage;

namespace FluentA.Infrastructure.Auth;

public sealed class ResendEmailService : IEmailService
{
    private readonly IResend _resend;
    private readonly AuthSecurityOptions _options;
    private readonly ILogger<ResendEmailService> _logger;

    public ResendEmailService(IResend resend, AuthSecurityOptions options, ILogger<ResendEmailService> logger)
    {
        _resend = resend;
        _options = options;
        _logger = logger;
    }

    public async Task<bool> SendEmailAsync(AppEmailMessage message, CancellationToken cancellationToken = default)
    {
        try
        {
            var email = new Resend.EmailMessage
            {
                From = _options.ResendFrom,
                Subject = message.Subject,
                HtmlBody = message.HtmlBody,
                TextBody = message.TextBody
            };
            email.To.Add(message.To);
            await _resend.EmailSendAsync(email, cancellationToken);
            return true;
        }
        catch (Exception exception) when (exception is not OperationCanceledException || !cancellationToken.IsCancellationRequested)
        {
            // Provider exceptions can echo the request payload, including the
            // recipient or reset URL. Keep the log diagnosable without attaching
            // exception details that may contain authentication data.
            _logger.LogError(
                "Resend email delivery failed for an authentication message. Failure type: {FailureType}.",
                exception.GetType().Name);
            return false;
        }
    }
}
