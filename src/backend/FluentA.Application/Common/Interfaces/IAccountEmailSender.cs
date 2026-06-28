namespace FluentA.Application.Common.Interfaces;

public sealed record VerificationOtpEmailMessage(
    string ToEmail,
    string FullName,
    string Otp,
    DateTime ExpiresAtUtc);

public sealed record PasswordResetEmailMessage(
    string ToEmail,
    string FullName,
    string ResetUrl,
    DateTime ExpiresAtUtc);

public sealed record VerificationOtpEmailDeliveryResult(string? DevelopmentOtp = null);

public sealed record PasswordResetEmailDeliveryResult(string? DevelopmentResetUrl = null);

public interface IAccountEmailSender
{
    Task<VerificationOtpEmailDeliveryResult> SendVerificationOtpAsync(VerificationOtpEmailMessage message, CancellationToken cancellationToken = default);
    Task<PasswordResetEmailDeliveryResult> SendPasswordResetAsync(PasswordResetEmailMessage message, CancellationToken cancellationToken = default);
}
