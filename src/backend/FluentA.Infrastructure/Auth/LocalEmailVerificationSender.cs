using FluentA.Application.Common.Interfaces;
using Microsoft.Extensions.Logging;

namespace FluentA.Infrastructure.Auth;

public sealed class LocalEmailVerificationSender : IEmailVerificationSender
{
    private readonly ILogger<LocalEmailVerificationSender> _logger;

    public LocalEmailVerificationSender(ILogger<LocalEmailVerificationSender> logger)
    {
        _logger = logger;
    }

    public Task SendVerificationEmailAsync(EmailVerificationMessage message, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "Local email verification delivery accepted for {Email}. Use the registration response verification link in development.",
            message.ToEmail);
        return Task.CompletedTask;
    }
}
