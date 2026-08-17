using System.Text;
using FluentA.API.Contracts;
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
                ClockSkew = TimeSpan.FromMinutes(1)
            };
            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    context.Token = context.Request.Cookies["access_token"];
                    return Task.CompletedTask;
                },
                OnChallenge = async context =>
                {
                    context.HandleResponse();
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    await context.Response.WriteAsJsonAsync(ApiEnvelope<object>.Fail(new ApiErrorEnvelope(
                        "UNAUTHORIZED", "Missing or invalid authentication credentials.")));
                }
            };
        });
        services.AddAuthorization();
        return services;
    }
}
