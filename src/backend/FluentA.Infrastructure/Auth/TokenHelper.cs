using System.Security.Cryptography;
using System.Text;
using FluentA.Application.BoundedContexts.Auth;
using Microsoft.AspNetCore.WebUtilities;

namespace FluentA.Infrastructure.Auth;

public sealed class TokenHelper : ITokenHelper
{
    private readonly byte[] _otpHashKey;

    public TokenHelper(AuthSecurityOptions options)
    {
        _otpHashKey = Encoding.UTF8.GetBytes(options.OtpHashKey);
        if (_otpHashKey.Length < 32)
        {
            throw new InvalidOperationException("Authentication:OtpHashKey must contain at least 32 UTF-8 bytes.");
        }
    }

    public string GenerateOtp() => RandomNumberGenerator.GetInt32(100000, 1_000_000).ToString("D6");

    public string GenerateRawToken() => WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(32));

    public string HashOtp(string normalizedEmail, string otp)
    {
        using var hmac = new HMACSHA256(_otpHashKey);
        return Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes($"{normalizedEmail}:{otp}")));
    }

    public string HashToken(string rawToken) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken)));
}
