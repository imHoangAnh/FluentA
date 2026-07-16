using FluentA.Application.BoundedContexts.Assets;
using FluentA.Application.BoundedContexts.Countdown;
using FluentA.Application.BoundedContexts.Countdown.DTOs;
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

        var result = await service.CreateAsync(userId, new CreateCountdownEventRequest(
            " IELTS Exam ",
            target,
            [new CreateCountdownAlertRequest("7DaysBefore", "09:00"), new CreateCountdownAlertRequest("OnTargetDay", "07:30")]));

        Assert.True(result.IsSuccess);
        Assert.Equal("IELTS Exam", result.Value!.Name);
        Assert.Equal(2, result.Value.Alerts.Count);
        Assert.Single(repository.Events);
        Assert.Equal(userId, repository.Events[0].UserId);
    }

    [Fact]
    public async Task CreateAsync_ReturnsValidationErrors()
    {
        var service = new CountdownService(new FakeCountdownRepository());

        var result = await service.CreateAsync(Guid.NewGuid(), new CreateCountdownEventRequest("", "not-a-date", []));

        Assert.False(result.IsSuccess);
        var error = Assert.IsType<CountdownError>(result.Error);
        Assert.Equal("VALIDATION_ERROR", error.Code);
        Assert.Equal(422, error.StatusCode);
    }

    [Fact]
    public async Task CreateAsync_RejectsDuplicateAlertsAndInvalidCover()
    {
        var service = new CountdownService(new FakeCountdownRepository(), new FakeAssetRepository());

        var result = await service.CreateAsync(Guid.NewGuid(), new CreateCountdownEventRequest(
            "Exam",
            DateTime.UtcNow.AddDays(3).ToString("yyyy-MM-dd"),
            [new CreateCountdownAlertRequest("OnTargetDay", "09:00"), new CreateCountdownAlertRequest("OnTargetDay", "09:00")],
            Guid.NewGuid()));

        Assert.False(result.IsSuccess);
        Assert.Equal("VALIDATION_ERROR", Assert.IsType<CountdownError>(result.Error).Code);
    }

    [Fact]
    public async Task ListAsync_ReturnsUpcomingThenCompletedInsideVisibleWindow()
    {
        var repository = new FakeCountdownRepository();
        var userId = Guid.NewGuid();
        var upcoming = CountdownEventEntity.Create(userId, "Later", DateTime.UtcNow.Date.AddDays(2));
        upcoming.AddAlert("OnTargetDay", "09:00", DateTime.UtcNow.AddDays(2));
        var completed = CountdownEventEntity.Create(userId, "Past", DateTime.UtcNow.Date.AddDays(-2));
        completed.AddAlert("OnTargetDay", "09:00", DateTime.UtcNow.AddDays(-2));
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
    public async Task DeleteAsync_SoftDeletesOwnedCountdownAndArchivesItsCover()
    {
        var repository = new FakeCountdownRepository();
        var assets = new FakeAssetRepository();
        var storage = new FakeAssetObjectStorage();
        var userId = Guid.NewGuid();
        var asset = Asset.CreatePending(Guid.NewGuid(), userId, AssetType.CountdownCover, "users/u/countdown-cover/1", "image/png", 0, DateTime.UtcNow.AddHours(1));
        asset.FinalizeUpload(asset.ContentType, 1024);
        assets.Assets.Add(asset);
        var countdownEvent = CountdownEventEntity.Create(userId, "Exam", DateTime.UtcNow.AddDays(1), asset.Id);
        countdownEvent.AddAlert("OnTargetDay", "09:00", DateTime.UtcNow.AddHours(2));
        repository.Events.Add(countdownEvent);
        var service = new CountdownService(repository, assets, storage);

        var result = await service.DeleteAsync(userId, countdownEvent.Id);

        Assert.True(result.IsSuccess);
        Assert.NotNull(countdownEvent.DeletedAt);
        Assert.Null(countdownEvent.CoverAssetId);
        Assert.Equal(AssetStatus.Archived, asset.Status);
        Assert.Null(storage.DeletedObjectKey);
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
        var request = new CreateCountdownEventRequest("Exam", DateTime.UtcNow.AddDays(2).ToString("yyyy-MM-dd"), [new CreateCountdownAlertRequest("OnTargetDay", "09:00")], asset.Id);

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
            return Task.FromResult(Events.Any(countdownEvent => countdownEvent.CoverAssetId == coverAssetId && countdownEvent.DeletedAt is null));
        }

        public Task AddAsync(CountdownEventEntity countdownEvent, CancellationToken cancellationToken = default)
        {
            Events.Add(countdownEvent);
            return Task.CompletedTask;
        }

        public Task UpdateAsync(CountdownEventEntity countdownEvent, CancellationToken cancellationToken = default)
        {
            return Task.CompletedTask;
        }
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

        public Task<IReadOnlyList<Asset>> ListPendingCleanupCandidatesAsync(DateTime nowUtc, CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<Asset>>([]);

        public Task UpdateAsync(Asset asset, CancellationToken cancellationToken = default) => Task.CompletedTask;
    }

    private sealed class FakeAssetObjectStorage : IAssetObjectStorage
    {
        public string? DeletedObjectKey { get; private set; }

        public AssetPresignedUpload CreatePresignedUpload(AssetUploadRequest request) => throw new NotSupportedException();
        public AssetPresignedDownload CreatePresignedDownload(AssetDownloadRequest request) =>
            new($"https://signed.example.com/{request.ObjectKey}", DateTime.UtcNow.AddMinutes(5));
        public Task<AssetObjectMetadata?> GetObjectMetadataAsync(string objectKey, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<byte[]?> GetObjectPrefixAsync(string objectKey, int maxBytes, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task DeleteIfExistsAsync(string objectKey, CancellationToken cancellationToken = default)
        {
            DeletedObjectKey = objectKey;
            return Task.CompletedTask;
        }
    }
}
