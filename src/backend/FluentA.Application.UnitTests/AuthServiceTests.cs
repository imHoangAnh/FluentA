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
        var startedAtUtc = DateTime.UtcNow;
        var result = await fixture.Service.RegisterAsync(new RegisterRequest("Learner@Example.com", "SecurePass123", "FluentA Learner"));
        Assert.True(result.IsSuccess);
        Assert.Equal("otp:learner@example.com:123456", fixture.Users.Single.OtpHash);
        Assert.NotEqual("123456", fixture.Users.Single.OtpHash);
        Assert.Contains("123456", fixture.Email.Messages.Single().TextBody);
        Assert.InRange(result.Value!.VerificationExpiresAtUtc - startedAtUtc,
            TimeSpan.FromMinutes(5).Subtract(TimeSpan.FromSeconds(1)),
            TimeSpan.FromMinutes(5).Add(TimeSpan.FromSeconds(1)));
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
    public async Task Register_ReusesExistingUnverifiedUserAfterRefresh()
    {
        var fixture = CreateFixture();
        var first = await fixture.Service.RegisterAsync(new RegisterRequest("learner@example.com", "SecurePass123", "Learner"));
        var userId = fixture.Users.Single.Id;

        var second = await fixture.Service.RegisterAsync(new RegisterRequest("LEARNER@example.com", "UpdatedPass123", "Updated Learner"));

        Assert.True(first.IsSuccess);
        Assert.True(second.IsSuccess);
        Assert.Equal(userId, fixture.Users.Single.Id);
        Assert.Equal("Updated Learner", fixture.Users.Single.FullName);
        Assert.Equal("hash:UpdatedPass123", fixture.Users.Single.PasswordHash);
        Assert.Contains("verification code sent", second.Value!.Message);
        Assert.Equal(2, fixture.Email.Messages.Count);

        var verified = await fixture.Service.VerifyOtpAsync(new VerifyOtpRequest("learner@example.com", "123457"));
        var login = await fixture.Service.LoginAsync(new LoginRequest("learner@example.com", "UpdatedPass123"));
        Assert.True(verified.IsSuccess);
        Assert.True(login.IsSuccess);
    }

    [Fact]
    public async Task Register_StillRejectsExistingVerifiedUser()
    {
        var fixture = CreateFixture();
        var user = User.CreateWithPassword("learner@example.com", "Learner", "hash:old-password");
        user.MarkEmailVerified(DateTime.UtcNow);
        await fixture.Users.AddAsync(user);

        var result = await fixture.Service.RegisterAsync(new RegisterRequest("LEARNER@example.com", "SecurePass123", "Learner"));

        Assert.False(result.IsSuccess);
        Assert.Equal("EMAIL_ALREADY_EXISTS", ((AuthError)result.Error!).Code);
        Assert.Empty(fixture.Email.Messages);
    }

    [Fact]
    public async Task VerifyOtp_ConsumesChallengeAndEnablesPasswordLogin()
    {
        var fixture = CreateFixture();
        await fixture.Service.RegisterAsync(new RegisterRequest("learner@example.com", "SecurePass123", "Learner"));
        var before = await fixture.Service.LoginAsync(new LoginRequest("learner@example.com", "SecurePass123"));
        var verified = await fixture.Service.VerifyOtpAsync(new VerifyOtpRequest("learner@example.com", "123456"));
        var login = await fixture.Service.LoginAsync(new LoginRequest("learner@example.com", "SecurePass123"));
        Assert.True(before.IsSuccess);
        Assert.Equal("VERIFY_EMAIL", before.Value!.NextStep);
        Assert.True(verified.IsSuccess);
        Assert.True(login.IsSuccess);
        Assert.StartsWith("jwt:", login.Value!.AccessToken);
    }

    [Fact]
    public async Task Resend_ReplacesOtpWithoutCooldown()
    {
        var fixture = CreateFixture();
        await fixture.Service.RegisterAsync(new RegisterRequest("learner@example.com", "SecurePass123", "Learner"));
        var firstOtpHash = fixture.Users.Single.OtpHash;
        var result = await fixture.Service.ResendVerificationOtpAsync(new ResendVerificationOtpRequest("learner@example.com"));

        Assert.True(result.IsSuccess);
        Assert.NotEqual(firstOtpHash, fixture.Users.Single.OtpHash);
        Assert.Contains("123457", fixture.Email.Messages[1].TextBody);
        Assert.False((await fixture.Service.VerifyOtpAsync(new VerifyOtpRequest("learner@example.com", "123456"))).IsSuccess);
        Assert.True((await fixture.Service.VerifyOtpAsync(new VerifyOtpRequest("learner@example.com", "123457"))).IsSuccess);
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
        Assert.Null(fixture.Users.Single.ResetPasswordTokenHash);
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
        var refreshTokens = new InMemoryRefreshTokenRepository(users);
        var email = new RecordingEmailService();
        var google = new FakeGoogleVerifier();
        var service = new AuthService(
            users,
            refreshTokens,
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
        private int _otpSequence;
        public string GenerateOtp() => (123456 + _otpSequence++).ToString();
        public string GenerateRawToken() => "raw-reset-token";
        public string HashOtp(string normalizedEmail, string otp) => $"otp:{normalizedEmail}:{otp}";
        public string HashToken(string rawToken) => $"token:{rawToken}";
    }

    private sealed class FakeJwtService : IJwtService
    {
        public AccessTokenIssue GenerateToken(Guid userId, DateTime issuedAtUtc) =>
            new($"jwt:{userId}", issuedAtUtc.AddMinutes(5));
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
        public Action<Guid>? RevokeRefreshTokensForUser { get; set; }
        public Task<User?> GetByEmailAsync(string normalizedEmail, CancellationToken cancellationToken = default) => Task.FromResult(_users.FirstOrDefault(user => user.Email == normalizedEmail));
        public Task<User?> GetByIdAsync(Guid userId, CancellationToken cancellationToken = default) => Task.FromResult(_users.FirstOrDefault(user => user.Id == userId));
        public Task AddAsync(User user, CancellationToken cancellationToken = default) { _users.Add(user); return Task.CompletedTask; }
        public Task<bool> TryUpsertUnverifiedRegistrationAsync(User user, CancellationToken cancellationToken = default)
        {
            var existing = _users.FirstOrDefault(candidate => candidate.Email == user.Email);
            if (existing is null)
            {
                _users.Add(user);
                return Task.FromResult(true);
            }

            if (existing.IsEmailVerified) return Task.FromResult(false);
            existing.RestartPasswordRegistration(user.FullName, user.PasswordHash!);
            existing.IssueVerificationOtp(user.OtpHash!, user.OtpExpiresAt!.Value);
            return Task.FromResult(true);
        }

        public Task<VerificationOtpConsumeResult> ConsumeVerificationOtpAsync(string normalizedEmail, string otpHash, DateTime now, CancellationToken cancellationToken = default)
        {
            var user = _users.FirstOrDefault(candidate => candidate.Email == normalizedEmail);
            if (user is null || user.OtpHash != otpHash || user.OtpExpiresAt is null || user.OtpExpiresAt <= now || user.IsEmailVerified)
                return Task.FromResult(VerificationOtpConsumeResult.Invalid);
            user.MarkEmailVerified(now);
            return Task.FromResult(VerificationOtpConsumeResult.Verified);
        }
        public Task<bool> TryReplaceVerificationOtpAsync(Guid userId, string otpHash, DateTime expiresAt, DateTime now, CancellationToken cancellationToken = default)
        {
            var user = _users.FirstOrDefault(candidate => candidate.Id == userId);
            if (user is null || user.IsEmailVerified) return Task.FromResult(false);
            user.IssueVerificationOtp(otpHash, expiresAt);
            return Task.FromResult(true);
        }
        public Task<bool> TrySetPasswordResetAsync(string normalizedEmail, string tokenHash, DateTime expiresAt, DateTime now, CancellationToken cancellationToken = default)
        {
            var user = _users.FirstOrDefault(candidate => candidate.Email == normalizedEmail && candidate.PasswordHash is not null);
            if (user is null) return Task.FromResult(false);
            user.IssuePasswordReset(tokenHash, expiresAt);
            return Task.FromResult(true);
        }
        public Task<bool> ConsumePasswordResetAsync(string tokenHash, string passwordHash, DateTime now, CancellationToken cancellationToken = default)
        {
            var user = _users.FirstOrDefault(candidate => candidate.ResetPasswordTokenHash == tokenHash && candidate.ResetPasswordExpiresAt > now);
            if (user is null) return Task.FromResult(false);
            user.UpdatePassword(passwordHash);
            RevokeRefreshTokensForUser?.Invoke(user.Id);
            return Task.FromResult(true);
        }
        public Task<bool> UpdateProfileAsync(User user, CancellationToken cancellationToken = default) => Task.FromResult(_users.Contains(user));
    }

    private sealed class InMemoryRefreshTokenRepository : IRefreshTokenRepository
    {
        private readonly InMemoryUserRepository _users;
        private readonly List<StoredRefreshToken> _tokens = [];

        public InMemoryRefreshTokenRepository(InMemoryUserRepository users)
        {
            _users = users;
            users.RevokeRefreshTokensForUser = RevokeForUser;
        }

        public async Task<AccessTokenIssue?> TryCreateForPasswordLoginAsync(
            Guid userId,
            string tokenHash,
            DateTime createdAt,
            DateTime expiresAt,
            string expectedPasswordHash,
            Func<Guid, AccessTokenIssue> issueAccessToken,
            CancellationToken cancellationToken = default)
        {
            var user = await _users.GetByIdAsync(userId, cancellationToken);
            if (user is null || !user.IsEmailVerified || user.PasswordHash != expectedPasswordHash) return null;
            user.RecordLogin(createdAt);
            _tokens.Add(new StoredRefreshToken(userId, tokenHash, expiresAt));
            return issueAccessToken(userId);
        }

        public async Task<GoogleLoginSessionResult> TryCreateForGoogleLoginAsync(
            string normalizedEmail,
            string fullName,
            string googleSubject,
            string tokenHash,
            DateTime createdAt,
            DateTime expiresAt,
            Func<Guid, AccessTokenIssue> issueAccessToken,
            CancellationToken cancellationToken = default)
        {
            var user = await _users.GetByEmailAsync(normalizedEmail, cancellationToken);
            if (user?.GoogleId is not null && user.GoogleId != googleSubject)
                return new GoogleLoginSessionResult(GoogleLoginResult.AccountConflict, null);
            if (user is null)
            {
                user = User.CreateWithGoogle(normalizedEmail, fullName, googleSubject, createdAt);
                await _users.AddAsync(user, cancellationToken);
            }
            else if (user.GoogleId is null)
            {
                user.LinkGoogleAccount(googleSubject, createdAt);
            }

            user.RecordLogin(createdAt);
            _tokens.Add(new StoredRefreshToken(user.Id, tokenHash, expiresAt));
            return new GoogleLoginSessionResult(GoogleLoginResult.Authenticated, issueAccessToken(user.Id));
        }

        public async Task<RefreshResponse?> IssueAccessTokenAsync(
            string tokenHash,
            Func<Guid, AccessTokenIssue> issueAccessToken,
            CancellationToken cancellationToken = default)
        {
            var stored = _tokens.FirstOrDefault(token => token.TokenHash == tokenHash && !token.Revoked && token.ExpiresAt > DateTime.UtcNow);
            if (stored is null || await _users.GetByIdAsync(stored.UserId, cancellationToken) is null) return null;
            var access = issueAccessToken(stored.UserId);
            return new RefreshResponse(access.Token, access.ExpiresAtUtc);
        }

        public Task RevokeAsync(string tokenHash, CancellationToken cancellationToken = default)
        {
            var stored = _tokens.FirstOrDefault(token => token.TokenHash == tokenHash);
            if (stored is not null) stored.Revoked = true;
            return Task.CompletedTask;
        }

        private void RevokeForUser(Guid userId)
        {
            foreach (var token in _tokens.Where(token => token.UserId == userId)) token.Revoked = true;
        }

        private sealed class StoredRefreshToken(Guid userId, string tokenHash, DateTime expiresAt)
        {
            public Guid UserId { get; } = userId;
            public string TokenHash { get; } = tokenHash;
            public DateTime ExpiresAt { get; } = expiresAt;
            public bool Revoked { get; set; }
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
