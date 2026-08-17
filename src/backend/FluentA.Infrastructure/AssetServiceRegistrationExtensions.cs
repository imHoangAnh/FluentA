using Amazon;
using Amazon.S3;
using FluentA.Application.BoundedContexts.Assets;
using FluentA.Infrastructure.ObjectStorage.Assets;
using FluentA.Infrastructure.Persistence.Repositories.Assets;
using Microsoft.Extensions.DependencyInjection;

namespace FluentA.Infrastructure;

internal static class AssetServiceRegistrationExtensions
{
    public static IServiceCollection AddFluentAAssetServices(
        this IServiceCollection services,
        AssetStorageOptions assetStorageOptions)
    {
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

        return services;
    }
}
