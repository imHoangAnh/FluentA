using Amazon.S3;
using FluentA.Application.BoundedContexts.Assets;
using FluentA.Application.BoundedContexts.Auth;
using FluentA.Application.BoundedContexts.Countdown;
using FluentA.Application.BoundedContexts.Flashcards;
using FluentA.Application.BoundedContexts.Habit;
using FluentA.Application.BoundedContexts.Journal;
using FluentA.Application.BoundedContexts.Kanban;
using FluentA.Application.BoundedContexts.Pomodoro;
using FluentA.Application.BoundedContexts.Todo;
using FluentA.Application.BoundedContexts.Vocabulary;
using FluentA.Application.Common.Interfaces;
using FluentA.Infrastructure.Assets;
using FluentA.Application.BackgroundJobs;
using FluentA.Infrastructure.BackgroundJobs;
using Hangfire;
using Hangfire.PostgreSql;
using FluentA.Infrastructure.Auth;
using FluentA.Infrastructure.Countdown;
using FluentA.Infrastructure.Flashcards;
using FluentA.Infrastructure.Habit;
using FluentA.Infrastructure.Journal;
using FluentA.Infrastructure.Kanban;
using FluentA.Infrastructure.Persistence;
using FluentA.Infrastructure.Pomodoro;
using FluentA.Infrastructure.Todo;
using FluentA.Infrastructure.Vocabulary;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Npgsql;
using StackExchange.Redis;

namespace FluentA.Infrastructure;

public static class DependencyInjection
{
    private const string DefaultPostgresConnection =
        "Host=localhost;Port=5432;Database=fluenta_dev;Username=fluenta;Password=fluenta_local_pass";
    private const string DefaultRedisConnection = "localhost:6379";
    private const int DefaultPostgresMinPoolSize = 0;
    private const int DefaultPostgresMaxPoolSize = 30;
    private const int DefaultPostgresConnectionTimeoutSeconds = 15;
    private const int DefaultPostgresCommandTimeoutSeconds = 30;
    private const int DefaultHangfireWorkerCount = 5;

    public static IServiceCollection AddFluentAInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var postgresConnection = BuildPostgresConnectionString(configuration.GetConnectionString("Postgres") ?? DefaultPostgresConnection, configuration);
        var postgresCommandTimeoutSeconds = GetPositiveInt(
            configuration,
            "Database:Postgres:CommandTimeoutSeconds",
            DefaultPostgresCommandTimeoutSeconds);
        var hangfireWorkerCount = GetPositiveInt(
            configuration,
            "Hangfire:WorkerCount",
            DefaultHangfireWorkerCount);
        var redisConnection = configuration.GetConnectionString("Redis") ?? DefaultRedisConnection;
        var assetStorageOptions = AssetStorageOptions.FromConfiguration(configuration);

        services.AddDbContext<AppDbContext>(options => options.UseNpgsql(
            postgresConnection,
            npgsqlOptions => npgsqlOptions.CommandTimeout(postgresCommandTimeoutSeconds)));
        services.AddHangfire(configuration => configuration.UsePostgreSqlStorage(options => options.UseNpgsqlConnection(postgresConnection)));
        services.AddHangfireServer(options => options.WorkerCount = hangfireWorkerCount);
        services.AddScoped<IScheduledProductivityJobs, ScheduledProductivityJobs>();
        services.TryAddSingleton<JwtSigningKeyProvider>();
        services.AddScoped<IUserRepository, EfUserRepository>();
        services.AddScoped<IAssetRepository, EfAssetRepository>();
        services.AddScoped<IAssetService, AssetService>();
        services.AddSingleton<IConnectionMultiplexer>(_ => ConnectionMultiplexer.Connect(redisConnection));
        services.AddSingleton<IRefreshTokenStore, RedisRefreshTokenStore>();
        services.AddSingleton<IAccountChallengeStore, RedisAccountChallengeStore>();
        services.AddSingleton(assetStorageOptions);
        if (assetStorageOptions.Enabled)
        {
            services.AddSingleton<IAmazonS3>(_ => CreateAssetStorageClient(assetStorageOptions));
            services.AddSingleton<IAssetObjectStorage, MinioAssetObjectStorage>();
        }
        else
        {
            services.AddSingleton<IAssetObjectStorage, DisabledAssetObjectStorage>();
        }
        services.AddSingleton<IPasswordHasher, BCryptPasswordHasher>();
        services.AddSingleton<ITokenService, JwtTokenService>();
        services.AddHttpClient<IGoogleOAuthClient, GoogleOAuthClient>();
        if (string.Equals(configuration["Authentication:Email:Provider"], "gmail-smtp", StringComparison.OrdinalIgnoreCase))
        {
            services.AddSingleton<IAccountEmailSender, GmailSmtpAccountEmailSender>();
        }
        else
        {
            services.AddSingleton<IAccountEmailSender, LocalAccountEmailSender>();
        }

        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IFlashcardRepository, EfFlashcardRepository>();
        services.AddScoped<IFlashcardService, FlashcardService>();
        services.AddScoped<IVocabularyRepository, EfVocabularyRepository>();
        services.AddScoped<IVocabularyService, VocabularyService>();
        services.AddScoped<ITodoRepository, EfTodoRepository>();
        services.AddScoped<ITodoService, TodoService>();
        services.AddScoped<ICountdownRepository, EfCountdownRepository>();
        services.AddScoped<ICountdownService, CountdownService>();
        services.AddScoped<IHabitRepository, EfHabitRepository>();
        services.AddScoped<IHabitService, HabitService>();
        services.AddScoped<IJournalRepository, EfJournalRepository>();
        services.AddSingleton<IJournalContentProcessor, JournalContentProcessor>();
        services.AddScoped<IJournalService, JournalService>();
        services.AddScoped<IKanbanRepository, EfKanbanRepository>();
        services.AddScoped<IKanbanService, KanbanService>();
        services.AddScoped<IPomodoroRepository, EfPomodoroRepository>();
        services.AddSingleton<IPomodoroCurrentStateStore, RedisPomodoroCurrentStateStore>();
        services.AddScoped<IPomodoroService, PomodoroService>();
        return services;
    }

    private static IAmazonS3 CreateAssetStorageClient(AssetStorageOptions options)
    {
        options.Validate();

        var endpoint = new Uri(options.Endpoint, UriKind.Absolute);
        return new AmazonS3Client(
            options.AccessKey,
            options.SecretKey,
            new AmazonS3Config
            {
                ServiceURL = options.Endpoint,
                ForcePathStyle = options.UsePathStyle,
                AuthenticationRegion = options.Region,
                UseHttp = string.Equals(endpoint.Scheme, Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase)
            });
    }

    private static string BuildPostgresConnectionString(string connectionString, IConfiguration configuration)
    {
        var builder = new NpgsqlConnectionStringBuilder(connectionString)
        {
            Pooling = true,
            MinPoolSize = GetNonNegativeInt(configuration, "Database:Postgres:MinPoolSize", DefaultPostgresMinPoolSize),
            MaxPoolSize = GetPositiveInt(configuration, "Database:Postgres:MaxPoolSize", DefaultPostgresMaxPoolSize),
            Timeout = GetPositiveInt(
                configuration,
                "Database:Postgres:ConnectionTimeoutSeconds",
                DefaultPostgresConnectionTimeoutSeconds),
            CommandTimeout = GetPositiveInt(
                configuration,
                "Database:Postgres:CommandTimeoutSeconds",
                DefaultPostgresCommandTimeoutSeconds),
            ApplicationName = configuration["Database:Postgres:ApplicationName"] ?? "FluentA.Api"
        };

        return builder.ConnectionString;
    }

    private static int GetPositiveInt(IConfiguration configuration, string key, int fallback)
    {
        var value = configuration.GetValue<int?>(key);
        return value is > 0 ? value.Value : fallback;
    }

    private static int GetNonNegativeInt(IConfiguration configuration, string key, int fallback)
    {
        var value = configuration.GetValue<int?>(key);
        return value is >= 0 ? value.Value : fallback;
    }
}
