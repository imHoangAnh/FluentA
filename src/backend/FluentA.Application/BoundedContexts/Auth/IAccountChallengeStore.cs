namespace FluentA.Application.BoundedContexts.Auth;

public interface IAccountChallengeStore
{
    Task<VerificationChallengeIssue> IssueVerificationAsync(Guid userId, string email, CancellationToken cancellationToken = default);
    Task<VerificationChallengeResendResult> ResendVerificationAsync(Guid userId, string email, CancellationToken cancellationToken = default);
    Task<VerificationChallengeVerifyResult> VerifyVerificationOtpAsync(string email, string otp, CancellationToken cancellationToken = default);
    Task<PasswordResetChallengeIssue> IssuePasswordResetAsync(Guid userId, string email, CancellationToken cancellationToken = default);
    Task<PasswordResetChallengeConsumeResult> ConsumePasswordResetAsync(string token, CancellationToken cancellationToken = default);
}

public sealed record VerificationChallengeIssue(string Otp, DateTime ExpiresAtUtc, DateTime ResendAvailableAtUtc);

public sealed record VerificationChallengeResendResult(
    bool IsSuccess,
    DateTime ExpiresAtUtc,
    DateTime ResendAvailableAtUtc,
    string? Otp = null);

public enum VerificationChallengeVerifyStatus
{
    Verified,
    InvalidOrExpired
}

public sealed record VerificationChallengeVerifyResult(VerificationChallengeVerifyStatus Status);

public sealed record PasswordResetChallengeIssue(string Token, DateTime ExpiresAtUtc);

public enum PasswordResetChallengeConsumeStatus
{
    Consumed,
    InvalidOrExpired
}

public sealed record PasswordResetChallengeConsumeResult(PasswordResetChallengeConsumeStatus Status, Guid? UserId = null);
