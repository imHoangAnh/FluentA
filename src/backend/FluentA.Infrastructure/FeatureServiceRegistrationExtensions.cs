using FluentA.Application.BoundedContexts.Pronunciation;
using FluentA.Infrastructure.Identity;
using FluentA.Infrastructure.ObjectStorage.Assets;
using Microsoft.Extensions.DependencyInjection;

namespace FluentA.Infrastructure;

internal static class FeatureServiceRegistrationExtensions
{
    public static IServiceCollection AddFluentAFeatureServices(
        this IServiceCollection services,
        AssetStorageOptions assetStorageOptions,
        AuthSecurityOptions authSecurityOptions,
        PronunciationAssessmentOptions pronunciationOptions)
    {
        services.AddFluentAAssetServices(assetStorageOptions);
        services.AddFluentAAuthServices(authSecurityOptions);
        services.AddFluentALearningServices(pronunciationOptions);
        services.AddFluentAProductivityServices();
        services.AddFluentATrashServices();
        return services;
    }
}
