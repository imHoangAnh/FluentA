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

internal static class FeatureServiceRegistrationExtensions
{
    public static IServiceCollection AddFluentAFeatureServices(
        this IServiceCollection services,
        AssetStorageOptions assetStorageOptions,
        AuthSecurityOptions authSecurityOptions,
        PronunciationAssessmentOptions pronunciationOptions)
    {
        services.AddScoped<IScheduledProductivityJobs, ScheduledProductivityJobs>();
        services.AddScoped<ScheduledMaintenanceJobs>();
        services.AddScoped<ReviewDueDeferralJob>();
        services.AddScoped<IUserRepository, EfUserRepository>();
        services.AddScoped<IAssetRepository, EfAssetRepository>();
        services.AddScoped<IAssetService, AssetService>();
        services.AddMemoryCache();
        services.AddSingleton(assetStorageOptions);
        services.AddHostedService<AssetStoragePrivacyStartupService>();
        if (assetStorageOptions.Enabled)
        {
            services.AddSingleton<IAmazonS3>(_ => DependencyInjection.CreateAssetStorageClient(assetStorageOptions));
            services.AddSingleton<IAssetObjectStorage, S3CompatibleAssetObjectStorage>();
            services.AddSingleton<IAssetStorageReadinessProbe, AssetStorageReadinessProbe>();
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
        services.AddScoped<ITrashParticipant, ProjectTrashParticipant>();
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
        services.AddScoped<INotificationRepository, EfNotificationRepository>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<IProjectRepository, EfProjectRepository>();
        services.AddScoped<IProjectService, ProjectService>();
        services.AddScoped<IPomodoroRepository, EfPomodoroRepository>();
        services.AddSingleton<IPomodoroCurrentStateStore, MemoryPomodoroCurrentStateStore>();
        services.AddScoped<IPomodoroService, PomodoroService>();
        return services;
    }
}
