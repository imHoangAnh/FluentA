using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Auth.Entities;

public sealed class User : BaseEntity, IAggregateRoot
{
    private User()
    {
        Email = string.Empty;
        FullName = string.Empty;
        Bio = string.Empty;
    }

    private User(string email, string fullName, string? passwordHash, string? googleId, DateTime? emailVerifiedAt)
    {
        Email = NormalizeEmail(email);
        FullName = fullName.Trim();
        Bio = string.Empty;
        PasswordHash = passwordHash;
        GoogleId = googleId;
        EmailVerifiedAt = emailVerifiedAt;
    }

    public string Email { get; private set; }
    public string FullName { get; private set; }
    public string Bio { get; private set; }
    public Guid? CurrentAvatarAssetId { get; private set; }
    public string? PasswordHash { get; private set; }
    public string? GoogleId { get; private set; }
    public DateTime? EmailVerifiedAt { get; private set; }
    public string? OtpCode { get; private set; }
    public DateTime? OtpExpiresAt { get; private set; }
    public int OtpFailedAttempts { get; private set; }
    public DateTime? OtpResendAvailableAt { get; private set; }
    public string? ResetPasswordToken { get; private set; }
    public DateTime? ResetPasswordExpiresAt { get; private set; }
    public DateTime? LastLoginAt { get; private set; }
    public bool IsEmailVerified => EmailVerifiedAt.HasValue;

    public static User CreateWithPassword(string email, string fullName, string passwordHash)
    {
        if (string.IsNullOrWhiteSpace(passwordHash))
        {
            throw new ArgumentException("Password hash is required.", nameof(passwordHash));
        }

        return new User(email, fullName, passwordHash, googleId: null, emailVerifiedAt: null);
    }

    public static User CreateWithGoogle(string email, string fullName, string googleId, DateTime verifiedAt)
    {
        if (string.IsNullOrWhiteSpace(googleId))
        {
            throw new ArgumentException("Google id is required.", nameof(googleId));
        }

        return new User(email, fullName, passwordHash: null, googleId, verifiedAt);
    }

    public void IssueVerificationOtp(string otpHash, DateTime expiresAt, DateTime resendAvailableAt)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(otpHash);
        OtpCode = otpHash;
        OtpExpiresAt = expiresAt;
        OtpFailedAttempts = 0;
        OtpResendAvailableAt = resendAvailableAt;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkEmailVerified(DateTime verifiedAt)
    {
        EmailVerifiedAt = verifiedAt;
        ClearVerificationOtp();
        UpdatedAt = verifiedAt;
    }

    public void IssuePasswordReset(string tokenHash, DateTime expiresAt)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(tokenHash);
        ResetPasswordToken = tokenHash;
        ResetPasswordExpiresAt = expiresAt;
        UpdatedAt = DateTime.UtcNow;
    }

    public void ClearPasswordReset()
    {
        ResetPasswordToken = null;
        ResetPasswordExpiresAt = null;
        UpdatedAt = DateTime.UtcNow;
    }

    public void RecordLogin(DateTime loggedInAt)
    {
        LastLoginAt = loggedInAt;
        UpdatedAt = loggedInAt;
    }

    public void UpdatePassword(string passwordHash)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(passwordHash);
        PasswordHash = passwordHash;
        ClearPasswordReset();
    }

    public void LinkGoogleAccount(string googleId, DateTime verifiedAt)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(googleId);
        if (GoogleId is not null && !string.Equals(GoogleId, googleId, StringComparison.Ordinal))
        {
            throw new InvalidOperationException("This user is already linked to a different Google account.");
        }

        GoogleId = googleId;
        EmailVerifiedAt = verifiedAt;
        ClearVerificationOtp();
        UpdatedAt = verifiedAt;
    }

    public void UpdateProfile(string fullName, string? bio, Guid? currentAvatarAssetId = null)
    {
        if (string.IsNullOrWhiteSpace(fullName))
        {
            throw new ArgumentException("Full name is required.", nameof(fullName));
        }

        var normalizedName = fullName.Trim();
        if (normalizedName.Length is < 2 or > 100)
        {
            throw new ArgumentOutOfRangeException(nameof(fullName), "Full name must be between 2 and 100 characters.");
        }

        var normalizedBio = bio?.Trim() ?? string.Empty;
        if (normalizedBio.Length > 500)
        {
            throw new ArgumentOutOfRangeException(nameof(bio), "Bio must be 500 characters or fewer.");
        }

        FullName = normalizedName;
        Bio = normalizedBio;
        CurrentAvatarAssetId = currentAvatarAssetId is { } assetId && assetId != Guid.Empty ? assetId : null;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetCurrentAvatarAsset(Guid? assetId)
    {
        CurrentAvatarAssetId = assetId == Guid.Empty ? null : assetId;
        UpdatedAt = DateTime.UtcNow;
    }

    public static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

    private void ClearVerificationOtp()
    {
        OtpCode = null;
        OtpExpiresAt = null;
        OtpFailedAttempts = 0;
        OtpResendAvailableAt = null;
    }
}
