using System.IdentityModel.Tokens.Jwt;
using FluentA.Application.BoundedContexts.Auth.DTOs;
using FluentA.Infrastructure.Identity;

namespace FluentA.Application.UnitTests;

public sealed class AuthCryptographyTests
{
    private static readonly AuthSecurityOptions Options = new(
        "test-jwt-key-that-is-at-least-thirty-two-bytes",
        "FluentA.Test",
        "FluentA.Test.Web",
        "test-otp-hmac-key-that-is-at-least-thirty-two-bytes",
        "google-client-id",
        "resend-key",
        "FluentA <noreply@example.com>",
        "https://localhost:5173");

    [Fact]
    public void Otp_IsAlwaysSixDigitsInTheApprovedRange()
    {
        var helper = new TokenHelper(Options);
        for (var index = 0; index < 100; index++)
        {
            var otp = helper.GenerateOtp();
            Assert.Matches("^[0-9]{6}$", otp);
            Assert.InRange(int.Parse(otp), 100000, 999999);
        }
    }

    [Fact]
    public void OtpHash_IsEmailBoundAndDoesNotStoreTheRawCode()
    {
        var helper = new TokenHelper(Options);
        var first = helper.HashOtp("first@example.com", "123456");
        var second = helper.HashOtp("second@example.com", "123456");
        Assert.NotEqual("123456", first);
        Assert.Equal(64, first.Length);
        Assert.NotEqual(first, second);
    }

    [Fact]
    public void ResetToken_HasRandom256BitSourceAndStableSha256Digest()
    {
        var helper = new TokenHelper(Options);
        var first = helper.GenerateRawToken();
        var second = helper.GenerateRawToken();
        Assert.NotEqual(first, second);
        Assert.Equal(64, helper.HashToken(first).Length);
        Assert.Equal(helper.HashToken(first), helper.HashToken(first));
    }

    [Fact]
    public void Jwt_IsHs256AndExpiresAfterSevenDays()
    {
        var service = new JwtService(Options);
        var user = new UserProfileDto(Guid.NewGuid(), "learner@example.com", "Learner", true);
        var token = new JwtSecurityTokenHandler().ReadJwtToken(service.GenerateToken(user));
        Assert.Equal("HS256", token.Header.Alg);
        Assert.Equal(user.Id.ToString(), token.Subject);
        Assert.InRange(token.ValidTo - token.ValidFrom, TimeSpan.FromDays(7).Subtract(TimeSpan.FromSeconds(1)), TimeSpan.FromDays(7).Add(TimeSpan.FromSeconds(1)));
        Assert.False(string.IsNullOrWhiteSpace(token.Id));
    }
}
