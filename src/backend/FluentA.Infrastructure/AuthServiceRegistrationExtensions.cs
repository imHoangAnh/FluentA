using FluentA.Application.BoundedContexts.Auth;
using FluentA.Application.Common.Interfaces;
using FluentA.Infrastructure.Email;
using FluentA.Infrastructure.Identity;
using FluentA.Infrastructure.Persistence.Repositories.Auth;
using Microsoft.Extensions.DependencyInjection;
using Resend;

namespace FluentA.Infrastructure;

internal static class AuthServiceRegistrationExtensions
{
    public static IServiceCollection AddFluentAAuthServices(
        this IServiceCollection services,
        AuthSecurityOptions authSecurityOptions)
    {
        services.AddScoped<IUserRepository, EfUserRepository>();
        services.AddSingleton<IPasswordHasher, BCryptPasswordHasher>();
        services.AddSingleton(authSecurityOptions);
        services.AddSingleton(new AuthApplicationOptions(authSecurityOptions.FrontendBaseUrl));
        services.AddSingleton<ITokenHelper, TokenHelper>();
        services.AddSingleton<IJwtService, JwtService>();
        services.AddSingleton<IGoogleIdTokenVerifier, GoogleIdTokenVerifier>();
        services.AddResend(options => options.ApiToken = authSecurityOptions.ResendApiKey);
        services.AddScoped<IEmailService, ResendEmailService>();
        services.AddScoped<IAuthService, AuthService>();
        return services;
    }
}
