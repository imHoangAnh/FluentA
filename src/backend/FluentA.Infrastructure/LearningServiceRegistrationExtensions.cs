using FluentA.Application.BoundedContexts.Practice;
using FluentA.Application.BoundedContexts.Pronunciation;
using FluentA.Application.BoundedContexts.Review;
using FluentA.Application.BoundedContexts.Vocabulary;
using FluentA.Infrastructure.ExternalServices.Pronunciation;
using FluentA.Infrastructure.Persistence.Repositories.Practice;
using FluentA.Infrastructure.Persistence.Repositories.Pronunciation;
using FluentA.Infrastructure.Persistence.Repositories.Review;
using FluentA.Infrastructure.Persistence.Repositories.Vocabulary;
using Microsoft.Extensions.DependencyInjection;

namespace FluentA.Infrastructure;

internal static class LearningServiceRegistrationExtensions
{
    public static IServiceCollection AddFluentALearningServices(
        this IServiceCollection services,
        PronunciationAssessmentOptions pronunciationOptions)
    {
        services.AddScoped<IPracticeRepository, EfPracticeRepository>();
        services.AddScoped<IPracticeSessionRepository>(provider =>
            provider.GetRequiredService<IPracticeRepository>() as IPracticeSessionRepository
            ?? throw new InvalidOperationException("Practice repository must implement session persistence."));
        services.AddScoped<IPronunciationWordRepository, EfPronunciationWordRepository>();
        services.AddScoped<IReviewRepository, EfReviewRepository>();
        services.AddScoped<ILevelFiveTrashRepository, EfLevelFiveTrashRepository>();
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
        return services;
    }
}
