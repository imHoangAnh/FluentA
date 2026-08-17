using Amazon.S3;
using Amazon.S3.Model;
using FluentA.Application.BoundedContexts.Assets;

namespace FluentA.Infrastructure.ObjectStorage.Assets;

public sealed class AssetStorageReadinessProbe : IAssetStorageReadinessProbe
{
    private readonly IAmazonS3 _client;
    private readonly IAssetObjectStorage _storage;
    private readonly AssetStorageOptions _options;

    public AssetStorageReadinessProbe(
        IAmazonS3 client,
        IAssetObjectStorage storage,
        AssetStorageOptions options)
    {
        _client = client;
        _storage = storage;
        _options = options;
    }

    public async Task VerifyAsync(CancellationToken cancellationToken = default)
    {
        _options.Validate();
        await _client.GetBucketLocationAsync(new GetBucketLocationRequest
        {
            BucketName = _options.Bucket
        }, cancellationToken);

        if (_options.Provider == AssetStorageProvider.S3)
        {
            await _storage.EnsurePrivateBucketAsync(cancellationToken);
        }
    }
}
