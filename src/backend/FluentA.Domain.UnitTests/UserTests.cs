using FluentA.Domain.BoundedContexts.Auth.Entities;

namespace FluentA.Domain.UnitTests;

public sealed class UserTests
{
    [Fact]
    public void CreateWithPassword_NormalizesEmailAndStoresProfile()
    {
        var user = User.CreateWithPassword(" Learner@Example.COM ", " FluentA Learner ", "hash");

        Assert.Equal("learner@example.com", user.Email);
        Assert.Equal("FluentA Learner", user.FullName);
        Assert.False(user.IsEmailVerified);
        Assert.Equal("hash", user.PasswordHash);
    }

    [Fact]
    public void RecordLogin_UpdatesLastLogin()
    {
        var user = User.CreateWithPassword("learner@example.com", "FluentA Learner", "hash");
        var now = DateTime.UtcNow;

        user.RecordLogin(now);

        Assert.Equal(now, user.LastLoginAt);
    }

    [Fact]
    public void CreateWithGoogle_CreatesVerifiedProviderUser()
    {
        var user = User.CreateWithGoogle(" Google@Example.COM ", " Google Learner ", "google-id");

        Assert.Equal("google@example.com", user.Email);
        Assert.Equal("Google Learner", user.FullName);
        Assert.Equal("google-id", user.GoogleId);
        Assert.Null(user.PasswordHash);
        Assert.True(user.IsEmailVerified);
    }

    [Fact]
    public void LinkGoogleAccount_VerifiesAndUpdatesProfile()
    {
        var user = User.CreateWithPassword("learner@example.com", "Original Name", "hash");

        user.LinkGoogleAccount("google-id", " Google Learner ");
        user.LinkGoogleAccount("google-id", "");

        Assert.Equal("google-id", user.GoogleId);
        Assert.Equal("Google Learner", user.FullName);
        Assert.True(user.IsEmailVerified);
        Assert.Throws<InvalidOperationException>(() => user.LinkGoogleAccount("other-google-id", "Other"));
    }

    [Fact]
    public void User_RejectsMissingProviderSecrets()
    {
        Assert.Throws<ArgumentException>(() => User.CreateWithPassword("learner@example.com", "Learner", ""));
        Assert.Throws<ArgumentException>(() => User.CreateWithGoogle("learner@example.com", "Learner", ""));
        Assert.Throws<ArgumentException>(() => User.CreateWithPassword("learner@example.com", "Learner", "hash").LinkGoogleAccount("", "Learner"));
    }
}
