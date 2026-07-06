namespace FluentA.Application.BoundedContexts.Assets;

public interface IAssetObjectStorage
{
    AssetPresignedUpload CreatePresignedUpload(AssetUploadRequest request);
    Task<AssetObjectMetadata?> GetObjectMetadataAsync(string objectKey, CancellationToken cancellationToken = default);
    string GetPublicUrl(string objectKey);
    Task DeleteIfExistsAsync(string objectKey, CancellationToken cancellationToken = default);
}
