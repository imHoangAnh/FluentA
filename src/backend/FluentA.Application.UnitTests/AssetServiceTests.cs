using FluentA.Application.BoundedContexts.Assets;
using FluentA.Domain.BoundedContexts.Assets.Entities;
using FluentA.Domain.BoundedContexts.Assets.Enums;
using FluentA.Domain.BoundedContexts.Auth.Entities;

namespace FluentA.Application.UnitTests;

public sealed class AssetServiceTests
{
    [Fact]
    public async Task Presign_CreatesPendingAssetAndReturnsUploadTarget()
    {
        var repository = new FakeAssetRepository();
        var storage = new FakeAssetObjectStorage();
        var service = new AssetService(repository, storage);

        var result = await service.PresignAsync(Guid.NewGuid(), new PresignAssetRequest("avatar", "image/png", "avatar.png", 1024));

        Assert.True(result.IsSuccess);
        Assert.Equal("avatar", result.Value!.Asset.AssetType);
        Assert.Equal("pending-upload", result.Value.Asset.Status);
        Assert.Equal("PUT", result.Value.Method);
        Assert.Single(repository.Assets);
        Assert.Equal("test-assets", repository.Assets.Single().Bucket);
        Assert.Equal("avatar.png", repository.Assets.Single().OriginalName);
    }

    [Fact]
    public async Task Presign_RejectsUnsupportedContentType()
    {
        var service = new AssetService(new FakeAssetRepository(), new FakeAssetObjectStorage());

        var result = await service.PresignAsync(Guid.NewGuid(), new PresignAssetRequest("avatar", "image/gif", "avatar.gif", 1024));

        Assert.False(result.IsSuccess);
        Assert.Equal("VALIDATION_ERROR", ((AssetError)result.Error!).Code);
    }

    [Fact]
    public async Task Presign_RejectsMissingOriginalNameAndOversizedClaim()
    {
        var service = new AssetService(new FakeAssetRepository(), new FakeAssetObjectStorage());

        var result = await service.PresignAsync(
            Guid.NewGuid(),
            new PresignAssetRequest("avatar", "image/png", null, 2 * 1024 * 1024 + 1));

        Assert.False(result.IsSuccess);
        Assert.Equal("VALIDATION_ERROR", ((AssetError)result.Error!).Code);
    }

    [Fact]
    public async Task Finalize_MarksPendingAssetFinalized()
    {
        var repository = new FakeAssetRepository();
        var storage = new FakeAssetObjectStorage();
        var service = new AssetService(repository, storage);
        var userId = Guid.NewGuid();
        var presign = await service.PresignAsync(userId, new PresignAssetRequest("avatar", "image/png", "avatar.png", 1024));
        storage.Metadata = new AssetObjectMetadata(repository.Assets.Single().ObjectKey, 1024, "image/png", "etag");

        var result = await service.FinalizeAsync(userId, new FinalizeAssetRequest(presign.Value!.Asset.Id));

        Assert.True(result.IsSuccess);
        Assert.Equal("ready", result.Value!.Status);
        Assert.Equal(1024, result.Value.SizeBytes);
    }

    [Fact]
    public async Task Finalize_RejectsMimeSpoofedObjectBytes()
    {
        var repository = new FakeAssetRepository();
        var storage = new FakeAssetObjectStorage { Prefix = [0x47, 0x49, 0x46, 0x38] };
        var service = new AssetService(repository, storage);
        var userId = Guid.NewGuid();
        var presign = await service.PresignAsync(userId, new PresignAssetRequest("avatar", "image/png", "avatar.png", 1024));
        storage.Metadata = new AssetObjectMetadata(repository.Assets.Single().ObjectKey, 1024, "image/png", "etag");

        var result = await service.FinalizeAsync(userId, new FinalizeAssetRequest(presign.Value!.Asset.Id));

        Assert.False(result.IsSuccess);
        Assert.Equal("ASSET_UPLOAD_INVALID", ((AssetError)result.Error!).Code);
    }

    [Fact]
    public async Task Finalize_ExpiresPendingAssetAfterWindow()
    {
        var repository = new FakeAssetRepository();
        var storage = new FakeAssetObjectStorage();
        var service = new AssetService(repository, storage);
        var userId = Guid.NewGuid();
        var asset = Asset.CreatePending(
            Guid.NewGuid(),
            userId,
            AssetType.Avatar,
            "users/demo/avatar", "image/png",
            0,
            DateTime.UtcNow.AddMinutes(-1));
        await repository.AddAsync(asset);

        var result = await service.FinalizeAsync(userId, new FinalizeAssetRequest(asset.Id));

        Assert.False(result.IsSuccess);
        Assert.Equal("ASSET_UPLOAD_EXPIRED", ((AssetError)result.Error!).Code);
        Assert.Equal(AssetStatus.Failed, repository.Assets.Single().Status);
    }

    [Fact]
    public async Task Finalize_DeletesUploadedObjectWhenPersistenceFails()
    {
        var repository = new FakeAssetRepository { FailOnUpdate = true };
        var storage = new FakeAssetObjectStorage();
        var service = new AssetService(repository, storage);
        var userId = Guid.NewGuid();
        var presign = await service.PresignAsync(userId, new PresignAssetRequest("avatar", "image/png", "avatar.png", 1024));
        storage.Metadata = new AssetObjectMetadata(repository.Assets.Single().ObjectKey, 1024, "image/png", "etag");

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.FinalizeAsync(userId, new FinalizeAssetRequest(presign.Value!.Asset.Id)));

        Assert.Equal(repository.Assets.Single().ObjectKey, storage.DeletedObjectKey);
    }

    [Fact]
    public async Task CleanupExpiredPending_DeletesPendingAndExpiredAssets()
    {
        var repository = new FakeAssetRepository();
        var storage = new FakeAssetObjectStorage();
        var service = new AssetService(repository, storage);
        var userId = Guid.NewGuid();
        var pending = Asset.CreatePending(
            Guid.NewGuid(),
            userId,
            AssetType.Avatar,
            "users/demo/pending", "image/png",
            0,
            DateTime.UtcNow.AddMinutes(-2));
        var expired = Asset.CreatePending(
            Guid.NewGuid(),
            userId,
            AssetType.Avatar,
            "users/demo/expired", "image/png",
            0,
            DateTime.UtcNow.AddMinutes(-3));
        expired.MarkExpired(DateTime.UtcNow.AddMinutes(-1));
        await repository.AddAsync(pending);
        await repository.AddAsync(expired);

        var cleaned = await service.CleanupExpiredPendingAsync();

        Assert.Equal(2, cleaned);
        Assert.Equal(AssetStatus.Deleted, pending.Status);
        Assert.Equal(AssetStatus.Deleted, expired.Status);
        Assert.Equal(2, storage.DeletedObjectKeys.Count);
        Assert.Contains(pending.ObjectKey, storage.DeletedObjectKeys);
        Assert.Contains(expired.ObjectKey, storage.DeletedObjectKeys);
    }

    [Fact]
    public async Task PurgeExpiredArchived_DeletesClaimedObjectsAndRequeuesFailures()
    {
        var repository = new FakeAssetRepository();
        var storage = new FakeAssetObjectStorage();
        var service = new AssetService(repository, storage);
        var success = CreateFinalizedAsset(Guid.NewGuid(), "avatars/users/demo/success");
        var failed = CreateFinalizedAsset(Guid.NewGuid(), "avatars/users/demo/failed");
        var due = DateTime.UtcNow.AddDays(-31);
        success.Archive(due, TimeSpan.FromDays(30));
        failed.Archive(due, TimeSpan.FromDays(30));
        await repository.AddAsync(success);
        await repository.AddAsync(failed);
        storage.FailObjectKey = failed.ObjectKey;

        var result = await service.PurgeExpiredArchivedAsync();

        Assert.Equal(2, result.Claimed);
        Assert.Equal(1, result.Deleted);
        Assert.Equal(1, result.Failed);
        Assert.Equal(AssetStatus.Deleted, success.Status);
        Assert.Equal(AssetStatus.Archived, failed.Status);
    }

    private static Asset CreateFinalizedAsset(Guid userId, string objectKey)
    {
        var asset = Asset.CreatePending(
            Guid.NewGuid(),
            userId,
            AssetType.Avatar,
            objectKey,
            "image/png",
            0,
            DateTime.UtcNow.AddHours(1));
        asset.FinalizeUpload("image/png", 1024);
        return asset;
    }

    private sealed class FakeAssetRepository : IAssetRepository
    {
        public List<Asset> Assets { get; } = [];
        public bool FailOnUpdate { get; init; }

        public Task AddAsync(Asset asset, CancellationToken cancellationToken = default)
        {
            Assets.Add(asset);
            return Task.CompletedTask;
        }

        public Task<Asset?> GetByIdAsync(Guid assetId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Assets.FirstOrDefault(asset => asset.Id == assetId));
        }

        public Task<Asset?> GetOwnedAsync(Guid userId, Guid assetId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Assets.FirstOrDefault(asset => asset.Id == assetId && asset.UploadedByUserId == userId && asset.DeletedAt == null));
        }

        public Task<IReadOnlyList<Asset>> GetOwnedAsync(Guid userId, IReadOnlyCollection<Guid> assetIds, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<Asset>>(Assets
                .Where(asset => asset.UploadedByUserId == userId && asset.DeletedAt == null && assetIds.Contains(asset.Id))
                .ToList());
        }

        public Task<IReadOnlyList<Asset>> ListPendingCleanupCandidatesAsync(DateTime nowUtc, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<Asset>>(Assets
                .Where(asset => asset.DeletedAt == null
                    && (asset.Status == AssetStatus.Failed
                        || (asset.Status == AssetStatus.PendingUpload && asset.ExpiresAt <= nowUtc)))
                .ToList());
        }

        public Task<IReadOnlyList<Asset>> ClaimDueArchivedAsync(DateTime nowUtc, int batchSize, CancellationToken cancellationToken = default)
        {
            var claimed = Assets.Where(asset => asset.Status == AssetStatus.Archived && asset.PurgeAfterAt <= nowUtc).Take(batchSize).ToList();
            foreach (var asset in claimed) asset.ClaimPurge(nowUtc);
            return Task.FromResult<IReadOnlyList<Asset>>(claimed);
        }

        public Task UpdateAsync(Asset asset, CancellationToken cancellationToken = default)
        {
            if (FailOnUpdate)
            {
                throw new InvalidOperationException("Simulated persistence failure.");
            }

            return Task.CompletedTask;
        }
    }

    private sealed class FakeAssetObjectStorage : IAssetObjectStorage
    {
        public AssetObjectMetadata? Metadata { get; set; }
        public byte[] Prefix { get; set; } = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        public string? DeletedObjectKey { get; private set; }
        public List<string> DeletedObjectKeys { get; } = [];
        public string? FailObjectKey { get; set; }

        public AssetPresignedUpload CreatePresignedUpload(AssetUploadRequest request)
        {
            return new AssetPresignedUpload($"http://upload.local/{request.ObjectKey}", DateTime.UtcNow.Add(request.Lifetime), "test-assets");
        }

        public AssetPresignedDownload CreatePresignedDownload(AssetDownloadRequest request) =>
            new($"http://download.local/{request.ObjectKey}", DateTime.UtcNow.Add(request.Lifetime));

        public Task<AssetObjectMetadata?> GetObjectMetadataAsync(string objectKey, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Metadata);
        }

        public Task<byte[]?> GetObjectPrefixAsync(string objectKey, int maxBytes, CancellationToken cancellationToken = default) =>
            Task.FromResult<byte[]?>(Prefix);

        public Task DeleteIfExistsAsync(string objectKey, CancellationToken cancellationToken = default)
        {
            if (objectKey == FailObjectKey) throw new AssetStorageUnavailableException("Simulated storage failure.");
            DeletedObjectKey = objectKey;
            DeletedObjectKeys.Add(objectKey);
            return Task.CompletedTask;
        }
    }

}
