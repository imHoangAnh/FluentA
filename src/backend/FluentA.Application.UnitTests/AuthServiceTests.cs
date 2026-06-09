using FluentA.Application.BoundedContexts.Auth;
using FluentA.Application.BoundedContexts.Auth.DTOs;
using FluentA.Application.Common;
using FluentA.Infrastructure.Auth;
using Microsoft.Extensions.Configuration;

namespace FluentA.Application.UnitTests;

public sealed class AuthServiceTests
{
    private static AuthService CreateService()
    {
        var users = new InMemoryUserRepository();
        var refresh = new InMemoryRefreshTokenStore();
        var hasher = new BCryptPasswordHasher();
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwt:Issuer"] = "FluentA.Test",
            ["Jwt:Audience"] = "FluentA.TestClient"
        }).Build();
        var tokenService = new JwtTokenService(new JwtSigningKeyProvider(), config);
        return new AuthService(users, refresh, hasher, tokenService, new FakeGoogleOAuthClient());
    }

    [Fact]
    public async Task Register_RejectsDuplicateEmail()
    {
        var service = CreateService();
        var request = new RegisterRequest("learner@example.com", "SecurePass123", "FluentA Learner");

        var first = await service.RegisterAsync(request);
        var duplicate = await service.RegisterAsync(request);

        Assert.True(first.IsSuccess);
        Assert.False(duplicate.IsSuccess);
        Assert.Equal("EMAIL_ALREADY_EXISTS", ((AuthError)duplicate.Error!).Code);
    }

    [Fact]
    public async Task Login_ReturnsAccessTokenForValidCredentials()
    {
        var service = CreateService();
        await service.RegisterAsync(new RegisterRequest("learner@example.com", "SecurePass123", "FluentA Learner"));

        var result = await service.LoginAsync(new LoginRequest("learner@example.com", "SecurePass123"));

        Assert.True(result.IsSuccess);
        Assert.NotEmpty(result.Value!.AccessToken);
        Assert.Equal("learner@example.com", result.Value.User.Email);
    }

    [Fact]
    public async Task Login_RejectsInvalidCredentials()
    {
        var service = CreateService();
        await service.RegisterAsync(new RegisterRequest("learner@example.com", "SecurePass123", "FluentA Learner"));

        var result = await service.LoginAsync(new LoginRequest("learner@example.com", "wrong-password"));

        Assert.False(result.IsSuccess);
        Assert.Equal("INVALID_CREDENTIALS", ((AuthError)result.Error!).Code);
    }

    [Fact]
    public async Task Refresh_RotatesRefreshToken()
    {
        var service = CreateService();
        await service.RegisterAsync(new RegisterRequest("learner@example.com", "SecurePass123", "FluentA Learner"));
        var login = await service.LoginAsync(new LoginRequest("learner@example.com", "SecurePass123"));

        var refresh = await service.RefreshAsync(login.Value!.RefreshToken);
        var staleRefresh = await service.RefreshAsync(login.Value.RefreshToken);

        Assert.True(refresh.IsSuccess);
        Assert.NotEqual(login.Value.RefreshToken, refresh.Value!.RefreshToken);
        Assert.False(staleRefresh.IsSuccess);
        Assert.Equal("UNAUTHORIZED", ((AuthError)staleRefresh.Error!).Code);
    }

    [Fact]
    public async Task GoogleLogin_CreatesAccountForVerifiedGoogleProfile()
    {
        var service = CreateService();

        var result = await service.GoogleLoginAsync(new GoogleLoginRequest("valid-google-code"));

        Assert.True(result.IsSuccess);
        Assert.NotEmpty(result.Value!.AccessToken);
        Assert.Equal("google@example.com", result.Value.User.Email);
        Assert.True(result.Value.User.IsEmailVerified);
    }

    [Fact]
    public async Task GoogleLogin_LinksExistingEmailAccount()
    {
        var service = CreateService();
        await service.RegisterAsync(new RegisterRequest("google@example.com", "SecurePass123", "Original Name"));

        var result = await service.GoogleLoginAsync(new GoogleLoginRequest("valid-google-code"));

        Assert.True(result.IsSuccess);
        Assert.Equal("Google Learner", result.Value!.User.FullName);
    }

    private sealed class FakeGoogleOAuthClient : IGoogleOAuthClient
    {
        public Task<OperationResult<GoogleUserInfo>> ExchangeCodeAsync(GoogleLoginRequest request, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(OperationResult<GoogleUserInfo>.Success(new GoogleUserInfo(
                "google-sub-123",
                "google@example.com",
                "Google Learner",
                EmailVerified: true)));
        }
    }
}
