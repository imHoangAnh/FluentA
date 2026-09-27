using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using FluentA.Application.BoundedContexts.Auth;
using FluentA.Application.BoundedContexts.Auth.DTOs;
using Microsoft.IdentityModel.Tokens;

namespace FluentA.Infrastructure.Identity;

public sealed class JwtService : IJwtService
{
    public const string VersionClaim = "auth_ver";
    public const string CurrentVersion = "2";
    private static readonly TimeSpan AccessTokenLifetime = TimeSpan.FromMinutes(5);

    private readonly AuthSecurityOptions _options;
    private readonly SymmetricSecurityKey _key;

    public JwtService(AuthSecurityOptions options)
    {
        _options = options;
        var bytes = Encoding.UTF8.GetBytes(options.JwtKey);
        if (bytes.Length < 32) throw new InvalidOperationException("Jwt:Key must contain at least 32 UTF-8 bytes.");
        _key = new SymmetricSecurityKey(bytes);
    }

    public AccessTokenIssue GenerateToken(Guid userId, DateTime issuedAtUtc)
    {
        var issuedAt = DateTime.SpecifyKind(issuedAtUtc, DateTimeKind.Utc);
        issuedAt = issuedAt.AddTicks(-(issuedAt.Ticks % TimeSpan.TicksPerSecond));
        var expiresAt = issuedAt.Add(AccessTokenLifetime);
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
            new Claim(VersionClaim, CurrentVersion)
        };

        var token = new JwtSecurityToken(
            _options.JwtIssuer,
            _options.JwtAudience,
            claims,
            issuedAt,
            expiresAt,
            new SigningCredentials(_key, SecurityAlgorithms.HmacSha256));

        return new AccessTokenIssue(new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }
}
