using FluentA.Application.BoundedContexts.Assets;
using FluentA.Application.BoundedContexts.Auth;
using FluentA.Application.BoundedContexts.Auth.DTOs;
using FluentA.Application.Common;
using FluentA.Application.Common.Interfaces;
using FluentA.Domain.BoundedContexts.Assets.Entities;
using FluentA.Domain.BoundedContexts.Auth.Entities;

namespace FluentA.Application.UnitTests;

public sealed class AuthServiceTests
{
    [Fact]
    public async Task Register_PersistsOnlyHashedOtpAndSendsRawOtp()
    {
        var fixture = CreateFixture();
        var result = await fixture.Service.RegisterAsync(new RegisterRequest("Learner@Example.com", "SecurePass123", "FluentA Learner"));
        Assert.True(result.IsSuccess);
        Assert.Equal("otp:learner@example.com:123456", fixture.Users.Single.OtpCode);
        Assert.NotEqual("123456", fixture.Users.Single.OtpCode);
        Assert.Contains("123456", fixture.Email.Messages.Single().TextBody);
        Assert.Equal(30, (result.Value!.ResendAvailableAtUtc - fixture.Users.Single.UpdatedAt).TotalSeconds, 1);
    }

    [Fact]
    public async Task Register_ReturnsProviderUnavailableWhenResendFails()
    {
        var fixture = CreateFixture();
        fixture.Email.Succeeds = false;
        var result = await fixture.Service.RegisterAsync(new RegisterRequest("learner@example.com", "SecurePass123", "Learner"));
        Assert.False(result.IsSuccess);
        Assert.Equal("EMAIL_DELIVERY_FAILED", ((AuthError)result.Error!).Code);
    }

    [Fact]
    public async Task VerifyOtp_ConsumesChallengeAndEnablesPasswordLogin()
    {
        var fixture = CreateFixture();
        await fixture.Service.RegisterAsync(new RegisterRequest("learner@example.com", "SecurePass123", "Learner"));
        var before = await fixture.Service.LoginAsync(new LoginRequest("learner@example.com", "SecurePass123"));
        var verified = await fixture.Service.VerifyOtpAsync(new VerifyOtpRequest("learner@example.com", "123456"));
        var login = await fixture.Service.LoginAsync(new LoginRequest("learner@example.com", "SecurePass123"));
        Assert.Equal("EMAIL_NOT_VERIFIED", ((AuthError)before.Error!).Code);
        Assert.True(verified.IsSuccess);
        Assert.True(login.IsSuccess);
        Assert.StartsWith("jwt:", login.Value!.Token);
    }

    [Fact]
    public async Task Resend_EnforcesThirtySecondCooldownAndReplacesOtp()
    {
        var fixture = CreateFixture();
        await fixture.Service.RegisterAsync(new RegisterRequest("learner@example.com", "SecurePass123", "Learner"));
        var result = await fixture.Service.ResendVerificationOtpAsync(new ResendVerificationOtpRequest("learner@example.com"));
        Assert.False(result.IsSuccess);
        Assert.Equal("VERIFICATION_OTP_COOLDOWN", ((AuthError)result.Error!).Code);
    }

    [Fact]
    public async Task ForgotPassword_IsGenericForUnknownGoogleOnlyAndDeliveryFailure()
    {
        var fixture = CreateFixture();
        var unknown = await fixture.Service.ForgotPasswordAsync(new ForgotPasswordRequest("unknown@example.com"));
        await fixture.Users.AddAsync(User.CreateWithGoogle("google@example.com", "Google", "subject", DateTime.UtcNow));
        var googleOnly = await fixture.Service.ForgotPasswordAsync(new ForgotPasswordRequest("google@example.com"));
        var passwordUser = User.CreateWithPassword("password@example.com", "Password", "hash:old-password");
        await fixture.Users.AddAsync(passwordUser);
        fixture.Email.Succeeds = false;
        var failedDelivery = await fixture.Service.ForgotPasswordAsync(new ForgotPasswordRequest("password@example.com"));
        Assert.Equal(unknown.Value!.Message, googleOnly.Value!.Message);
        Assert.Equal(unknown.Value.Message, failedDelivery.Value!.Message);
        Assert.True(failedDelivery.IsSuccess);
    }

    [Fact]
    public async Task ResetPassword_IsSingleUse()
    {
        var fixture = CreateFixture();
        await fixture.Users.AddAsync(User.CreateWithPassword("learner@example.com", "Learner", "hash:old-password"));
        await fixture.Service.ForgotPasswordAsync(new ForgotPasswordRequest("learner@example.com"));
        var first = await fixture.Service.ResetPasswordAsync(new ResetPasswordRequest("raw-reset-token", "new-password"));
        var second = await fixture.Service.ResetPasswordAsync(new ResetPasswordRequest("raw-reset-token", "another-password"));
        Assert.True(first.IsSuccess);
        Assert.False(second.IsSuccess);
        Assert.Equal("hash:new-password", fixture.Users.Single.PasswordHash);
        Assert.Null(fixture.Users.Single.ResetPasswordToken);
    }

    [Fact]
    public async Task GoogleLogin_AutoLinksVerifiedEmailWithoutOverwritingProfile()
    {
        var fixture = CreateFixture();
        var user = User.CreateWithPassword("learner@example.com", "Original Name", "hash:password");
        user.UpdateProfile("Original Name", "Existing bio");
        await fixture.Users.AddAsync(user);
        fixture.Google.User = new GoogleUserInfo("google-subject", "learner@example.com", "Google Name", true);
        var result = await fixture.Service.GoogleLoginAsync(new GoogleLoginRequest("valid-id-token"));
        Assert.True(result.IsSuccess);
        Assert.Equal("Original Name", fixture.Users.Single.FullName);
        Assert.Equal("Existing bio", fixture.Users.Single.Bio);
        Assert.Equal("google-subject", fixture.Users.Single.GoogleId);
        Assert.True(fixture.Users.Single.IsEmailVerified);
    }

    [Fact]
    public async Task GoogleLogin_RejectsConflictingSubject()
    {
        var fixture = CreateFixture();
        var user = User.CreateWithGoogle("learner@example.com", "Learner", "existing-subject", DateTime.UtcNow);
        await fixture.Users.AddAsync(user);
        fixture.Google.User = new GoogleUserInfo("different-subject", "learner@example.com", "Learner", true);
        var result = await fixture.Service.GoogleLoginAsync(new GoogleLoginRequest("valid-id-token"));
        Assert.Equal("GOOGLE_ACCOUNT_CONFLICT", ((AuthError)result.Error!).Code);
    }

    private static Fixture CreateFixture()
    {
        var users = new InMemoryUserRepository();
        var email = new RecordingEmailService();
        var google = new FakeGoogleVerifier();
        var service = new AuthService(
            users,
            new FakePasswordHasher(),
            new FakeTokenHelper(),
            new FakeJwtService(),
            google,
            email,
            new EmptyAssetRepository(),
            new DisabledAssetStorage(),
            new AuthApplicationOptions("https://localhost:5173"));
        return new Fixture(service, users, email, google);
    }

    private sealed record Fixture(AuthService Service, InMemoryUserRepository Users, RecordingEmailService Email, FakeGoogleVerifier Google);

    private sealed class FakePasswordHasher : IPasswordHasher
    {
        public string Hash(string password) => $"hash:{password}";
        public bool Verify(string password, string passwordHash) => passwordHash == Hash(password);
    }

    private sealed class FakeTokenHelper : ITokenHelper
    {
        public string GenerateOtp() => "123456";
        public string GenerateRawToken() => "raw-reset-token";
        public string HashOtp(string normalizedEmail, string otp) => $"otp:{normalizedEmail}:{otp}";
        public string HashToken(string rawToken) => $"token:{rawToken}";
    }

    private sealed class FakeJwtService : IJwtService
    {
        public string GenerateToken(UserProfileDto user) => $"jwt:{user.Id}";
    }

    private sealed class FakeGoogleVerifier : IGoogleIdTokenVerifier
    {
        public GoogleUserInfo User { get; set; } = new("subject", "google@example.com", "Google User", true);
        public Task<OperationResult<GoogleUserInfo>> VerifyAsync(string idToken, CancellationToken cancellationToken = default) =>
            Task.FromResult(OperationResult<GoogleUserInfo>.Success(User));
    }

    private sealed class RecordingEmailService : IEmailService
    {
        public bool Succeeds { get; set; } = true;
        public List<EmailMessage> Messages { get; } = [];
        public Task<bool> SendEmailAsync(EmailMessage message, CancellationToken cancellationToken = default)
        {
            Messages.Add(message);
            return Task.FromResult(Succeeds);
        }
    }

    private sealed class InMemoryUserRepository : IUserRepository
    {
        private readonly List<User> _users = [];
        public User Single => Assert.Single(_users);
        public Task<bool> EmailExistsAsync(string normalizedEmail, CancellationToken cancellationToken = default) => Task.FromResult(_users.Any(user => user.Email == normalizedEmail));
        public Task<User?> GetByEmailAsync(string normalizedEmail, CancellationToken cancellationToken = default) => Task.FromResult(_users.FirstOrDefault(user => user.Email == normalizedEmail));
        public Task<User?> GetByIdAsync(Guid userId, CancellationToken cancellationToken = default) => Task.FromResult(_users.FirstOrDefault(user => user.Id == userId));
        public Task AddAsync(User user, CancellationToken cancellationToken = default) { _users.Add(user); return Task.CompletedTask; }
        public Task UpdateAsync(User user, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task<VerificationOtpConsumeResult> ConsumeVerificationOtpAsync(string normalizedEmail, string otpHash, DateTime now, int maxFailedAttempts, CancellationToken cancellationToken = default)
        {
            var user = _users.FirstOrDefault(candidate => candidate.Email == normalizedEmail);
            if (user?.OtpCode != otpHash || user.OtpExpiresAt <= now || user.IsEmailVerified) return Task.FromResult(VerificationOtpConsumeResult.Invalid);
            user.MarkEmailVerified(now);
            return Task.FromResult(VerificationOtpConsumeResult.Verified);
        }
        public Task<bool> TryReplaceVerificationOtpAsync(Guid userId, string otpHash, DateTime expiresAt, DateTime resendAvailableAt, DateTime now, CancellationToken cancellationToken = default)
        {
            var user = _users.FirstOrDefault(candidate => candidate.Id == userId);
            if (user is null || user.IsEmailVerified || user.OtpResendAvailableAt > now) return Task.FromResult(false);
            user.IssueVerificationOtp(otpHash, expiresAt, resendAvailableAt);
            return Task.FromResult(true);
        }
        public Task<bool> ConsumePasswordResetAsync(string tokenHash, string passwordHash, DateTime now, CancellationToken cancellationToken = default)
        {
            var user = _users.FirstOrDefault(candidate => candidate.ResetPasswordToken == tokenHash && candidate.ResetPasswordExpiresAt > now);
            if (user is null) return Task.FromResult(false);
            user.UpdatePassword(passwordHash);
            return Task.FromResult(true);
        }
    }

    private sealed class EmptyAssetRepository : IAssetRepository
    {
        public Task AddAsync(Asset asset, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task<Asset?> GetByIdAsync(Guid assetId, CancellationToken cancellationToken = default) => Task.FromResult<Asset?>(null);
        public Task<Asset?> GetOwnedAsync(Guid userId, Guid assetId, CancellationToken cancellationToken = default) => Task.FromResult<Asset?>(null);
        public Task<IReadOnlyList<Asset>> GetOwnedAsync(Guid userId, IReadOnlyCollection<Guid> assetIds, CancellationToken cancellationToken = default) => Task.FromResult<IReadOnlyList<Asset>>([]);
        public Task<IReadOnlyList<Asset>> ListPendingCleanupCandidatesAsync(DateTime nowUtc, CancellationToken cancellationToken = default) => Task.FromResult<IReadOnlyList<Asset>>([]);
        public Task UpdateAsync(Asset asset, CancellationToken cancellationToken = default) => Task.CompletedTask;
    }

    private sealed class DisabledAssetStorage : IAssetObjectStorage
    {
        public AssetPresignedUpload CreatePresignedUpload(AssetUploadRequest request) => throw new NotSupportedException();
        public AssetPresignedDownload CreatePresignedDownload(AssetDownloadRequest request) => throw new NotSupportedException();
        public Task<AssetObjectMetadata?> GetObjectMetadataAsync(string objectKey, CancellationToken cancellationToken = default) => Task.FromResult<AssetObjectMetadata?>(null);
        public Task<byte[]?> GetObjectPrefixAsync(string objectKey, int maxBytes, CancellationToken cancellationToken = default) => Task.FromResult<byte[]?>(null);
        public Task DeleteIfExistsAsync(string objectKey, CancellationToken cancellationToken = default) => Task.CompletedTask;
    }
}
