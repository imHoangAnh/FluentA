using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using FluentA.Application.BoundedContexts.Auth.DTOs;
using FluentA.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace FluentA.Infrastructure.Auth;

public sealed class JwtTokenService : ITokenService
{
    private readonly JwtSigningKeyProvider _keyProvider;
    private readonly IConfiguration _configuration;

    public JwtTokenService(JwtSigningKeyProvider keyProvider, IConfiguration configuration)
    {
        _keyProvider = keyProvider;
        _configuration = configuration;
    }

    public string CreateAccessToken(UserProfileDto user)
    {
        var now = DateTime.UtcNow;
        var credentials = new SigningCredentials(_keyProvider.Key, SecurityAlgorithms.RsaSha256);
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim("name", user.FullName)
        };

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"] ?? "FluentA.Local",
            audience: _configuration["Jwt:Audience"] ?? "FluentA.Client",
            claims: claims,
            notBefore: now,
            expires: now.AddHours(1),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string CreateEmailVerificationToken(UserProfileDto user)
    {
        var now = DateTime.UtcNow;
        var credentials = new SigningCredentials(_keyProvider.Key, SecurityAlgorithms.RsaSha256);
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim("token_use", "email_verification")
        };

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"] ?? "FluentA.Local",
            audience: _configuration["Jwt:Audience"] ?? "FluentA.Client",
            claims: claims,
            notBefore: now,
            expires: now.AddHours(24),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public Guid? ReadEmailVerificationUserId(string token)
    {
        try
        {
            var principal = new JwtSecurityTokenHandler().ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = _configuration["Jwt:Issuer"] ?? "FluentA.Local",
                ValidateAudience = true,
                ValidAudience = _configuration["Jwt:Audience"] ?? "FluentA.Client",
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = _keyProvider.Key,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(1)
            }, out _);

            var tokenUse = principal.Claims.FirstOrDefault(claim => claim.Type == "token_use")?.Value;
            var subject = principal.Claims.FirstOrDefault(claim => claim.Type == JwtRegisteredClaimNames.Sub)?.Value
                ?? principal.Claims.FirstOrDefault(claim => claim.Type == ClaimTypes.NameIdentifier)?.Value;
            return tokenUse == "email_verification" && Guid.TryParse(subject, out var userId)
                ? userId
                : null;
        }
        catch
        {
            return null;
        }
    }
}
