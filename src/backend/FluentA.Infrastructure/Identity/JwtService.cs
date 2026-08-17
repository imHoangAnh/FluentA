using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using FluentA.Application.BoundedContexts.Auth;
using FluentA.Application.BoundedContexts.Auth.DTOs;
using Microsoft.IdentityModel.Tokens;

namespace FluentA.Infrastructure.Identity;

public sealed class JwtService : IJwtService
{
    private readonly AuthSecurityOptions _options;
    private readonly SymmetricSecurityKey _key;

    public JwtService(AuthSecurityOptions options)
    {
        _options = options;
        var bytes = Encoding.UTF8.GetBytes(options.JwtKey);
        if (bytes.Length < 32)
        {
            throw new InvalidOperationException("Jwt:Key must contain at least 32 UTF-8 bytes.");
        }

        _key = new SymmetricSecurityKey(bytes);
    }

    public string GenerateToken(UserProfileDto user)
    {
        var now = DateTime.UtcNow;
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N"))
        };

        var token = new JwtSecurityToken(
            _options.JwtIssuer,
            _options.JwtAudience,
            claims,
            now,
            now.AddDays(7),
            new SigningCredentials(_key, SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
