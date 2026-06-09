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
        Assert.True(user.IsEmailVerified);
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
}
