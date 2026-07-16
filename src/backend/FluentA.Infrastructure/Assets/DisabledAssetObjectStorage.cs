using FluentA.Application.BoundedContexts.Assets;

namespace FluentA.Infrastructure.Assets;

public sealed class DisabledAssetObjectStorage : IAssetObjectStorage
{
    public AssetPresignedUpload CreatePresignedUpload(AssetUploadRequest request)
    {
        throw new AssetStorageUnavailableException("Asset storage is not enabled.");
    }

    public AssetPresignedDownload CreatePresignedDownload(AssetDownloadRequest request)
    {
        throw new AssetStorageUnavailableException("Asset storage is not enabled.");
    }

    public Task<AssetObjectMetadata?> GetObjectMetadataAsync(string objectKey, CancellationToken cancellationToken = default)
    {
        throw new AssetStorageUnavailableException("Asset storage is not enabled.");
    }

    public Task<byte[]?> GetObjectPrefixAsync(string objectKey, int maxBytes, CancellationToken cancellationToken = default)
    {
        throw new AssetStorageUnavailableException("Asset storage is not enabled.");
    }

    public string GetPublicUrl(string objectKey)
    {
        throw new AssetStorageUnavailableException("Asset storage is not enabled.");
    }

    public Task DeleteIfExistsAsync(string objectKey, CancellationToken cancellationToken = default)
    {
        throw new AssetStorageUnavailableException("Asset storage is not enabled.");
    }
}
