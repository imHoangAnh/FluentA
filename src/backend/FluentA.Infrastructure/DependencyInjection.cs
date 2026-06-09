using FluentA.Application.BoundedContexts.Auth;
using FluentA.Application.BoundedContexts.Vocabulary;
using FluentA.Application.Common.Interfaces;
using FluentA.Infrastructure.Auth;
using FluentA.Infrastructure.Persistence;
using FluentA.Infrastructure.Vocabulary;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using StackExchange.Redis;

namespace FluentA.Infrastructure;

public static class DependencyInjection
{
    private const string DefaultPostgresConnection =
        "Host=localhost;Port=5432;Database=fluenta_dev;Username=fluenta;Password=fluenta_local_pass";
    private const string DefaultRedisConnection = "localhost:6379";

    public static IServiceCollection AddFluentAInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var postgresConnection = configuration.GetConnectionString("Postgres") ?? DefaultPostgresConnection;
        var redisConnection = configuration.GetConnectionString("Redis") ?? DefaultRedisConnection;

        services.AddDbContext<AppDbContext>(options => options.UseNpgsql(postgresConnection));
        services.TryAddSingleton<JwtSigningKeyProvider>();
        services.AddScoped<IUserRepository, EfUserRepository>();
        services.AddSingleton<IConnectionMultiplexer>(_ => ConnectionMultiplexer.Connect(redisConnection));
        services.AddSingleton<IRefreshTokenStore, RedisRefreshTokenStore>();
        services.AddSingleton<IPasswordHasher, BCryptPasswordHasher>();
        services.AddSingleton<ITokenService, JwtTokenService>();
        services.AddHttpClient<IGoogleOAuthClient, GoogleOAuthClient>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IVocabularyRepository, EfVocabularyRepository>();
        services.AddScoped<IVocabularyService, VocabularyService>();
        return services;
    }
}
