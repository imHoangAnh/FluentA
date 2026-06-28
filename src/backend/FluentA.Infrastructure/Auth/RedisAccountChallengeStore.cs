using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using FluentA.Application.BoundedContexts.Auth;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace FluentA.Infrastructure.Auth;

public sealed class RedisAccountChallengeStore : IAccountChallengeStore
{
    private const int VerificationLifetimeSeconds = 10 * 60;
    private const int VerificationCooldownSeconds = 60;
    private const int VerificationAttemptLimit = 5;
    private const int PasswordResetLifetimeSeconds = 30 * 60;

    private const string ResendVerificationScript =
        """
        local resendAtTicks = redis.call('HGET', KEYS[1], 'resendAvailableAtTicks')
        if resendAtTicks and tonumber(resendAtTicks) > tonumber(ARGV[1]) then
            return {0, redis.call('HGET', KEYS[1], 'expiresAtUtc'), redis.call('HGET', KEYS[1], 'resendAvailableAtUtc')}
        end
        redis.call('HSET', KEYS[1],
            'userId', ARGV[2],
            'email', ARGV[3],
            'hash', ARGV[4],
            'salt', ARGV[5],
            'attempts', 0,
            'expiresAtUtc', ARGV[6],
            'resendAvailableAtUtc', ARGV[7],
            'resendAvailableAtTicks', ARGV[8])
        redis.call('EXPIRE', KEYS[1], tonumber(ARGV[9]))
        return {1, ARGV[6], ARGV[7]}
        """;

    private const string VerifyOtpScript =
        """
        local storedHash = redis.call('HGET', KEYS[1], 'hash')
        if not storedHash then
            return 0
        end
        if storedHash == ARGV[1] then
            redis.call('DEL', KEYS[1])
            return 1
        end
        local attempts = redis.call('HINCRBY', KEYS[1], 'attempts', 1)
        if tonumber(attempts) >= tonumber(ARGV[2]) then
            redis.call('DEL', KEYS[1])
        end
        return 0
        """;

    private const string IssuePasswordResetScript =
        """
        local previousKey = redis.call('GET', KEYS[2])
        if previousKey then
            redis.call('DEL', previousKey)
        end
        redis.call('HSET', KEYS[1],
            'userId', ARGV[1],
            'email', ARGV[2],
            'expiresAtUtc', ARGV[3])
        redis.call('EXPIRE', KEYS[1], tonumber(ARGV[4]))
        redis.call('SET', KEYS[2], KEYS[1], 'EX', tonumber(ARGV[4]))
        return 1
        """;

    private const string ConsumePasswordResetScript =
        """
        local userId = redis.call('HGET', KEYS[1], 'userId')
        if not userId then
            return nil
        end
        local pointerKey = ARGV[1] .. userId
        local currentKey = redis.call('GET', pointerKey)
        if currentKey == KEYS[1] then
            redis.call('DEL', pointerKey)
        end
        redis.call('DEL', KEYS[1])
        return userId
        """;

    private readonly IDatabase _database;
    private readonly byte[] _challengeKey;

    public RedisAccountChallengeStore(
        IConnectionMultiplexer connectionMultiplexer,
        IConfiguration configuration,
        ILogger<RedisAccountChallengeStore> logger)
    {
        _database = connectionMultiplexer.GetDatabase();
        _challengeKey = ResolveChallengeKey(configuration, logger);
    }

    public async Task<VerificationChallengeIssue> IssueVerificationAsync(Guid userId, string email, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var now = DateTime.UtcNow;
        var expiresAt = now.AddSeconds(VerificationLifetimeSeconds);
        var resendAvailableAt = now.AddSeconds(VerificationCooldownSeconds);
        var otp = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6", CultureInfo.InvariantCulture);
        var salt = Convert.ToHexString(RandomNumberGenerator.GetBytes(16));
        var hash = ProtectVerificationOtp(normalizedEmail, salt, otp);

        await _database.HashSetAsync(VerificationKey(normalizedEmail),
        [
            new HashEntry("userId", userId.ToString()),
            new HashEntry("email", normalizedEmail),
            new HashEntry("hash", hash),
            new HashEntry("salt", salt),
            new HashEntry("attempts", 0),
            new HashEntry("expiresAtUtc", expiresAt.ToString("O")),
            new HashEntry("resendAvailableAtUtc", resendAvailableAt.ToString("O")),
            new HashEntry("resendAvailableAtTicks", resendAvailableAt.Ticks)
        ]);
        await _database.KeyExpireAsync(VerificationKey(normalizedEmail), TimeSpan.FromSeconds(VerificationLifetimeSeconds));

        return new VerificationChallengeIssue(otp, expiresAt, resendAvailableAt);
    }

    public async Task<VerificationChallengeResendResult> ResendVerificationAsync(Guid userId, string email, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var now = DateTime.UtcNow;
        var expiresAt = now.AddSeconds(VerificationLifetimeSeconds);
        var resendAvailableAt = now.AddSeconds(VerificationCooldownSeconds);
        var otp = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6", CultureInfo.InvariantCulture);
        var salt = Convert.ToHexString(RandomNumberGenerator.GetBytes(16));
        var hash = ProtectVerificationOtp(normalizedEmail, salt, otp);

        var resultValue = await _database.ScriptEvaluateAsync(
            ResendVerificationScript,
            [VerificationKey(normalizedEmail)],
            [
                now.Ticks,
                userId.ToString(),
                normalizedEmail,
                hash,
                salt,
                expiresAt.ToString("O"),
                resendAvailableAt.ToString("O"),
                resendAvailableAt.Ticks,
                VerificationLifetimeSeconds
            ]);
        var result = (RedisResult[]?)resultValue;
        if (result is null || result.Length < 3)
        {
            throw new InvalidOperationException("Verification resend script returned an unexpected result.");
        }

        var isSuccess = (int)result[0] == 1;
        if (!isSuccess)
        {
            var existingExpiresAt = (string?)result[1] ?? expiresAt.ToString("O");
            var existingResendAt = (string?)result[2] ?? resendAvailableAt.ToString("O");
            return new VerificationChallengeResendResult(
                false,
                DateTime.Parse(existingExpiresAt, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind),
                DateTime.Parse(existingResendAt, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind));
        }

        return new VerificationChallengeResendResult(true, expiresAt, resendAvailableAt, otp);
    }

    public async Task<VerificationChallengeVerifyResult> VerifyVerificationOtpAsync(string email, string otp, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var entries = await _database.HashGetAllAsync(VerificationKey(normalizedEmail));
        if (entries.Length == 0)
        {
            return new VerificationChallengeVerifyResult(VerificationChallengeVerifyStatus.InvalidOrExpired);
        }

        var salt = entries.FirstOrDefault(entry => entry.Name == "salt").Value.ToString();
        if (string.IsNullOrWhiteSpace(salt))
        {
            return new VerificationChallengeVerifyResult(VerificationChallengeVerifyStatus.InvalidOrExpired);
        }

        var providedHash = ProtectVerificationOtp(normalizedEmail, salt, otp);
        var result = (int)await _database.ScriptEvaluateAsync(
            VerifyOtpScript,
            [VerificationKey(normalizedEmail)],
            [providedHash, VerificationAttemptLimit]);

        return new VerificationChallengeVerifyResult(
            result == 1 ? VerificationChallengeVerifyStatus.Verified : VerificationChallengeVerifyStatus.InvalidOrExpired);
    }

    public async Task<PasswordResetChallengeIssue> IssuePasswordResetAsync(Guid userId, string email, CancellationToken cancellationToken = default)
    {
        var token = ToBase64Url(RandomNumberGenerator.GetBytes(32));
        var tokenHash = ProtectPasswordResetToken(token);
        var expiresAt = DateTime.UtcNow.AddSeconds(PasswordResetLifetimeSeconds);
        var challengeKey = PasswordResetKey(tokenHash);
        var pointerKey = PasswordResetPointerKey(userId);

        await _database.ScriptEvaluateAsync(
            IssuePasswordResetScript,
            [challengeKey, pointerKey],
            [
                userId.ToString(),
                email.Trim().ToLowerInvariant(),
                expiresAt.ToString("O"),
                PasswordResetLifetimeSeconds
            ]);

        return new PasswordResetChallengeIssue(token, expiresAt);
    }

    public async Task<PasswordResetChallengeConsumeResult> ConsumePasswordResetAsync(string token, CancellationToken cancellationToken = default)
    {
        var tokenHash = ProtectPasswordResetToken(token);
        var userId = (string?)await _database.ScriptEvaluateAsync(
            ConsumePasswordResetScript,
            [PasswordResetKey(tokenHash)],
            ["auth:challenge:reset-user:"]);

        return Guid.TryParse(userId, out var parsedUserId)
            ? new PasswordResetChallengeConsumeResult(PasswordResetChallengeConsumeStatus.Consumed, parsedUserId)
            : new PasswordResetChallengeConsumeResult(PasswordResetChallengeConsumeStatus.InvalidOrExpired);
    }

    private string ProtectVerificationOtp(string email, string salt, string otp) => Protect($"verify|{email}|{salt}|{otp}");

    private string ProtectPasswordResetToken(string token) => Protect($"reset|{token}");

    private string Protect(string payload)
    {
        using var hmac = new HMACSHA256(_challengeKey);
        return Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(payload)));
    }

    private static string VerificationKey(string normalizedEmail) => $"auth:challenge:verify:{normalizedEmail}";

    private static string PasswordResetKey(string tokenHash) => $"auth:challenge:reset:{tokenHash}";

    private static string PasswordResetPointerKey(Guid userId) => $"auth:challenge:reset-user:{userId}";

    private static string ToBase64Url(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static byte[] ResolveChallengeKey(IConfiguration configuration, ILogger logger)
    {
        var configured = configuration["Authentication:ChallengeKey"];
        if (!string.IsNullOrWhiteSpace(configured))
        {
            return SHA256.HashData(Encoding.UTF8.GetBytes(configured));
        }

        var provider = configuration["Authentication:Email:Provider"];
        if (string.Equals(provider, "local", StringComparison.OrdinalIgnoreCase))
        {
            logger.LogWarning("Authentication:ChallengeKey is not configured. Local email challenges will be invalidated on API restart until a stable secret is supplied outside tracked files.");
            return RandomNumberGenerator.GetBytes(32);
        }

        logger.LogError("Authentication:ChallengeKey is not configured while non-local email delivery is enabled. OTP and password-reset challenges can be invalidated on API restart until a stable secret is supplied outside tracked files.");
        return RandomNumberGenerator.GetBytes(32);
    }
}
