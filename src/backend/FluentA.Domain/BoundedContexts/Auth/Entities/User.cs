using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Auth.Entities;

public sealed class User : BaseEntity, IAggregateRoot
{
    private User()
    {
        Email = string.Empty;
        FullName = string.Empty;
    }

    private User(string email, string fullName, string? passwordHash, string? googleId, bool isEmailVerified)
    {
        Email = NormalizeEmail(email);
        FullName = fullName.Trim();
        PasswordHash = passwordHash;
        GoogleId = googleId;
        IsEmailVerified = isEmailVerified;
    }

    public string Email { get; private set; }
    public string FullName { get; private set; }
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

    public static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();
}
