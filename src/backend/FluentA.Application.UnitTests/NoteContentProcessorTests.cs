using FluentA.Application.BoundedContexts.Assets;
using FluentA.Application.BoundedContexts.Note;
using FluentA.Domain.BoundedContexts.Assets.Entities;
using FluentA.Domain.BoundedContexts.Assets.Enums;
using FluentA.Infrastructure.Note;

namespace FluentA.Application.UnitTests;

public sealed class NoteContentProcessorTests
{
    [Fact]
    public async Task ProcessAsync_PersistsOwnedReadyNoteImageReferencesWithoutSources()
    {
        var userId = Guid.NewGuid();
        var asset = Asset.CreatePending(Guid.NewGuid(), userId, AssetType.NoteImage, "users/demo/note-image/1", "https://cdn.example.com/1.png", "image/png", 0, DateTime.UtcNow.AddHours(1));
        asset.FinalizeUpload("https://cdn.example.com/1.png", "image/png", 128);
        var processor = new NoteContentProcessor(new FakeAssetRepository(asset));

        var result = await processor.ProcessAsync(
            userId,
            $"<p><img src=\"https://wrong.example.com/1.png\" data-note-asset-id=\"{asset.Id}\" alt=\"Diagram\"></p>");

        Assert.Contains($"data-note-asset-id=\"{asset.Id}\"", result.Html);
        Assert.DoesNotContain("src=", result.Html, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("wrong.example.com", result.Html, StringComparison.OrdinalIgnoreCase);
        Assert.Contains(asset.Id, result.ReferencedAssetIds);
    }

    [Fact]
    public async Task ProcessAsync_RejectsBase64Images()
    {
        var processor = new NoteContentProcessor(new FakeAssetRepository());

        var exception = await Assert.ThrowsAsync<NoteContentValidationException>(() =>
            processor.ProcessAsync(Guid.NewGuid(), "<p><img src=\"data:image/png;base64,AAAA\" data-note-asset-id=\"11111111-1111-1111-1111-111111111111\"></p>"));

        Assert.Contains("content", exception.Errors.Keys);
    }

    [Fact]
    public async Task ProcessAsync_RejectsForeignOrNonFinalizedNoteImages()
    {
        var ownerId = Guid.NewGuid();
        var asset = Asset.CreatePending(Guid.NewGuid(), Guid.NewGuid(), AssetType.NoteImage, "users/demo/note-image/2", "https://cdn.example.com/2.png", "image/png", 0, DateTime.UtcNow.AddHours(1));
        asset.FinalizeUpload("https://cdn.example.com/2.png", "image/png", 128);
        var processor = new NoteContentProcessor(new FakeAssetRepository(asset));

        var exception = await Assert.ThrowsAsync<NoteContentValidationException>(() =>
            processor.ProcessAsync(ownerId, $"<p><img src=\"{asset.PublicUrl}\" data-note-asset-id=\"{asset.Id}\"></p>"));

        Assert.Contains("content", exception.Errors.Keys);
    }

    private sealed class FakeAssetRepository : IAssetRepository
    {
        private readonly List<Asset> _assets;

        public FakeAssetRepository(params Asset[] assets)
        {
            _assets = assets.ToList();
        }

        public Task AddAsync(Asset asset, CancellationToken cancellationToken = default)
        {
            _assets.Add(asset);
            return Task.CompletedTask;
        }

        public Task<Asset?> GetByIdAsync(Guid assetId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(_assets.FirstOrDefault(asset => asset.Id == assetId));
        }

        public Task<Asset?> GetOwnedAsync(Guid userId, Guid assetId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(_assets.FirstOrDefault(asset => asset.Id == assetId && asset.UserId == userId && asset.DeletedAt is null));
        }

        public Task<IReadOnlyList<Asset>> GetOwnedAsync(Guid userId, IReadOnlyCollection<Guid> assetIds, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<Asset>>(_assets
                .Where(asset => asset.UserId == userId && asset.DeletedAt is null && assetIds.Contains(asset.Id))
                .ToList());
        }

        public Task<IReadOnlyList<Asset>> ListOwnedAsync(Guid userId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<Asset>>(_assets.Where(asset => asset.UserId == userId && asset.DeletedAt is null).ToList());
        }

        public Task<IReadOnlyList<Asset>> ListPendingCleanupCandidatesAsync(DateTime nowUtc, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<Asset>>([]);
        }

        public Task UpdateAsync(Asset asset, CancellationToken cancellationToken = default) => Task.CompletedTask;
    }
}
