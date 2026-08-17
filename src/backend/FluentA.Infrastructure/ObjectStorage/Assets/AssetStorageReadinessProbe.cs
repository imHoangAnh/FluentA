using FluentA.Application.BoundedContexts.Assets;

namespace FluentA.Infrastructure.ObjectStorage.Assets;

public sealed class AssetStorageReadinessProbe : IAssetStorageReadinessProbe
{
    private readonly IAssetObjectStorage _storage;
    private readonly AssetStorageOptions _options;

    public AssetStorageReadinessProbe(
        IAssetObjectStorage storage,
        AssetStorageOptions options)
    {
        _storage = storage;
        _options = options;
    }

    public async Task VerifyAsync(CancellationToken cancellationToken = default)
    {
        _options.Validate();
        await _storage.VerifyBucketAccessAsync(cancellationToken);
    }
}
