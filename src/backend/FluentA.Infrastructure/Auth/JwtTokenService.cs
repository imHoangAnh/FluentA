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

}
