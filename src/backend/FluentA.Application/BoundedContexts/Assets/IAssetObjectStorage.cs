namespace FluentA.Application.BoundedContexts.Assets;

public interface IAssetObjectStorage
{
    AssetPresignedUpload CreatePresignedUpload(AssetUploadRequest request);
    AssetPresignedDownload CreatePresignedDownload(AssetDownloadRequest request);
    Task<AssetObjectMetadata?> GetObjectMetadataAsync(string objectKey, CancellationToken cancellationToken = default);
    Task<byte[]?> GetObjectPrefixAsync(string objectKey, int maxBytes, CancellationToken cancellationToken = default);
    Task EnsurePrivateBucketAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
    Task DeleteIfExistsAsync(string objectKey, CancellationToken cancellationToken = default);
}
