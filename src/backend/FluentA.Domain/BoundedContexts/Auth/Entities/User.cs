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

    private User(string email, string fullName, string? passwordHash, string? googleId, bool isEmailVerified)
    {
        Email = NormalizeEmail(email);
        FullName = fullName.Trim();
        Bio = string.Empty;
        PasswordHash = passwordHash;
        GoogleId = googleId;
        IsEmailVerified = isEmailVerified;
    }

    public string Email { get; private set; }
    public string FullName { get; private set; }
    public string Bio { get; private set; }
    public string? AvatarUrl { get; private set; }
    public string? AvatarPublicId { get; private set; }
    public string? PasswordHash { get; private set; }
    public string? GoogleId { get; private set; }
    public bool IsEmailVerified { get; private set; }
    public DateTime? LastLoginAt { get; private set; }

    public static User CreateWithPassword(string email, string fullName, string passwordHash)
    {
        if (string.IsNullOrWhiteSpace(passwordHash))
        {
            throw new ArgumentException("Password hash is required.", nameof(passwordHash));
        }

        return new User(email, fullName, passwordHash, googleId: null, isEmailVerified: false);
    }

    public static User CreateWithGoogle(string email, string fullName, string googleId)
    {
        if (string.IsNullOrWhiteSpace(googleId))
        {
            throw new ArgumentException("Google id is required.", nameof(googleId));
        }

        return new User(email, fullName, passwordHash: null, googleId, isEmailVerified: true);
    }

    public void MarkEmailVerified()
    {
        IsEmailVerified = true;
        UpdatedAt = DateTime.UtcNow;
    }

    public void RecordLogin(DateTime loggedInAt)
    {
        LastLoginAt = loggedInAt;
        UpdatedAt = loggedInAt;
    }

    public void UpdatePassword(string passwordHash)
    {
        if (string.IsNullOrWhiteSpace(passwordHash))
        {
            throw new ArgumentException("Password hash is required.", nameof(passwordHash));
        }

        PasswordHash = passwordHash;
        UpdatedAt = DateTime.UtcNow;
    }

    public void LinkGoogleAccount(string googleId, string fullName)
    {
        if (string.IsNullOrWhiteSpace(googleId))
        {
            throw new ArgumentException("Google id is required.", nameof(googleId));
        }

        if (GoogleId is not null && !string.Equals(GoogleId, googleId, StringComparison.Ordinal))
        {
            throw new InvalidOperationException("This user is already linked to a different Google account.");
        }

        GoogleId = googleId;
        if (!string.IsNullOrWhiteSpace(fullName))
        {
            FullName = fullName.Trim();
        }

        IsEmailVerified = true;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateProfile(string fullName, string? bio, string? avatarUrl, string? avatarPublicId)
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

        if (string.IsNullOrWhiteSpace(avatarUrl) != string.IsNullOrWhiteSpace(avatarPublicId))
        {
            throw new ArgumentException("Avatar URL and public id must be stored together.", nameof(avatarUrl));
        }

        FullName = normalizedName;
        Bio = normalizedBio;
        AvatarUrl = string.IsNullOrWhiteSpace(avatarUrl) ? null : avatarUrl.Trim();
        AvatarPublicId = string.IsNullOrWhiteSpace(avatarPublicId) ? null : avatarPublicId.Trim();
        UpdatedAt = DateTime.UtcNow;
    }

    public static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();
}
