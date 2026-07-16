namespace FluentA.Application.BoundedContexts.Assets;

public interface IAssetObjectStorage
{
    AssetPresignedUpload CreatePresignedUpload(AssetUploadRequest request);
    AssetPresignedDownload CreatePresignedDownload(AssetDownloadRequest request);
    Task<AssetObjectMetadata?> GetObjectMetadataAsync(string objectKey, CancellationToken cancellationToken = default);
    Task<byte[]?> GetObjectPrefixAsync(string objectKey, int maxBytes, CancellationToken cancellationToken = default);
    string GetPublicUrl(string objectKey);
    Task DeleteIfExistsAsync(string objectKey, CancellationToken cancellationToken = default);
}
