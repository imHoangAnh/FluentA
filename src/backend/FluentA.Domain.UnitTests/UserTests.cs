using FluentA.Domain.BoundedContexts.Auth.Entities;

namespace FluentA.Domain.UnitTests;

public sealed class UserTests
{
    [Fact]
    public void PasswordUser_NormalizesEmailAndStartsUnverified()
    {
        var user = User.CreateWithPassword(" Learner@Example.COM ", " FluentA Learner ", "hash");
        Assert.Equal("learner@example.com", user.Email);
        Assert.Equal("FluentA Learner", user.FullName);
        Assert.False(user.IsEmailVerified);
        Assert.Null(user.EmailVerifiedAt);
    }

    [Fact]
    public void VerificationOtp_IsHashedStateAndClearedWhenVerified()
    {
        var user = User.CreateWithPassword("learner@example.com", "Learner", "hash");
        var now = DateTime.UtcNow;
        user.IssueVerificationOtp("hashed-otp", now.AddMinutes(5), now.AddSeconds(30));
        user.MarkEmailVerified(now);
        Assert.True(user.IsEmailVerified);
        Assert.Equal(now, user.EmailVerifiedAt);
        Assert.Null(user.OtpCode);
        Assert.Null(user.OtpExpiresAt);
        Assert.Null(user.OtpResendAvailableAt);
        Assert.Equal(0, user.OtpFailedAttempts);
    }

    [Fact]
    public void GoogleLink_PreservesExistingProfileAndVerifiesEmail()
    {
        var user = User.CreateWithPassword("learner@example.com", "Original Name", "hash");
        user.UpdateProfile("Original Name", "Existing bio");
        var now = DateTime.UtcNow;
        user.LinkGoogleAccount("google-id", now);
        Assert.Equal("Original Name", user.FullName);
        Assert.Equal("Existing bio", user.Bio);
        Assert.Equal("google-id", user.GoogleId);
        Assert.Equal(now, user.EmailVerifiedAt);
        Assert.Throws<InvalidOperationException>(() => user.LinkGoogleAccount("other-google-id", now));
    }

    [Fact]
    public void PasswordReset_IsClearedWhenPasswordChanges()
    {
        var user = User.CreateWithPassword("learner@example.com", "Learner", "old-hash");
        user.IssuePasswordReset("reset-hash", DateTime.UtcNow.AddMinutes(15));
        user.UpdatePassword("new-hash");
        Assert.Equal("new-hash", user.PasswordHash);
        Assert.Null(user.ResetPasswordToken);
        Assert.Null(user.ResetPasswordExpiresAt);
    }

    [Fact]
    public void GoogleUser_IsCreatedVerified()
    {
        var now = DateTime.UtcNow;
        var user = User.CreateWithGoogle(" Google@Example.COM ", " Google Learner ", "google-id", now);
        Assert.Equal("google@example.com", user.Email);
        Assert.True(user.IsEmailVerified);
        Assert.Equal(now, user.EmailVerifiedAt);
        Assert.Null(user.PasswordHash);
    }
}
