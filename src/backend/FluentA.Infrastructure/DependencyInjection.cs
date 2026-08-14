using System.Globalization;
using Amazon;
using Amazon.S3;
using FluentA.Application.BoundedContexts.Assets;
using FluentA.Application.BoundedContexts.Auth;
using FluentA.Application.BoundedContexts.Countdown;
using FluentA.Application.BoundedContexts.Flashcards;
using FluentA.Application.BoundedContexts.Habit;
using FluentA.Application.BoundedContexts.Journal;
using FluentA.Application.BoundedContexts.Project;
using FluentA.Application.BoundedContexts.Note;
using FluentA.Application.BoundedContexts.Notification;
using FluentA.Application.BoundedContexts.Pomodoro;
using FluentA.Application.BoundedContexts.Practice;
using FluentA.Application.BoundedContexts.Pronunciation;
using FluentA.Application.BoundedContexts.Review;
using FluentA.Application.BoundedContexts.Todo;
using FluentA.Application.BoundedContexts.Trash;
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
using FluentA.Infrastructure.Project;
using FluentA.Infrastructure.Note;
using FluentA.Infrastructure.Notification;
using FluentA.Infrastructure.Persistence;
using FluentA.Infrastructure.Pomodoro;
using FluentA.Infrastructure.Practice;
using FluentA.Infrastructure.Pronunciation;
using FluentA.Infrastructure.Review;
using FluentA.Infrastructure.Todo;
using FluentA.Infrastructure.Trash;
using FluentA.Infrastructure.Vocabulary;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Npgsql;
using Resend;

namespace FluentA.Infrastructure;

public static class DependencyInjection
{
    private const string DefaultPostgresConnection =
        "Host=localhost;Port=5432;Database=fluenta_dev;Username=fluenta;Password=fluenta_dev";
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
        var assetStorageOptions = AssetStorageOptions.FromConfiguration(configuration);
        var pronunciationOptions = CreatePronunciationOptions(configuration);
        var authSecurityOptions = AuthSecurityOptions.FromConfiguration(configuration);

        services.AddDbContext<AppDbContext>(options => options.UseNpgsql(
            postgresConnection,
            npgsqlOptions => npgsqlOptions.CommandTimeout(postgresCommandTimeoutSeconds)));
        services.AddHangfire(configuration => configuration.UsePostgreSqlStorage(options => options.UseNpgsqlConnection(postgresConnection)));
        services.AddHangfireServer(options => options.WorkerCount = hangfireWorkerCount);
        services.AddFluentAFeatureServices(assetStorageOptions, authSecurityOptions, pronunciationOptions);
        return services;
    }

    private static PronunciationAssessmentOptions CreatePronunciationOptions(IConfiguration configuration)
    {
        var threshold = double.TryParse(
            configuration["AzureSpeech:AccuracyThreshold"],
            NumberStyles.Float,
            CultureInfo.InvariantCulture,
            out var configuredThreshold)
            ? configuredThreshold
            : 80d;
        var completenessThreshold = double.TryParse(
            configuration["AzureSpeech:CompletenessThreshold"],
            NumberStyles.Float,
            CultureInfo.InvariantCulture,
            out var configuredCompletenessThreshold)
            ? configuredCompletenessThreshold
            : 90d;
        var wordAccuracyThreshold = double.TryParse(
            configuration["AzureSpeech:WordAccuracyThreshold"],
            NumberStyles.Float,
            CultureInfo.InvariantCulture,
            out var configuredWordAccuracyThreshold)
            ? configuredWordAccuracyThreshold
            : 70d;

        return new PronunciationAssessmentOptions(
            configuration.GetValue<bool>("AzureSpeech:Enabled"),
            configuration["AzureSpeech:Region"]?.Trim() ?? string.Empty,
            configuration["AzureSpeech:SubscriptionKey"] ?? string.Empty,
            GetPositiveInt(configuration, "AzureSpeech:TimeoutSeconds", 10),
            threshold,
            completenessThreshold,
            wordAccuracyThreshold);
    }

    internal static IAmazonS3 CreateAssetStorageClient(AssetStorageOptions options)
    {
        options.Validate();

        if (options.Provider == AssetStorageProvider.S3)
        {
            return new AmazonS3Client(new AmazonS3Config
            {
                RegionEndpoint = RegionEndpoint.GetBySystemName(options.Region),
                ForcePathStyle = false
            });
        }

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
