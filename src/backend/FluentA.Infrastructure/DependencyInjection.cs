using System.Globalization;
using Amazon;
using Amazon.Runtime;
using Amazon.S3;
using FluentA.Application.BoundedContexts.Pronunciation;
using Hangfire;
using Hangfire.PostgreSql;
using FluentA.Infrastructure.Identity;
using FluentA.Infrastructure.ObjectStorage.Assets;
using FluentA.Infrastructure.Persistence;
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

    internal static AssetStorageClients CreateAssetStorageClients(AssetStorageOptions options)
    {
        options.Validate();

        var operations = CreateAssetStorageClient(options, options.Endpoint);
        if (string.IsNullOrWhiteSpace(options.PublicEndpoint)
            || string.Equals(options.PublicEndpoint, options.Endpoint, StringComparison.OrdinalIgnoreCase))
        {
            return new AssetStorageClients(operations, operations);
        }

        var presigning = CreateAssetStorageClient(options, options.PublicEndpoint);
        return new AssetStorageClients(operations, presigning);
    }

    private static IAmazonS3 CreateAssetStorageClient(AssetStorageOptions options, string endpoint)
    {
        var config = new AmazonS3Config
        {
            ForcePathStyle = options.UsePathStyle
        };

        if (string.IsNullOrWhiteSpace(endpoint))
        {
            config.RegionEndpoint = RegionEndpoint.GetBySystemName(options.Region);
        }
        else
        {
            var endpointUri = new Uri(endpoint, UriKind.Absolute);
            config.ServiceURL = endpoint;
            config.AuthenticationRegion = options.Region;
            config.UseHttp = string.Equals(
                endpointUri.Scheme,
                Uri.UriSchemeHttp,
                StringComparison.OrdinalIgnoreCase);
        }

        return options.HasStaticCredentials
            ? new AmazonS3Client(
                new BasicAWSCredentials(options.AccessKey, options.SecretKey),
                config)
            : new AmazonS3Client(config);
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
