using FluentA.Application.BoundedContexts.Assets;
using FluentA.Domain.BoundedContexts.Assets.Entities;

namespace FluentA.Application.UnitTests;

internal sealed class TestAssetRepository(params Asset[] assets) : IAssetRepository
{
    public Task AddAsync(Asset asset, CancellationToken cancellationToken = default) => Task.CompletedTask;
    public Task UpdateAsync(Asset asset, CancellationToken cancellationToken = default) => Task.CompletedTask;
    public Task<Asset?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) => Task.FromResult(assets.FirstOrDefault(asset => asset.Id == id));
    public Task<Asset?> GetOwnedAsync(Guid owner, Guid id, CancellationToken cancellationToken = default) => Task.FromResult(assets.FirstOrDefault(asset => asset.Id == id && asset.UploadedByUserId == owner && asset.DeletedAt is null));
    public Task<IReadOnlyList<Asset>> GetOwnedAsync(Guid owner, IReadOnlyCollection<Guid> ids, CancellationToken cancellationToken = default) => Task.FromResult<IReadOnlyList<Asset>>(assets.Where(asset => asset.UploadedByUserId == owner && asset.DeletedAt is null && ids.Contains(asset.Id)).ToArray());
}

internal sealed class TestAssetStorage : IAssetObjectStorage
{
    public AssetPresignedUpload CreatePresignedUpload(AssetUploadRequest request) => throw new NotSupportedException();
    public AssetPresignedDownload CreatePresignedDownload(AssetDownloadRequest request) => new($"https://signed.example.test/{request.ObjectKey}", DateTime.UtcNow.Add(request.Lifetime));
    public Task<AssetObjectMetadata?> GetObjectMetadataAsync(string objectKey, CancellationToken cancellationToken = default) => throw new NotSupportedException();
    public Task<byte[]?> GetObjectPrefixAsync(string objectKey, int maxBytes, CancellationToken cancellationToken = default) => throw new NotSupportedException();
}
