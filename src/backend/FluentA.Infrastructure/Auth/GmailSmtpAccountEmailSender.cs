using System.Net;
using System.Net.Mail;
using FluentA.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;

namespace FluentA.Infrastructure.Auth;

public sealed class GmailSmtpAccountEmailSender : IAccountEmailSender
{
    private readonly IConfiguration _configuration;

    public GmailSmtpAccountEmailSender(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public async Task<VerificationOtpEmailDeliveryResult> SendVerificationOtpAsync(VerificationOtpEmailMessage message, CancellationToken cancellationToken = default)
    {
        var subject = "Your FluentA verification code";
        var bodyText =
            $"Hi {message.FullName},\n\n" +
            $"Your FluentA verification code is {message.Otp}.\n" +
            $"It expires at {message.ExpiresAtUtc:O}.\n\n" +
            "If you did not create a FluentA account, you can ignore this email.";
        var bodyHtml =
            $"<p>Hi {WebUtility.HtmlEncode(message.FullName)},</p>" +
            $"<p>Your FluentA verification code is <strong>{WebUtility.HtmlEncode(message.Otp)}</strong>.</p>" +
            $"<p>It expires at {WebUtility.HtmlEncode(message.ExpiresAtUtc.ToString("O"))}.</p>" +
            "<p>If you did not create a FluentA account, you can ignore this email.</p>";

        await SendAsync(message.ToEmail, subject, bodyText, bodyHtml, cancellationToken);
        return new VerificationOtpEmailDeliveryResult();
    }

    public async Task<PasswordResetEmailDeliveryResult> SendPasswordResetAsync(PasswordResetEmailMessage message, CancellationToken cancellationToken = default)
    {
        var resetUrl = AbsoluteUrl(message.ResetUrl);
        var subject = "Reset your FluentA password";
        var bodyText =
            $"Hi {message.FullName},\n\n" +
            $"Open this link to reset your FluentA password:\n{resetUrl}\n\n" +
            $"The link expires at {message.ExpiresAtUtc:O}.\n\n" +
            "If you did not request this reset, you can ignore this email.";
        var bodyHtml =
            $"<p>Hi {WebUtility.HtmlEncode(message.FullName)},</p>" +
            "<p>Open this link to reset your FluentA password:</p>" +
            $"<p><a href=\"{WebUtility.HtmlEncode(resetUrl)}\">Reset password</a></p>" +
            $"<p>The link expires at {WebUtility.HtmlEncode(message.ExpiresAtUtc.ToString("O"))}.</p>" +
            "<p>If you did not request this reset, you can ignore this email.</p>";

        await SendAsync(message.ToEmail, subject, bodyText, bodyHtml, cancellationToken);
        return new PasswordResetEmailDeliveryResult();
    }

    private async Task SendAsync(string toEmail, string subject, string bodyText, string bodyHtml, CancellationToken cancellationToken)
    {
        var host = _configuration["Authentication:Email:Smtp:Host"] ?? "smtp.gmail.com";
        var port = int.TryParse(_configuration["Authentication:Email:Smtp:Port"], out var parsedPort) ? parsedPort : 587;
        var username = _configuration["Authentication:Email:Smtp:Username"];
        var password = _configuration["Authentication:Email:Smtp:Password"];
        var fromAddress = _configuration["Authentication:Email:FromAddress"];
        var fromName = _configuration["Authentication:Email:FromName"] ?? "FluentA";
        var enableSsl = !string.Equals(_configuration["Authentication:Email:Smtp:EnableSsl"], "false", StringComparison.OrdinalIgnoreCase);

        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password) || string.IsNullOrWhiteSpace(fromAddress))
        {
            throw new InvalidOperationException("Gmail SMTP delivery requires Authentication:Email:Smtp credentials and Authentication:Email:FromAddress.");
        }

        using var client = new SmtpClient(host, port)
        {
            EnableSsl = enableSsl,
            Credentials = new NetworkCredential(username, password)
        };

        using var mail = new MailMessage
        {
            From = new MailAddress(fromAddress, fromName),
            Subject = subject,
            Body = bodyHtml,
            IsBodyHtml = true
        };
        mail.To.Add(toEmail);
        mail.AlternateViews.Add(AlternateView.CreateAlternateViewFromString(bodyText, null, "text/plain"));

        await client.SendMailAsync(mail, cancellationToken);
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
