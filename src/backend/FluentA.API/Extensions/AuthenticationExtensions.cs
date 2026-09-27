using System.IdentityModel.Tokens.Jwt;
using System.Text;
using FluentA.API.Contracts;
using FluentA.Application.BoundedContexts.Auth;
using FluentA.Infrastructure.Identity;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

namespace FluentA.API.Extensions;

public static class AuthenticationExtensions
{
    public static IServiceCollection AddFluentAAuthentication(
        this IServiceCollection services,
        AuthSecurityOptions authOptions)
    {
        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(authOptions.JwtKey));
        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = authOptions.JwtIssuer,
                ValidateAudience = true,
                ValidAudience = authOptions.JwtAudience,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = signingKey,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero,
                RequireExpirationTime = true
            };
            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    context.Token = context.Request.Cookies["access_token"];
                    return Task.CompletedTask;
                },
                OnTokenValidated = context =>
                {
                    var version = context.Principal?.FindFirst(JwtService.VersionClaim)?.Value;
                    if (!string.Equals(version, JwtService.CurrentVersion, StringComparison.Ordinal))
                    {
                        context.Fail("Unsupported authentication token version.");
                    }
                    return Task.CompletedTask;
                },
                OnChallenge = async context =>
                {
                    context.HandleResponse();
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    context.Response.Headers.CacheControl = "no-store";
                    var failure = context.AuthenticateFailure;
                    var hasAccessCookie = !string.IsNullOrWhiteSpace(context.Request.Cookies["access_token"]);
                    var (code, message) = failure is SecurityTokenExpiredException
                        ? ("ACCESS_TOKEN_EXPIRED", "The access token has expired.")
                        : !hasAccessCookie
                            ? ("AUTHENTICATION_REQUIRED", "Authentication is required.")
                            : ("ACCESS_TOKEN_INVALID", "The access token is invalid.");
                    await context.Response.WriteAsJsonAsync(ApiEnvelope<object>.Fail(new ApiErrorEnvelope(
                        code, message)));
                }
            };
        });
        services.AddAuthorization();
        return services;
    }
}
