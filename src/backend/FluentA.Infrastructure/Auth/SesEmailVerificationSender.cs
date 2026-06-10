using Amazon.SimpleEmailV2;
using Amazon.SimpleEmailV2.Model;
using FluentA.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;

namespace FluentA.Infrastructure.Auth;

public sealed class SesEmailVerificationSender : IEmailVerificationSender
{
    private readonly IAmazonSimpleEmailServiceV2 _ses;
    private readonly IConfiguration _configuration;

    public SesEmailVerificationSender(IAmazonSimpleEmailServiceV2 ses, IConfiguration configuration)
    {
        _ses = ses;
        _configuration = configuration;
    }

    public async Task SendVerificationEmailAsync(EmailVerificationMessage message, CancellationToken cancellationToken = default)
    {
        var fromAddress = _configuration["Authentication:Email:FromAddress"];
        if (string.IsNullOrWhiteSpace(fromAddress))
        {
            throw new InvalidOperationException("Authentication:Email:FromAddress must be configured when SES email delivery is enabled.");
        }

        var fromName = _configuration["Authentication:Email:FromName"] ?? "FluentA";
        var verificationUrl = AbsoluteVerificationUrl(message.VerificationUrl);

        await _ses.SendEmailAsync(new SendEmailRequest
        {
            FromEmailAddress = $"{fromName} <{fromAddress}>",
            Destination = new Destination
            {
                ToAddresses = [message.ToEmail]
            },
            Content = new EmailContent
            {
                Simple = new Message
                {
                    Subject = new Content
                    {
                        Data = "Verify your FluentA email"
                    },
                    Body = new Body
                    {
                        Text = new Content
                        {
                            Data = $"Hi {message.FullName},\n\nVerify your FluentA account by opening this link:\n{verificationUrl}\n\nIf you did not create a FluentA account, you can ignore this email."
                        },
                        Html = new Content
                        {
                            Data = $"""
                                <p>Hi {System.Net.WebUtility.HtmlEncode(message.FullName)},</p>
                                <p>Verify your FluentA account by opening this link:</p>
                                <p><a href="{System.Net.WebUtility.HtmlEncode(verificationUrl)}">Verify email</a></p>
                                <p>If you did not create a FluentA account, you can ignore this email.</p>
                                """
                        }
                    }
                }
            }
        }, cancellationToken);
    }

    private string AbsoluteVerificationUrl(string verificationUrl)
    {
        if (Uri.TryCreate(verificationUrl, UriKind.Absolute, out var absolute))
        {
            return absolute.ToString();
        }

        var baseUrl = _configuration["Authentication:Email:VerificationBaseUrl"]
            ?? _configuration["Frontend:BaseUrl"]
            ?? "http://localhost:5173";
        return new Uri(new Uri(baseUrl.TrimEnd('/') + "/"), verificationUrl.TrimStart('/')).ToString();
    }
}
