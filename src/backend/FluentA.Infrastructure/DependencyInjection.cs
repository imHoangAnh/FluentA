using System.Globalization;
using Amazon;
using Amazon.Runtime;
using Amazon.S3;
using FluentA.Application.BoundedContexts.Pronunciation;
using FluentA.Infrastructure.Identity;
using FluentA.Infrastructure.ObjectStorage.Assets;
using FluentA.Infrastructure.Persistence;
using FluentA.Infrastructure.Scheduling;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Npgsql;
using Quartz;
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
    private const int DefaultQuartzWorkerCount = 5;
    private const int DefaultQuartzReconciliationIntervalSeconds = 30;

    public static IServiceCollection AddFluentAInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var postgresConnection = BuildPostgresConnectionString(configuration.GetConnectionString("Postgres") ?? DefaultPostgresConnection, configuration);
        var postgresCommandTimeoutSeconds = GetPositiveInt(
            configuration,
            "Database:Postgres:CommandTimeoutSeconds",
            DefaultPostgresCommandTimeoutSeconds);
        var quartzWorkerCount = GetPositiveInt(
            configuration,
            "Quartz:WorkerCount",
            DefaultQuartzWorkerCount);
        var quartzReconciliationIntervalSeconds = GetPositiveInt(
            configuration,
            "Quartz:ReconciliationIntervalSeconds",
            DefaultQuartzReconciliationIntervalSeconds);
        var assetStorageOptions = AssetStorageOptions.FromConfiguration(configuration);
        var pronunciationOptions = CreatePronunciationOptions(configuration);
        var authSecurityOptions = AuthSecurityOptions.FromConfiguration(configuration);

        services.AddSingleton<ScheduleChangeSignal>();
        services.AddSingleton<ScheduleChangeInterceptor>();
        services.AddSingleton<ScheduleTransactionInterceptor>();
        services.AddDbContext<AppDbContext>((provider, options) => options.UseNpgsql(
            postgresConnection,
            npgsqlOptions => npgsqlOptions.CommandTimeout(postgresCommandTimeoutSeconds))
            .AddInterceptors(provider.GetRequiredService<ScheduleChangeInterceptor>(),
                provider.GetRequiredService<ScheduleTransactionInterceptor>()));
        services.AddQuartz(quartz =>
        {
            quartz.ConfigureScheduler(options =>
            {
                options.InstanceName = "FluentA";
                options.GenerateInstanceId = true;
            });
            quartz.UseDefaultThreadPool(options => options.MaxConcurrency = quartzWorkerCount);
            quartz.UsePersistentStore(store =>
            {
                store.UsePostgres(postgresConnection);
                store.UseClustering();
                // Quartz creates only missing tables/indexes. It does not
                // alter or drop existing scheduler or business tables.
                store.ProvisionSchema();
            });

            quartz.AddJob<QuartzOccurrenceDispatchJob>(job => job
                .WithIdentity(QuartzScheduleIdentity.OccurrenceJobKey)
                .StoreDurably());
            quartz.AddJob<QuartzMaintenanceDispatchJob>(job => job
                .WithIdentity(QuartzScheduleIdentity.MaintenanceJobKey)
                .StoreDurably());
            quartz.AddJob<QuartzReconciliationJob>(job => job
                .WithIdentity(new JobKey(
                    QuartzScheduleIdentity.ReconciliationJobName,
                    QuartzScheduleIdentity.InternalGroup))
                .StoreDurably());

            quartz.AddTrigger<QuartzReconciliationJob>(trigger => trigger
                .WithIdentity(new TriggerKey(
                    QuartzScheduleIdentity.ReconciliationTriggerName,
                    QuartzScheduleIdentity.InternalGroup))
                .ForJob(new JobKey(
                    QuartzScheduleIdentity.ReconciliationJobName,
                    QuartzScheduleIdentity.InternalGroup))
                .StartNow()
                .WithSimpleSchedule(schedule => schedule
                    .WithInterval(TimeSpan.FromSeconds(quartzReconciliationIntervalSeconds))
                    .RepeatForever()
                    .WithMisfireInstruction(SimpleTriggerMisfireInstruction.FireNow)));

            var vietnamTimeZone = ResolveVietnamTimeZone();
            AddMaintenanceTrigger(
                quartz,
                ScheduledMaintenanceKind.CountdownRecurrence,
                "0 10 0 * * ?",
                vietnamTimeZone);
            AddMaintenanceTrigger(
                quartz,
                ScheduledMaintenanceKind.PendingAssetCleanup,
                "0 15 * * * ?",
                TimeZoneInfo.Utc);
            AddMaintenanceTrigger(
                quartz,
                ScheduledMaintenanceKind.ArchivedAssetPurge,
                "0 30 * * * ?",
                TimeZoneInfo.Utc);
            AddMaintenanceTrigger(
                quartz,
                ScheduledMaintenanceKind.TrashPurge,
                "0 0/5 * * * ?",
                TimeZoneInfo.Utc);
            AddMaintenanceTrigger(
                quartz,
                ScheduledMaintenanceKind.DatabaseCleanup,
                "0 0 2 ? * SUN",
                TimeZoneInfo.Utc);
        });
        // Register the Quartz hosted service before the startup repair so the
        // first reconciliation sees the running persistent scheduler.
        services.AddQuartzHostedService(options => options.WaitForJobsToComplete = true);
        services.AddSingleton<IQuartzScheduleCoordinator, QuartzScheduleCoordinator>();
        services.AddHostedService<QuartzStartupReconciliationService>();
        services.AddHostedService<ScheduleChangeReconciliationService>();
        services.AddFluentAFeatureServices(assetStorageOptions, authSecurityOptions, pronunciationOptions);
        return services;
    }

    private static void AddMaintenanceTrigger(
        IQuartzBuilder quartz,
        ScheduledMaintenanceKind kind,
        string cronExpression,
        TimeZoneInfo timeZone)
    {
        quartz.AddTrigger<QuartzMaintenanceDispatchJob>(trigger => trigger
            .WithIdentity(QuartzScheduleIdentity.MaintenanceTriggerKey(kind))
            .ForJob(QuartzScheduleIdentity.MaintenanceJobKey)
            .UsingJobData(QuartzJobData.ForMaintenance(kind))
            .WithRetryPolicy(Quartz.RetryPolicy.Fixed(3, TimeSpan.FromSeconds(10)))
            .WithCronSchedule(cronExpression, schedule => schedule
                .InTimeZone(timeZone)
                .WithMisfireInstruction(CronTriggerMisfireInstruction.FireAndProceed)));
    }

    private static TimeZoneInfo ResolveVietnamTimeZone()
    {
        foreach (var id in new[] { "Asia/Ho_Chi_Minh", "SE Asia Standard Time" })
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById(id);
            }
            catch (TimeZoneNotFoundException)
            {
            }
            catch (InvalidTimeZoneException)
            {
            }
        }

        throw new InvalidOperationException("The Vietnam timezone is not available on this host.");
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
