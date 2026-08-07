using System.Globalization;
using Amazon.S3;
using FluentA.Application.BoundedContexts.Assets;
using FluentA.Application.BoundedContexts.Auth;
using FluentA.Application.BoundedContexts.Countdown;
using FluentA.Application.BoundedContexts.Flashcards;
using FluentA.Application.BoundedContexts.Habit;
using FluentA.Application.BoundedContexts.Journal;
using FluentA.Application.BoundedContexts.Kanban;
using FluentA.Application.BoundedContexts.Note;
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
using FluentA.Infrastructure.Kanban;
using FluentA.Infrastructure.Note;
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
        services.AddScoped<IScheduledProductivityJobs, ScheduledProductivityJobs>();
        services.AddScoped<IUserRepository, EfUserRepository>();
        services.AddScoped<IAssetRepository, EfAssetRepository>();
        services.AddScoped<IAssetService, AssetService>();
        services.AddMemoryCache();
        services.AddSingleton(assetStorageOptions);
        services.AddHostedService<AssetStoragePrivacyStartupService>();
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
        services.AddSingleton(authSecurityOptions);
        services.AddSingleton(new AuthApplicationOptions(authSecurityOptions.FrontendBaseUrl));
        services.AddSingleton<ITokenHelper, TokenHelper>();
        services.AddSingleton<IJwtService, JwtService>();
        services.AddSingleton<IGoogleIdTokenVerifier, GoogleIdTokenVerifier>();
        services.AddResend(options => options.ApiToken = authSecurityOptions.ResendApiKey);
        services.AddScoped<IEmailService, ResendEmailService>();

        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IFlashcardRepository, EfFlashcardRepository>();
        services.AddScoped<IPracticeRepository, EfPracticeRepository>();
        services.AddScoped<IPronunciationWordRepository, EfPronunciationWordRepository>();
        services.AddScoped<IReviewRepository, EfReviewRepository>();
        services.AddScoped<ILevelFiveTrashRepository, EfLevelFiveTrashRepository>();
        services.AddScoped<IFlashcardService, FlashcardService>();
        services.AddScoped<IPracticeService, PracticeService>();
        services.AddScoped<IPronunciationService, PronunciationService>();
        services.AddScoped<IReviewService, ReviewService>();
        services.AddSingleton(pronunciationOptions);
        services.AddHttpClient<IPronunciationAssessmentProvider, AzurePronunciationAssessmentProvider>();
        services.AddScoped<IReviewEnrollmentPort>(provider => provider.GetRequiredService<IReviewService>() as IReviewEnrollmentPort
            ?? throw new InvalidOperationException("Review service must implement review enrollment."));
        services.AddScoped<IVocabularyReviewCleanupPort, EfVocabularyReviewCleanupPort>();
        services.AddScoped<IVocabularyRepository, EfVocabularyRepository>();
        services.AddScoped<IVocabularyService, VocabularyService>();
        services.AddScoped<ITodoRepository, EfTodoRepository>();
        services.AddScoped<ITrashRepository, EfTrashRepository>();
        services.AddScoped<ITrashTransaction, EfTrashTransaction>();
        services.AddScoped<ITrashParticipant, TodoTrashParticipant>();
        services.AddScoped<ITrashParticipant, NoteTrashParticipant>();
        services.AddScoped<ITrashParticipant, VocabularyTrashParticipant>();
        services.AddScoped<ITrashParticipant, LevelFiveTrashParticipant>();
        services.AddScoped<ITrashParticipant, CountdownTrashParticipant>();
        services.AddScoped<ITrashParticipant, HabitTrashParticipant>();
        services.AddScoped<ITrashParticipant, JournalTrashParticipant>();
        services.AddScoped<ITrashParticipant, KanbanTrashParticipant>();
        services.AddScoped<ITrashService, TrashService>();
        services.AddScoped<ITodoService, TodoService>();
        services.AddScoped<ICountdownRepository, EfCountdownRepository>();
        services.AddScoped<ICountdownService, CountdownService>();
        services.AddScoped<IHabitRepository, EfHabitRepository>();
        services.AddScoped<IHabitService, HabitService>();
        services.AddScoped<IJournalRepository, EfJournalRepository>();
        services.AddSingleton<IJournalContentProcessor, JournalContentProcessor>();
        services.AddScoped<IJournalService, JournalService>();
        services.AddScoped<INoteRepository, EfNoteRepository>();
        services.AddScoped<INoteContentProcessor, NoteContentProcessor>();
        services.AddScoped<INoteService, NoteService>();
        services.AddScoped<IKanbanRepository, EfKanbanRepository>();
        services.AddScoped<IKanbanService, KanbanService>();
        services.AddScoped<IPomodoroRepository, EfPomodoroRepository>();
        services.AddSingleton<IPomodoroCurrentStateStore, MemoryPomodoroCurrentStateStore>();
        services.AddScoped<IPomodoroService, PomodoroService>();
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
            : 70d;

        return new PronunciationAssessmentOptions(
            configuration.GetValue<bool>("AzureSpeech:Enabled"),
            configuration["AzureSpeech:Region"]?.Trim() ?? string.Empty,
            configuration["AzureSpeech:SubscriptionKey"] ?? string.Empty,
            GetPositiveInt(configuration, "AzureSpeech:TimeoutSeconds", 10),
            threshold);
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
