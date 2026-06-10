namespace FluentA.Application.Common.Interfaces;

public sealed record EmailVerificationMessage(
    string ToEmail,
    string FullName,
    string VerificationUrl);

public interface IEmailVerificationSender
{
    Task SendVerificationEmailAsync(EmailVerificationMessage message, CancellationToken cancellationToken = default);
}
