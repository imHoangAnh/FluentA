using FluentA.Application.BoundedContexts.Auth;
using FluentA.Application.BoundedContexts.Auth.DTOs;
using FluentA.Application.Common;
using FluentA.Application.Common.Interfaces;
using FluentA.Infrastructure.Auth;
using Microsoft.Extensions.Configuration;

namespace FluentA.Application.UnitTests;

public sealed class AuthServiceTests
{
    private static (AuthService Service, RecordingEmailVerificationSender EmailSender) CreateService()
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
        var emailSender = new RecordingEmailVerificationSender();
        return (new AuthService(users, refresh, hasher, tokenService, new FakeGoogleOAuthClient(), emailSender), emailSender);
    }

    [Fact]
    public async Task Register_RejectsDuplicateEmail()
    {
        var (service, _) = CreateService();
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
        var (service, _) = CreateService();
        var registration = await service.RegisterAsync(new RegisterRequest("learner@example.com", "SecurePass123", "FluentA Learner"));
        await service.VerifyEmailAsync(new VerifyEmailRequest(registration.Value!.EmailVerificationToken));

        var result = await service.LoginAsync(new LoginRequest("learner@example.com", "SecurePass123"));

        Assert.True(result.IsSuccess);
        Assert.NotEmpty(result.Value!.AccessToken);
        Assert.Equal("learner@example.com", result.Value.User.Email);
    }

    [Fact]
    public async Task Login_RejectsUnverifiedPasswordAccountUntilEmailVerified()
    {
        var (service, _) = CreateService();
        var registration = await service.RegisterAsync(new RegisterRequest("learner@example.com", "SecurePass123", "FluentA Learner"));

        var unverified = await service.LoginAsync(new LoginRequest("learner@example.com", "SecurePass123"));
        var verified = await service.VerifyEmailAsync(new VerifyEmailRequest(registration.Value!.EmailVerificationToken));
        var login = await service.LoginAsync(new LoginRequest("learner@example.com", "SecurePass123"));

        Assert.False(unverified.IsSuccess);
        Assert.Equal("EMAIL_NOT_VERIFIED", ((AuthError)unverified.Error!).Code);
        Assert.True(verified.IsSuccess);
        Assert.True(verified.Value!.IsEmailVerified);
        Assert.True(login.IsSuccess);
    }

    [Fact]
    public async Task VerifyEmail_RejectsInvalidToken()
    {
        var (service, _) = CreateService();

        var result = await service.VerifyEmailAsync(new VerifyEmailRequest("not-a-token"));

        Assert.False(result.IsSuccess);
        Assert.Equal("INVALID_VERIFICATION_TOKEN", ((AuthError)result.Error!).Code);
    }

    [Fact]
    public async Task Login_RejectsInvalidCredentials()
    {
        var (service, _) = CreateService();
        var registration = await service.RegisterAsync(new RegisterRequest("learner@example.com", "SecurePass123", "FluentA Learner"));
        await service.VerifyEmailAsync(new VerifyEmailRequest(registration.Value!.EmailVerificationToken));

        var result = await service.LoginAsync(new LoginRequest("learner@example.com", "wrong-password"));

        Assert.False(result.IsSuccess);
        Assert.Equal("INVALID_CREDENTIALS", ((AuthError)result.Error!).Code);
    }

    [Fact]
    public async Task Refresh_RotatesRefreshToken()
    {
        var (service, _) = CreateService();
        var registration = await service.RegisterAsync(new RegisterRequest("learner@example.com", "SecurePass123", "FluentA Learner"));
        await service.VerifyEmailAsync(new VerifyEmailRequest(registration.Value!.EmailVerificationToken));
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
        var (service, _) = CreateService();

        var result = await service.GoogleLoginAsync(new GoogleLoginRequest("valid-google-code"));

        Assert.True(result.IsSuccess);
        Assert.NotEmpty(result.Value!.AccessToken);
        Assert.Equal("google@example.com", result.Value.User.Email);
        Assert.True(result.Value.User.IsEmailVerified);
    }

    [Fact]
    public async Task GoogleLogin_LinksExistingEmailAccount()
    {
        var (service, _) = CreateService();
        var registration = await service.RegisterAsync(new RegisterRequest("google@example.com", "SecurePass123", "Original Name"));
        await service.VerifyEmailAsync(new VerifyEmailRequest(registration.Value!.EmailVerificationToken));

        var result = await service.GoogleLoginAsync(new GoogleLoginRequest("valid-google-code"));

        Assert.True(result.IsSuccess);
        Assert.Equal("Google Learner", result.Value!.User.FullName);
    }

    [Fact]
    public async Task Register_SendsVerificationEmail()
    {
        var (service, emailSender) = CreateService();

        var result = await service.RegisterAsync(new RegisterRequest("learner@example.com", "SecurePass123", "FluentA Learner"));

        Assert.True(result.IsSuccess);
        var message = Assert.Single(emailSender.Messages);
        Assert.Equal("learner@example.com", message.ToEmail);
        Assert.Equal("FluentA Learner", message.FullName);
        Assert.Equal(result.Value!.EmailVerificationUrl, message.VerificationUrl);
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

    private sealed class RecordingEmailVerificationSender : IEmailVerificationSender
    {
        public List<EmailVerificationMessage> Messages { get; } = [];

        public Task SendVerificationEmailAsync(EmailVerificationMessage message, CancellationToken cancellationToken = default)
        {
            Messages.Add(message);
            return Task.CompletedTask;
        }
    }
}
