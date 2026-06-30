using System.Web;
using FluentA.Application.BoundedContexts.Auth;
using FluentA.Application.BoundedContexts.Auth.DTOs;
using FluentA.Application.Common;
using FluentA.Application.Common.Interfaces;
using FluentA.Infrastructure.Auth;
using Microsoft.Extensions.Configuration;

namespace FluentA.Application.UnitTests;

public sealed class AuthServiceTests
{
    private static (AuthService Service, RecordingAccountEmailSender EmailSender, InMemoryAccountChallengeStore ChallengeStore) CreateService()
    {
        var users = new InMemoryUserRepository();
        var refresh = new InMemoryRefreshTokenStore();
        var hasher = new BCryptPasswordHasher();
        var challengeStore = new InMemoryAccountChallengeStore();
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwt:Issuer"] = "FluentA.Test",
            ["Jwt:Audience"] = "FluentA.TestClient"
        }).Build();
        var tokenService = new JwtTokenService(new JwtSigningKeyProvider(), config);
        var emailSender = new RecordingAccountEmailSender();
        return (new AuthService(users, challengeStore, refresh, hasher, tokenService, new FakeGoogleOAuthClient(), emailSender, new FakeAvatarStorage()), emailSender, challengeStore);
    }

    [Fact]
    public async Task Register_RejectsDuplicateEmail()
    {
        var (service, _, _) = CreateService();
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
        var (service, _, _) = CreateService();
        var registration = await service.RegisterAsync(new RegisterRequest("learner@example.com", "SecurePass123", "FluentA Learner"));
        await service.VerifyEmailAsync(new VerifyEmailRequest(registration.Value!.Email, registration.Value.DevelopmentOtp!));

        var result = await service.LoginAsync(new LoginRequest("learner@example.com", "SecurePass123"));

        Assert.True(result.IsSuccess);
        Assert.NotEmpty(result.Value!.AccessToken);
        Assert.Equal("learner@example.com", result.Value.User.Email);
    }

    [Fact]
    public async Task Login_RejectsUnverifiedPasswordAccountUntilEmailVerified()
    {
        var (service, _, _) = CreateService();
        var registration = await service.RegisterAsync(new RegisterRequest("learner@example.com", "SecurePass123", "FluentA Learner"));

        var unverified = await service.LoginAsync(new LoginRequest("learner@example.com", "SecurePass123"));
        var verified = await service.VerifyEmailAsync(new VerifyEmailRequest(registration.Value!.Email, registration.Value.DevelopmentOtp!));
        var login = await service.LoginAsync(new LoginRequest("learner@example.com", "SecurePass123"));

        Assert.False(unverified.IsSuccess);
        Assert.Equal("EMAIL_NOT_VERIFIED", ((AuthError)unverified.Error!).Code);
        Assert.True(verified.IsSuccess);
        Assert.True(verified.Value!.IsEmailVerified);
        Assert.True(login.IsSuccess);
    }

    [Fact]
    public async Task VerifyEmail_RejectsInvalidOtp()
    {
        var (service, _, _) = CreateService();
        await service.RegisterAsync(new RegisterRequest("learner@example.com", "SecurePass123", "FluentA Learner"));

        var result = await service.VerifyEmailAsync(new VerifyEmailRequest("learner@example.com", "111111"));

        Assert.False(result.IsSuccess);
        Assert.Equal("INVALID_VERIFICATION_OTP", ((AuthError)result.Error!).Code);
    }

    [Fact]
    public async Task ResendVerificationOtp_RejectsCooldownWindow()
    {
        var (service, _, _) = CreateService();
        await service.RegisterAsync(new RegisterRequest("learner@example.com", "SecurePass123", "FluentA Learner"));

        var result = await service.ResendVerificationOtpAsync(new ResendVerificationOtpRequest("learner@example.com"));

        Assert.False(result.IsSuccess);
        Assert.Equal("VERIFICATION_OTP_COOLDOWN", ((AuthError)result.Error!).Code);
    }

    [Fact]
    public async Task Login_RejectsInvalidCredentials()
    {
        var (service, _, _) = CreateService();
        var registration = await service.RegisterAsync(new RegisterRequest("learner@example.com", "SecurePass123", "FluentA Learner"));
        await service.VerifyEmailAsync(new VerifyEmailRequest(registration.Value!.Email, registration.Value.DevelopmentOtp!));

        var result = await service.LoginAsync(new LoginRequest("learner@example.com", "wrong-password"));

        Assert.False(result.IsSuccess);
        Assert.Equal("INVALID_CREDENTIALS", ((AuthError)result.Error!).Code);
    }

    [Fact]
    public async Task Refresh_RotatesRefreshToken()
    {
        var (service, _, _) = CreateService();
        var registration = await service.RegisterAsync(new RegisterRequest("learner@example.com", "SecurePass123", "FluentA Learner"));
        await service.VerifyEmailAsync(new VerifyEmailRequest(registration.Value!.Email, registration.Value.DevelopmentOtp!));
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
        var (service, _, _) = CreateService();

        var result = await service.GoogleLoginAsync(new GoogleLoginRequest("valid-google-code"));

        Assert.True(result.IsSuccess);
        Assert.NotEmpty(result.Value!.AccessToken);
        Assert.Equal("google@example.com", result.Value.User.Email);
        Assert.True(result.Value.User.IsEmailVerified);
    }

    [Fact]
    public async Task GoogleLogin_LinksExistingEmailAccount()
    {
        var (service, _, _) = CreateService();
        var registration = await service.RegisterAsync(new RegisterRequest("google@example.com", "SecurePass123", "Original Name"));
        await service.VerifyEmailAsync(new VerifyEmailRequest(registration.Value!.Email, registration.Value.DevelopmentOtp!));

        var result = await service.GoogleLoginAsync(new GoogleLoginRequest("valid-google-code"));

        Assert.True(result.IsSuccess);
        Assert.Equal("Google Learner", result.Value!.User.FullName);
    }

    [Fact]
    public async Task Register_SendsVerificationOtpEmail()
    {
        var (service, emailSender, _) = CreateService();

        var result = await service.RegisterAsync(new RegisterRequest("learner@example.com", "SecurePass123", "FluentA Learner"));

        Assert.True(result.IsSuccess);
        var message = Assert.Single(emailSender.VerificationMessages);
        Assert.Equal("learner@example.com", message.ToEmail);
        Assert.Equal("FluentA Learner", message.FullName);
        Assert.Equal(result.Value!.DevelopmentOtp, message.Otp);
    }

    [Fact]
    public async Task ForgotPassword_ReturnsUnknownAccountWarning()
    {
        var (service, _, _) = CreateService();

        var result = await service.ForgotPasswordAsync(new ForgotPasswordRequest("missing@example.com"));

        Assert.True(result.IsSuccess);
        Assert.False(result.Value!.AccountExists);
    }

    [Fact]
    public async Task ForgotPassword_RejectsGoogleOnlyAccount()
    {
        var (service, _, _) = CreateService();
        await service.GoogleLoginAsync(new GoogleLoginRequest("valid-google-code"));

        var result = await service.ForgotPasswordAsync(new ForgotPasswordRequest("google@example.com"));

        Assert.False(result.IsSuccess);
        Assert.Equal("PASSWORD_RESET_NOT_AVAILABLE", ((AuthError)result.Error!).Code);
    }

    [Fact]
    public async Task ResetPassword_ConsumesSingleUseToken()
    {
        var (service, _, _) = CreateService();
        var registration = await service.RegisterAsync(new RegisterRequest("learner@example.com", "SecurePass123", "FluentA Learner"));
        await service.VerifyEmailAsync(new VerifyEmailRequest(registration.Value!.Email, registration.Value.DevelopmentOtp!));
        var forgotPassword = await service.ForgotPasswordAsync(new ForgotPasswordRequest("learner@example.com"));
        var resetUrl = forgotPassword.Value!.DevelopmentResetUrl!;
        var token = HttpUtility.ParseQueryString(new Uri(resetUrl).Query)["token"]!;

        var reset = await service.ResetPasswordAsync(new ResetPasswordRequest(token, "NewSecurePass123", "NewSecurePass123"));
        var staleReset = await service.ResetPasswordAsync(new ResetPasswordRequest(token, "AnotherPass123", "AnotherPass123"));
        var login = await service.LoginAsync(new LoginRequest("learner@example.com", "NewSecurePass123"));

        Assert.True(reset.IsSuccess);
        Assert.False(staleReset.IsSuccess);
        Assert.Equal("INVALID_PASSWORD_RESET_TOKEN", ((AuthError)staleReset.Error!).Code);
        Assert.True(login.IsSuccess);
    }

    [Fact]
    public async Task UpdateProfile_UpdatesNameBioAndAvatar()
    {
        var (service, _, _) = CreateService();
        var registration = await service.RegisterAsync(new RegisterRequest("learner@example.com", "SecurePass123", "FluentA Learner"));
        await service.VerifyEmailAsync(new VerifyEmailRequest(registration.Value!.Email, registration.Value.DevelopmentOtp!));
        var login = await service.LoginAsync(new LoginRequest("learner@example.com", "SecurePass123"));

        var result = await service.UpdateProfileAsync(login.Value!.User.Id, new UpdateProfileRequest(
            "Updated Learner",
            "Studies every morning.",
            Avatar: new AvatarUpload("avatar.png", "image/png", [1, 2, 3])));

        Assert.True(result.IsSuccess);
        Assert.Equal("Updated Learner", result.Value!.FullName);
        Assert.Equal("Studies every morning.", result.Value.Bio);
        Assert.Equal("https://cdn.example.com/avatar.png", result.Value.AvatarUrl);
    }

    [Fact]
    public async Task UpdateProfile_RejectsReviewFeatureAvatarValidationViolations()
    {
        var (service, _, _) = CreateService();
        var registration = await service.RegisterAsync(new RegisterRequest("learner@example.com", "SecurePass123", "FluentA Learner"));
        await service.VerifyEmailAsync(new VerifyEmailRequest(registration.Value!.Email, registration.Value.DevelopmentOtp!));
        var login = await service.LoginAsync(new LoginRequest("learner@example.com", "SecurePass123"));

        var result = await service.UpdateProfileAsync(login.Value!.User.Id, new UpdateProfileRequest(
            "Updated Learner",
            new string('a', 501),
            Avatar: new AvatarUpload("avatar.gif", "image/gif", [1, 2, 3])));

        Assert.False(result.IsSuccess);
        var error = Assert.IsType<AuthError>(result.Error);
        Assert.Equal("VALIDATION_ERROR", error.Code);
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

    private sealed class RecordingAccountEmailSender : IAccountEmailSender
    {
        public List<VerificationOtpEmailMessage> VerificationMessages { get; } = [];
        public List<PasswordResetEmailMessage> PasswordResetMessages { get; } = [];

        public Task<VerificationOtpEmailDeliveryResult> SendVerificationOtpAsync(VerificationOtpEmailMessage message, CancellationToken cancellationToken = default)
        {
            VerificationMessages.Add(message);
            return Task.FromResult(new VerificationOtpEmailDeliveryResult(message.Otp));
        }

        public Task<PasswordResetEmailDeliveryResult> SendPasswordResetAsync(PasswordResetEmailMessage message, CancellationToken cancellationToken = default)
        {
            PasswordResetMessages.Add(message);
            return Task.FromResult(new PasswordResetEmailDeliveryResult($"http://localhost:5173{message.ResetUrl}"));
        }
    }

    private sealed class FakeAvatarStorage : IAvatarStorage
    {
        public Task<AvatarUploadResult> UploadAsync(Guid userId, AvatarUpload upload, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(new AvatarUploadResult("https://cdn.example.com/avatar.png", $"{userId:N}/avatar"));
        }

        public Task DeleteAsync(string publicId, CancellationToken cancellationToken = default)
        {
            return Task.CompletedTask;
        }
    }

    private sealed class InMemoryAccountChallengeStore : IAccountChallengeStore
    {
        private readonly Dictionary<string, VerificationChallengeIssue> _verificationChallenges = new();
        private readonly Dictionary<string, int> _verificationAttempts = new();
        private readonly Dictionary<string, PasswordResetChallengeIssue> _passwordResetChallenges = new();
        private readonly Dictionary<string, Guid> _passwordResetUsers = new();

        public Task<VerificationChallengeIssue> IssueVerificationAsync(Guid userId, string email, CancellationToken cancellationToken = default)
        {
            var issue = NewVerificationIssue();
            _verificationChallenges[Normalize(email)] = issue;
            _verificationAttempts[Normalize(email)] = 0;
            return Task.FromResult(issue);
        }

        public Task<VerificationChallengeResendResult> ResendVerificationAsync(Guid userId, string email, CancellationToken cancellationToken = default)
        {
            var key = Normalize(email);
            if (_verificationChallenges.TryGetValue(key, out var existing) && existing.ResendAvailableAtUtc > DateTime.UtcNow)
            {
                return Task.FromResult(new VerificationChallengeResendResult(false, existing.ExpiresAtUtc, existing.ResendAvailableAtUtc));
            }

            var issue = NewVerificationIssue();
            _verificationChallenges[key] = issue;
            _verificationAttempts[key] = 0;
            return Task.FromResult(new VerificationChallengeResendResult(true, issue.ExpiresAtUtc, issue.ResendAvailableAtUtc, issue.Otp));
        }

        public Task<VerificationChallengeVerifyResult> VerifyVerificationOtpAsync(string email, string otp, CancellationToken cancellationToken = default)
        {
            var key = Normalize(email);
            if (!_verificationChallenges.TryGetValue(key, out var issue) || issue.ExpiresAtUtc <= DateTime.UtcNow)
            {
                return Task.FromResult(new VerificationChallengeVerifyResult(VerificationChallengeVerifyStatus.InvalidOrExpired));
            }

            if (issue.Otp == otp)
            {
                _verificationChallenges.Remove(key);
                _verificationAttempts.Remove(key);
                return Task.FromResult(new VerificationChallengeVerifyResult(VerificationChallengeVerifyStatus.Verified));
            }

            _verificationAttempts[key] = _verificationAttempts.GetValueOrDefault(key) + 1;
            if (_verificationAttempts[key] >= 5)
            {
                _verificationChallenges.Remove(key);
                _verificationAttempts.Remove(key);
            }

            return Task.FromResult(new VerificationChallengeVerifyResult(VerificationChallengeVerifyStatus.InvalidOrExpired));
        }

        public Task<PasswordResetChallengeIssue> IssuePasswordResetAsync(Guid userId, string email, CancellationToken cancellationToken = default)
        {
            var token = Guid.NewGuid().ToString("N");
            var issue = new PasswordResetChallengeIssue(token, DateTime.UtcNow.AddMinutes(30));
            _passwordResetChallenges[token] = issue;
            _passwordResetUsers[token] = userId;
            return Task.FromResult(issue);
        }

        public Task<PasswordResetChallengeConsumeResult> ConsumePasswordResetAsync(string token, CancellationToken cancellationToken = default)
        {
            if (!_passwordResetChallenges.Remove(token, out _) || !_passwordResetUsers.Remove(token, out var userId))
            {
                return Task.FromResult(new PasswordResetChallengeConsumeResult(PasswordResetChallengeConsumeStatus.InvalidOrExpired));
            }

            return Task.FromResult(new PasswordResetChallengeConsumeResult(PasswordResetChallengeConsumeStatus.Consumed, userId));
        }

        private static VerificationChallengeIssue NewVerificationIssue()
        {
            var now = DateTime.UtcNow;
            return new VerificationChallengeIssue("123456", now.AddMinutes(10), now.AddSeconds(60));
        }

        private static string Normalize(string email) => email.Trim().ToLowerInvariant();
    }
}
