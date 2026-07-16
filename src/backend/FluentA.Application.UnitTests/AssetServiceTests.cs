using FluentA.Application.BoundedContexts.Assets;
using FluentA.Application.BoundedContexts.Auth;
using FluentA.Domain.BoundedContexts.Assets.Entities;
using FluentA.Domain.BoundedContexts.Assets.Enums;
using FluentA.Domain.BoundedContexts.Auth.Entities;

namespace FluentA.Application.UnitTests;

public sealed class AssetServiceTests
{
    [Fact]
    public async Task List_ReturnsOwnedAssetsWithCurrentAvatarFlag()
    {
        var repository = new FakeAssetRepository();
        var storage = new FakeAssetObjectStorage();
        var users = new FakeUserRepository();
        var user = User.CreateWithPassword("learner@example.com", "Learner", "hash");
        var currentAsset = CreateFinalizedAsset(user.Id, "users/demo/avatar-1");
        var previousAsset = CreateFinalizedAsset(user.Id, "users/demo/avatar-2");
        user.UpdateProfile(user.FullName, user.Bio, currentAsset.PublicUrl, currentAsset.Id);
        users.Add(user);
        await repository.AddAsync(previousAsset);
        await repository.AddAsync(currentAsset);
        var service = new AssetService(repository, storage, users);

        var result = await service.ListAsync(user.Id, new ListAssetsRequest("avatar"));

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value!.Count);
        Assert.True(result.Value.Single(asset => asset.Id == currentAsset.Id).IsCurrentAvatar);
        Assert.False(result.Value.Single(asset => asset.Id == previousAsset.Id).IsCurrentAvatar);
    }

    [Fact]
    public async Task Presign_CreatesPendingAssetAndReturnsUploadTarget()
    {
        var repository = new FakeAssetRepository();
        var storage = new FakeAssetObjectStorage();
        var users = new FakeUserRepository();
        var service = new AssetService(repository, storage, users);

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
        var service = new AssetService(new FakeAssetRepository(), new FakeAssetObjectStorage(), new FakeUserRepository());

        var result = await service.PresignAsync(Guid.NewGuid(), new PresignAssetRequest("avatar", "image/gif", "avatar.gif", 1024));

        Assert.False(result.IsSuccess);
        Assert.Equal("VALIDATION_ERROR", ((AssetError)result.Error!).Code);
    }

    [Fact]
    public async Task Presign_RejectsMissingOriginalNameAndOversizedClaim()
    {
        var service = new AssetService(new FakeAssetRepository(), new FakeAssetObjectStorage(), new FakeUserRepository());

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
        var service = new AssetService(repository, storage, new FakeUserRepository());
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
        var service = new AssetService(repository, storage, new FakeUserRepository());
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
        var service = new AssetService(repository, storage, new FakeUserRepository());
        var userId = Guid.NewGuid();
        var asset = Asset.CreatePending(
            Guid.NewGuid(),
            userId,
            AssetType.Avatar,
            "users/demo/avatar",
            "http://cdn.local/users/demo/avatar",
            "image/png",
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
        var service = new AssetService(repository, storage, new FakeUserRepository());
        var userId = Guid.NewGuid();
        var presign = await service.PresignAsync(userId, new PresignAssetRequest("avatar", "image/png", "avatar.png", 1024));
        storage.Metadata = new AssetObjectMetadata(repository.Assets.Single().ObjectKey, 1024, "image/png", "etag");

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.FinalizeAsync(userId, new FinalizeAssetRequest(presign.Value!.Asset.Id)));

        Assert.Equal(repository.Assets.Single().ObjectKey, storage.DeletedObjectKey);
    }

    [Fact]
    public async Task Delete_ClearsCurrentAvatarAndDeletesObject()
    {
        var repository = new FakeAssetRepository();
        var storage = new FakeAssetObjectStorage();
        var users = new FakeUserRepository();
        var user = User.CreateWithPassword("learner@example.com", "Learner", "hash");
        var asset = CreateFinalizedAsset(user.Id, "users/demo/avatar-1");
        user.UpdateProfile(user.FullName, user.Bio, asset.PublicUrl, asset.Id);
        users.Add(user);
        await repository.AddAsync(asset);
        var service = new AssetService(repository, storage, users);

        var result = await service.DeleteAsync(user.Id, asset.Id);

        Assert.True(result.IsSuccess);
        Assert.Equal(AssetStatus.Deleted, asset.Status);
        Assert.Equal(asset.ObjectKey, storage.DeletedObjectKey);
        Assert.Null(user.CurrentAvatarAssetId);
        Assert.Null(user.AvatarUrl);
    }

    [Fact]
    public async Task CleanupExpiredPending_DeletesPendingAndExpiredAssets()
    {
        var repository = new FakeAssetRepository();
        var storage = new FakeAssetObjectStorage();
        var users = new FakeUserRepository();
        var service = new AssetService(repository, storage, users);
        var userId = Guid.NewGuid();
        var pending = Asset.CreatePending(
            Guid.NewGuid(),
            userId,
            AssetType.Avatar,
            "users/demo/pending",
            "http://cdn.local/users/demo/pending",
            "image/png",
            0,
            DateTime.UtcNow.AddMinutes(-2));
        var expired = Asset.CreatePending(
            Guid.NewGuid(),
            userId,
            AssetType.Avatar,
            "users/demo/expired",
            "http://cdn.local/users/demo/expired",
            "image/png",
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

    private static Asset CreateFinalizedAsset(Guid userId, string objectKey)
    {
        var asset = Asset.CreatePending(
            Guid.NewGuid(),
            userId,
            AssetType.Avatar,
            objectKey,
            $"http://cdn.local/{objectKey}",
            "image/png",
            0,
            DateTime.UtcNow.AddHours(1));
        asset.FinalizeUpload($"http://cdn.local/{objectKey}", "image/png", 1024);
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
            return Task.FromResult(Assets.FirstOrDefault(asset => asset.Id == assetId && asset.UserId == userId && asset.DeletedAt == null));
        }

        public Task<IReadOnlyList<Asset>> GetOwnedAsync(Guid userId, IReadOnlyCollection<Guid> assetIds, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<Asset>>(Assets
                .Where(asset => asset.UserId == userId && asset.DeletedAt == null && assetIds.Contains(asset.Id))
                .ToList());
        }

        public Task<IReadOnlyList<Asset>> ListOwnedAsync(Guid userId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<Asset>>(Assets.Where(asset => asset.UserId == userId && asset.DeletedAt == null).OrderByDescending(asset => asset.CreatedAt).ToList());
        }

        public Task<IReadOnlyList<Asset>> ListPendingCleanupCandidatesAsync(DateTime nowUtc, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<Asset>>(Assets
                .Where(asset => asset.DeletedAt == null
                    && (asset.Status == AssetStatus.Failed
                        || (asset.Status == AssetStatus.PendingUpload && asset.ExpiresAt <= nowUtc)))
                .ToList());
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

        public string GetPublicUrl(string objectKey)
        {
            return $"http://cdn.local/{objectKey}";
        }

        public Task DeleteIfExistsAsync(string objectKey, CancellationToken cancellationToken = default)
        {
            DeletedObjectKey = objectKey;
            DeletedObjectKeys.Add(objectKey);
            return Task.CompletedTask;
        }
    }

    private sealed class FakeUserRepository : IUserRepository
    {
        private readonly Dictionary<Guid, User> _users = new();

        public void Add(User user)
        {
            _users[user.Id] = user;
        }

        public Task<bool> EmailExistsAsync(string normalizedEmail, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(_users.Values.Any(user => user.Email == normalizedEmail));
        }

        public Task<User?> GetByEmailAsync(string normalizedEmail, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(_users.Values.FirstOrDefault(user => user.Email == normalizedEmail));
        }

        public Task<User?> GetByIdAsync(Guid userId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(_users.GetValueOrDefault(userId));
        }

        public Task AddAsync(User user, CancellationToken cancellationToken = default)
        {
            _users[user.Id] = user;
            return Task.CompletedTask;
        }

        public Task UpdateAsync(User user, CancellationToken cancellationToken = default)
        {
            _users[user.Id] = user;
            return Task.CompletedTask;
        }
    }
}
