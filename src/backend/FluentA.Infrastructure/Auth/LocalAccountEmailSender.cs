using FluentA.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace FluentA.Infrastructure.Auth;

public sealed class LocalAccountEmailSender : IAccountEmailSender
{
    private readonly ILogger<LocalAccountEmailSender> _logger;
    private readonly IConfiguration _configuration;

    public LocalAccountEmailSender(ILogger<LocalAccountEmailSender> logger, IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
    }

    public Task<VerificationOtpEmailDeliveryResult> SendVerificationOtpAsync(VerificationOtpEmailMessage message, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "Local verification email accepted for {Email}. Use the deterministic development OTP boundary instead of email logs.",
            message.ToEmail);
        return Task.FromResult(new VerificationOtpEmailDeliveryResult(message.Otp));
    }

    public Task<PasswordResetEmailDeliveryResult> SendPasswordResetAsync(PasswordResetEmailMessage message, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "Local password-reset email accepted for {Email}. Use the deterministic development reset URL boundary instead of email logs.",
            message.ToEmail);
        return Task.FromResult(new PasswordResetEmailDeliveryResult(AbsoluteUrl(message.ResetUrl)));
    }

    private string AbsoluteUrl(string relativeOrAbsoluteUrl)
    {
        if (Uri.TryCreate(relativeOrAbsoluteUrl, UriKind.Absolute, out var absolute))
        {
            return absolute.ToString();
        }

        var baseUrl = _configuration["Authentication:Email:BaseUrl"]
            ?? _configuration["Frontend:BaseUrl"]
            ?? "http://localhost:5173";

        return new Uri(new Uri(baseUrl.TrimEnd('/') + "/"), relativeOrAbsoluteUrl.TrimStart('/')).ToString();
    }
}
