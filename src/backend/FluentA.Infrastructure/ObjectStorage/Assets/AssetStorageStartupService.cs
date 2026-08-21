using FluentA.Application.BoundedContexts.Assets;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace FluentA.Infrastructure.ObjectStorage.Assets;

public sealed class AssetStorageStartupService : IHostedService
{
    private readonly IAssetObjectStorage _storage;
    private readonly ILogger<AssetStorageStartupService> _logger;

    public AssetStorageStartupService(
        IAssetObjectStorage storage,
        ILogger<AssetStorageStartupService> logger)
    {
        _storage = storage;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        try
        {
            await _storage.VerifyBucketAccessAsync(cancellationToken);
            _logger.LogInformation("Asset storage bucket access was verified at startup.");
        }
        catch (AssetStorageUnavailableException exception)
        {
            _logger.LogWarning(
                exception,
                "Asset storage access verification failed; readiness will remain unhealthy until corrected.");
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
