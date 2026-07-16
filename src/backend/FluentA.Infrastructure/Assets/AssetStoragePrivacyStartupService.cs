using FluentA.Application.BoundedContexts.Assets;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace FluentA.Infrastructure.Assets;

public sealed class AssetStoragePrivacyStartupService : IHostedService
{
    private readonly IAssetObjectStorage _storage;
    private readonly ILogger<AssetStoragePrivacyStartupService> _logger;

    public AssetStoragePrivacyStartupService(IAssetObjectStorage storage, ILogger<AssetStoragePrivacyStartupService> logger)
    {
        _storage = storage;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        try
        {
            await _storage.EnsurePrivateBucketAsync(cancellationToken);
            _logger.LogInformation("Asset storage bucket privacy was verified at startup.");
        }
        catch (AssetStorageUnavailableException exception)
        {
            _logger.LogWarning(exception, "Asset storage privacy verification will retry through the scheduled cleanup job.");
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
