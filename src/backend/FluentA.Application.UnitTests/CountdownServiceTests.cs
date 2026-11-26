using FluentA.Application.BoundedContexts.Assets;
using FluentA.Application.BoundedContexts.Countdown;
using FluentA.Application.BoundedContexts.Countdown.DTOs;
using FluentA.Application.Common;
using FluentA.Domain.BoundedContexts.Assets.Entities;
using FluentA.Domain.BoundedContexts.Assets.Enums;
using CountdownEventEntity = FluentA.Domain.BoundedContexts.Countdown.Entities.CountdownEvent;

namespace FluentA.Application.UnitTests;

public sealed class CountdownServiceTests
{
    [Fact]
    public async Task CreateAsync_ValidatesInputAndPersistsCountdown()
    {
        var repository = new FakeCountdownRepository();
        var service = new CountdownService(repository);
        var userId = Guid.NewGuid();
        var target = DateTime.UtcNow.AddDays(12).ToString("yyyy-MM-dd");

        var result = await service.CreateAsync(userId, new CreateCountdownEventRequest(" IELTS Exam ", target));

        Assert.True(result.IsSuccess);
        Assert.Equal("IELTS Exam", result.Value!.Name);
        Assert.Single(repository.Events);
        Assert.Equal(userId, repository.Events[0].UserId);
    }

    [Fact]
    public async Task CreateAsync_ReturnsValidationErrors()
    {
        var service = new CountdownService(new FakeCountdownRepository());

        var result = await service.CreateAsync(Guid.NewGuid(), new CreateCountdownEventRequest("", "not-a-date"));

        Assert.False(result.IsSuccess);
        var error = Assert.IsType<CountdownError>(result.Error);
        Assert.Equal("VALIDATION_ERROR", error.Code);
        Assert.Equal(400, error.StatusCode);
    }

    [Fact]
    public async Task CreateAsync_UsesTheFiftyCharacterNewNameLimit()
    {
        var service = new CountdownService(new FakeCountdownRepository());
        var target = DateTime.UtcNow.AddDays(3).ToString("yyyy-MM-dd");

        var tooLong = await service.CreateAsync(Guid.NewGuid(), new CreateCountdownEventRequest(
            new string('x', 51), target));
        var valid = await service.CreateAsync(Guid.NewGuid(), new CreateCountdownEventRequest(
            "Exam", target));

        Assert.False(tooLong.IsSuccess);
        Assert.True(valid.IsSuccess);
        Assert.False(valid.Value!.IsCompleted);
    }

    [Fact]
    public async Task CreateAsync_RejectsInvalidCover()
    {
        var service = new CountdownService(new FakeCountdownRepository(), new FakeAssetRepository());

        var result = await service.CreateAsync(Guid.NewGuid(), new CreateCountdownEventRequest(
            "Exam",
            DateTime.UtcNow.AddDays(3).ToString("yyyy-MM-dd"),
            Guid.NewGuid()));

        Assert.False(result.IsSuccess);
        Assert.Equal("VALIDATION_ERROR", Assert.IsType<CountdownError>(result.Error).Code);
    }

    [Fact]
    public async Task ListAsync_ReturnsUpcomingThenCompletedWithoutExpiry()
    {
        var repository = new FakeCountdownRepository();
        var userId = Guid.NewGuid();
        var upcoming = CountdownEventEntity.Create(userId, "Later", DateTime.UtcNow.Date.AddDays(2));
        var completed = CountdownEventEntity.Create(userId, "Past", DateTime.UtcNow.Date.AddDays(-2));
        repository.Events.Add(upcoming);
        repository.Events.Add(completed);
        var service = new CountdownService(repository);

        var result = await service.ListAsync(userId);

        Assert.True(result.IsSuccess);
        var items = result.Value!;
        Assert.Equal(["Later", "Past"], items.Select(item => item.Name).ToArray());
        Assert.True(items[1].IsCompleted);
    }

    [Fact]
    public async Task DeleteAsync_HidesOwnedCountdownAndRetainsCover()
    {
        var repository = new FakeCountdownRepository();
        var assets = new FakeAssetRepository();
        var storage = new FakeAssetObjectStorage();
        var userId = Guid.NewGuid();
        var asset = Asset.CreatePending(Guid.NewGuid(), userId, AssetType.CountdownCover, "users/u/countdown-cover/1", "image/png", 0, DateTime.UtcNow.AddHours(1));
        asset.FinalizeUpload(asset.ContentType, 1024);
        assets.Assets.Add(asset);
        var countdownEvent = CountdownEventEntity.Create(userId, "Exam", DateTime.UtcNow.AddDays(1), asset.Id);
        repository.Events.Add(countdownEvent);
        var service = new CountdownService(repository, assets, storage);

        var result = await service.DeleteAsync(userId, countdownEvent.Id);
        var listed = await service.ListAsync(userId);
        var repeated = await service.DeleteAsync(userId, countdownEvent.Id);

        Assert.True(result.IsSuccess);
        Assert.Contains(countdownEvent, repository.Events);
        Assert.NotNull(countdownEvent.DeletedAt);
        Assert.Equal(countdownEvent.DeletedAt, countdownEvent.UpdatedAt);
        Assert.Empty(listed.Value!);
        Assert.False(repeated.IsSuccess);
        Assert.Equal("COUNTDOWN_NOT_FOUND", repeated.Error!.Code);
        Assert.Equal(AssetStatus.Ready, asset.Status);
        Assert.Null(storage.DeletedObjectKey);
    }

    [Fact]
    public async Task DeleteAsync_DoesNotCallUnavailableStorage()
    {
        var repository = new FakeCountdownRepository();
        var assets = new FakeAssetRepository();
        var storage = new FakeAssetObjectStorage { FailDelete = true };
        var userId = Guid.NewGuid();
        var asset = Asset.CreatePending(Guid.NewGuid(), userId, AssetType.CountdownCover, "countdown-covers/cover.png", "image/png", 0, DateTime.UtcNow.AddHours(1));
        asset.FinalizeUpload(asset.ContentType, 1024);
        assets.Assets.Add(asset);
        var countdown = CountdownEventEntity.Create(userId, "Exam", DateTime.UtcNow.AddDays(1), asset.Id);
        repository.Events.Add(countdown);
        var service = new CountdownService(repository, assets, storage);

        var result = await service.DeleteAsync(userId, countdown.Id);

        Assert.True(result.IsSuccess);
        Assert.Contains(countdown, repository.Events);
        Assert.NotNull(countdown.DeletedAt);
        Assert.Equal(AssetStatus.Ready, asset.Status);
        Assert.Null(storage.DeletedObjectKey);
    }

    [Fact]
    public async Task DeleteAsync_ForeignCountdownReturnsNotFound()
    {
        var repository = new FakeCountdownRepository();
        var countdown = CountdownEventEntity.Create(Guid.NewGuid(), "Exam", DateTime.UtcNow.AddDays(1));
        repository.Events.Add(countdown);
        var service = new CountdownService(repository);

        var result = await service.DeleteAsync(Guid.NewGuid(), countdown.Id);

        Assert.False(result.IsSuccess);
        Assert.Equal("COUNTDOWN_NOT_FOUND", Assert.IsType<CountdownError>(result.Error).Code);
        Assert.Contains(countdown, repository.Events);
    }

    [Fact]
    public async Task CreateAndListAsync_UseAnExclusiveReadyCoverAndReturnSignedDeliveryData()
    {
        var repository = new FakeCountdownRepository();
        var assets = new FakeAssetRepository();
        var storage = new FakeAssetObjectStorage();
        var userId = Guid.NewGuid();
        var asset = Asset.CreatePending(Guid.NewGuid(), userId, AssetType.CountdownCover, "countdown-covers/users/u/cover.png", "image/png", 0, DateTime.UtcNow.AddHours(1));
        asset.FinalizeUpload(asset.ContentType, 1024);
        assets.Assets.Add(asset);
        var service = new CountdownService(repository, assets, storage);
        var request = new CreateCountdownEventRequest("Exam", DateTime.UtcNow.AddDays(2).ToString("yyyy-MM-dd"), asset.Id);

        var created = await service.CreateAsync(userId, request);
        var duplicate = await service.CreateAsync(userId, request with { Name = "Duplicate" });
        var listed = await service.ListAsync(userId);

        Assert.True(created.IsSuccess);
        Assert.Equal("https://signed.example.com/countdown-covers/users/u/cover.png", created.Value!.CoverDownloadUrl);
        Assert.NotNull(created.Value.CoverDownloadUrlExpiresAt);
        Assert.False(duplicate.IsSuccess);
        Assert.Equal("VALIDATION_ERROR", Assert.IsType<CountdownError>(duplicate.Error).Code);
        Assert.Equal(created.Value.CoverDownloadUrl, Assert.Single(listed.Value!).CoverDownloadUrl);
    }

    private sealed class FakeCountdownRepository : ICountdownRepository
    {
        public List<CountdownEventEntity> Events { get; } = [];

        public Task<IReadOnlyList<CountdownEventEntity>> ListAsync(Guid userId, CancellationToken cancellationToken = default)
        {
            IReadOnlyList<CountdownEventEntity> events = Events
                .Where(countdownEvent => countdownEvent.UserId == userId && countdownEvent.DeletedAt is null)
                .OrderBy(countdownEvent => countdownEvent.TargetDate)
                .ThenBy(countdownEvent => countdownEvent.CreatedAt)
                .ToList();
            return Task.FromResult(events);
        }

        public Task<CountdownEventEntity?> GetAsync(Guid userId, Guid countdownId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Events.FirstOrDefault(countdownEvent =>
                countdownEvent.UserId == userId
                && countdownEvent.Id == countdownId
                && countdownEvent.DeletedAt is null));
        }

        public Task<bool> IsCoverAssetAttachedAsync(Guid coverAssetId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Events.Any(countdownEvent => countdownEvent.CoverAssetId == coverAssetId));
        }

        public Task AddAsync(CountdownEventEntity countdownEvent, CancellationToken cancellationToken = default)
        {
            Events.Add(countdownEvent);
            return Task.CompletedTask;
        }

        public Task SaveChangesAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
    }

    private sealed class FakeAssetRepository : IAssetRepository
    {
        public List<Asset> Assets { get; } = [];

        public Task AddAsync(Asset asset, CancellationToken cancellationToken = default) => Task.CompletedTask;

        public Task<Asset?> GetByIdAsync(Guid assetId, CancellationToken cancellationToken = default) =>
            Task.FromResult(Assets.FirstOrDefault(asset => asset.Id == assetId));

        public Task<Asset?> GetOwnedAsync(Guid userId, Guid assetId, CancellationToken cancellationToken = default) =>
            Task.FromResult(Assets.FirstOrDefault(asset => asset.UploadedByUserId == userId && asset.Id == assetId && asset.DeletedAt is null));

        public Task<IReadOnlyList<Asset>> GetOwnedAsync(Guid userId, IReadOnlyCollection<Guid> assetIds, CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<Asset>>(Assets
                .Where(asset => asset.UploadedByUserId == userId && asset.DeletedAt is null && assetIds.Contains(asset.Id))
                .ToList());

        public Task UpdateAsync(Asset asset, CancellationToken cancellationToken = default) => Task.CompletedTask;
    }

    private sealed class FakeAssetObjectStorage : IAssetObjectStorage
    {
        public bool FailDelete { get; init; }
        public string? DeletedObjectKey { get; private set; }

        public AssetPresignedUpload CreatePresignedUpload(AssetUploadRequest request) => throw new NotSupportedException();
        public AssetPresignedDownload CreatePresignedDownload(AssetDownloadRequest request) =>
            new($"https://signed.example.com/{request.ObjectKey}", DateTime.UtcNow.AddMinutes(5));
        public Task<AssetObjectMetadata?> GetObjectMetadataAsync(string objectKey, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<byte[]?> GetObjectPrefixAsync(string objectKey, int maxBytes, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task DeleteIfExistsAsync(string objectKey, CancellationToken cancellationToken = default)
        {
            if (FailDelete) throw new AssetStorageUnavailableException("Storage unavailable.");
            DeletedObjectKey = objectKey;
            return Task.CompletedTask;
        }
    }
}
