using System.Reflection;
using FluentA.Application.BoundedContexts.Assets;
using FluentA.Application.BoundedContexts.Note;
using FluentA.Application.BoundedContexts.Note.DTOs;
using FluentA.Domain.BoundedContexts.Assets.Entities;
using FluentA.Domain.BoundedContexts.Assets.Enums;
using FluentA.Domain.BoundedContexts.Note.Entities;
using FluentA.Infrastructure.Note;

namespace FluentA.Application.UnitTests;

public sealed class NoteServiceTests
{
    [Fact]
    public async Task CreateListUpdateDeleteBoard_UsesOwnedBoardsNewestFirst()
    {
        var repository = new FakeNoteRepository();
        var service = new NoteService(repository, new FakeNoteContentProcessor(), new FakeAssetRepository(), new FakeAssetObjectStorage());
        var userId = Guid.NewGuid();

        var first = await service.CreateBoardAsync(userId, new CreateNoteBoardRequest("First"));
        await Task.Delay(2);
        var second = await service.CreateBoardAsync(userId, new CreateNoteBoardRequest("Second"));
        var listed = await service.ListBoardsAsync(userId);
        var updated = await service.UpdateBoardAsync(userId, first.Value!.Id, new UpdateNoteBoardRequest("Updated"));
        var deleted = await service.DeleteBoardAsync(userId, second.Value!.Id);
        var afterDelete = await service.ListBoardsAsync(userId);

        Assert.True(first.IsSuccess);
        Assert.Equal(["Second", "First"], listed.Value!.Select(board => board.Name));
        Assert.Equal("Updated", updated.Value!.Name);
        Assert.True(deleted.Value);
        Assert.Single(afterDelete.Value!);
    }

    [Fact]
    public async Task CreateGetUpdateDeletePage_UsesOwnedPages()
    {
        var repository = new FakeNoteRepository();
        var service = new NoteService(repository, new FakeNoteContentProcessor(), new FakeAssetRepository(), new FakeAssetObjectStorage());
        var userId = Guid.NewGuid();
        var board = await service.CreateBoardAsync(userId, new CreateNoteBoardRequest("Board"));

        var created = await service.CreatePageAsync(userId, board.Value!.Id, new CreateNotePageRequest("Page"));
        var fetched = await service.GetPageAsync(userId, created.Value!.Id);
        var updated = await service.UpdatePageAsync(userId, created.Value.Id, new UpdateNotePageRequest("Renamed", "<p>Saved</p>"));
        var deleted = await service.DeletePageAsync(userId, created.Value.Id);
        var missing = await service.GetPageAsync(userId, created.Value.Id);

        Assert.True(created.IsSuccess);
        Assert.Equal(string.Empty, created.Value!.Content);
        Assert.Equal(created.Value.Id, fetched.Value!.Id);
        Assert.Equal("Renamed", updated.Value!.Name);
        Assert.Equal("<p>Saved</p>", updated.Value.Content);
        Assert.True(deleted.Value);
        Assert.Equal("NOTE_PAGE_NOT_FOUND", ((NoteError)missing.Error!).Code);
    }

    [Fact]
    public async Task ForeignOrDeletedResources_ReturnNoteNotFound()
    {
        var repository = new FakeNoteRepository();
        var service = new NoteService(repository, new FakeNoteContentProcessor(), new FakeAssetRepository(), new FakeAssetObjectStorage());
        var ownerId = Guid.NewGuid();
        var board = await service.CreateBoardAsync(ownerId, new CreateNoteBoardRequest("Private"));
        var page = await service.CreatePageAsync(ownerId, board.Value!.Id, new CreateNotePageRequest("Entry"));

        var foreignBoard = await service.UpdateBoardAsync(Guid.NewGuid(), board.Value!.Id, new UpdateNoteBoardRequest("Nope"));
        var foreignPage = await service.GetPageAsync(Guid.NewGuid(), page.Value!.Id);
        await service.DeleteBoardAsync(ownerId, board.Value.Id);
        var deletedPage = await service.GetPageAsync(ownerId, page.Value!.Id);

        Assert.Equal("NOTE_BOARD_NOT_FOUND", ((NoteError)foreignBoard.Error!).Code);
        Assert.Equal("NOTE_PAGE_NOT_FOUND", ((NoteError)foreignPage.Error!).Code);
        Assert.Equal("NOTE_PAGE_NOT_FOUND", ((NoteError)deletedPage.Error!).Code);
    }

    [Fact]
    public async Task CreateAndUpdate_RejectInvalidFields()
    {
        var service = new NoteService(new FakeNoteRepository(), new FakeNoteContentProcessor(), new FakeAssetRepository(), new FakeAssetObjectStorage());
        var userId = Guid.NewGuid();
        var invalidBoard = await service.CreateBoardAsync(userId, new CreateNoteBoardRequest(" "));
        var board = await service.CreateBoardAsync(userId, new CreateNoteBoardRequest("Board"));
        var invalidPage = await service.CreatePageAsync(userId, board.Value!.Id, new CreateNotePageRequest(" "));
        var page = await service.CreatePageAsync(userId, board.Value.Id, new CreateNotePageRequest("Page"));
        var invalidUpdate = await service.UpdatePageAsync(userId, page.Value!.Id, new UpdateNotePageRequest(Content: new string('a', 100_001)));

        Assert.Equal("VALIDATION_ERROR", ((NoteError)invalidBoard.Error!).Code);
        Assert.Equal("VALIDATION_ERROR", ((NoteError)invalidPage.Error!).Code);
        Assert.Equal("VALIDATION_ERROR", ((NoteError)invalidUpdate.Error!).Code);
    }

    [Fact]
    public async Task UpdatePage_ArchivesRemovedNoteImages()
    {
        var repository = new FakeNoteRepository();
        var assets = new FakeAssetRepository();
        var service = new NoteService(repository, new FakeNoteContentProcessor(), assets, new FakeAssetObjectStorage());
        var userId = Guid.NewGuid();
        var board = await service.CreateBoardAsync(userId, new CreateNoteBoardRequest("Board"));
        var page = await service.CreatePageAsync(userId, board.Value!.Id, new CreateNotePageRequest("Page"));
        var asset = Asset.CreatePending(Guid.NewGuid(), userId, AssetType.NoteImage, "users/demo/note-image/1", "image/png", 0, DateTime.UtcNow.AddHours(1));
        asset.FinalizeUpload("image/png", 128);
        assets.Assets.Add(asset);

        await service.UpdatePageAsync(userId, page.Value!.Id, new UpdateNotePageRequest(Content: $"<p><img src=\"{"https://render.example/image.png"}\" data-note-asset-id=\"{asset.Id}\" alt=\"Diagram\"></p>"));
        var updated = await service.UpdatePageAsync(userId, page.Value.Id, new UpdateNotePageRequest(Content: "<p>Removed image</p>"));

        Assert.True(updated.IsSuccess);
        Assert.Equal(AssetStatus.Archived, asset.Status);
    }

    [Fact]
    public async Task UpdatePage_ArchivesRemovedImageAfterTheExclusiveAttachmentIsDetached()
    {
        var repository = new FakeNoteRepository();
        var assets = new FakeAssetRepository();
        var service = new NoteService(repository, new FakeNoteContentProcessor(), assets, new FakeAssetObjectStorage());
        var userId = Guid.NewGuid();
        var board = await service.CreateBoardAsync(userId, new CreateNoteBoardRequest("Board"));
        var first = await service.CreatePageAsync(userId, board.Value!.Id, new CreateNotePageRequest("First"));
        var second = await service.CreatePageAsync(userId, board.Value.Id, new CreateNotePageRequest("Second"));
        var asset = Asset.CreatePending(Guid.NewGuid(), userId, AssetType.NoteImage, "users/demo/note-image/2", "image/png", 0, DateTime.UtcNow.AddHours(1));
        asset.FinalizeUpload("image/png", 128);
        assets.Assets.Add(asset);
        var html = $"<p><img src=\"{"https://render.example/image.png"}\" data-note-asset-id=\"{asset.Id}\" alt=\"Diagram\"></p>";

        await service.UpdatePageAsync(userId, first.Value!.Id, new UpdateNotePageRequest(Content: html));
        await service.UpdatePageAsync(userId, second.Value!.Id, new UpdateNotePageRequest(Content: html));
        var updated = await service.UpdatePageAsync(userId, first.Value.Id, new UpdateNotePageRequest(Content: "<p>Removed from first</p>"));

        Assert.True(updated.IsSuccess);
        Assert.Equal(AssetStatus.Archived, asset.Status);
    }

    [Fact]
    public async Task UpdatePage_PersistsAssetReferenceWithoutSourceAndHydratesSignedUrlOnRead()
    {
        var repository = new FakeNoteRepository();
        var assets = new FakeAssetRepository();
        var storage = new FakeAssetObjectStorage();
        var service = new NoteService(repository, new NoteContentProcessor(assets), assets, storage);
        var userId = Guid.NewGuid();
        var board = await service.CreateBoardAsync(userId, new CreateNoteBoardRequest("Board"));
        var page = await service.CreatePageAsync(userId, board.Value!.Id, new CreateNotePageRequest("Page"));
        var asset = Asset.CreatePending(Guid.NewGuid(), userId, AssetType.NoteImage, "note-images/users/demo/image.png", "image/png", 0, DateTime.UtcNow.AddHours(1));
        asset.FinalizeUpload("image/png", 128);
        assets.Assets.Add(asset);

        var updated = await service.UpdatePageAsync(userId, page.Value!.Id, new UpdateNotePageRequest(Content: $"<p><img src=\"https://attacker.example/image.png\" data-note-asset-id=\"{asset.Id}\" alt=\"Diagram\"></p>"));
        var stored = repository.GetStoredPage(page.Value.Id);
        var reread = await service.GetPageAsync(userId, page.Value.Id);

        Assert.True(updated.IsSuccess);
        Assert.DoesNotContain("src=", stored.Content, StringComparison.OrdinalIgnoreCase);
        Assert.Contains(asset.Id.ToString(), stored.Content, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("https://signed.example.com/", reread.Value!.Content, StringComparison.Ordinal);
    }

    [Fact]
    public async Task UpdatePage_RejectsAttachingSameImageToAnotherPage()
    {
        var repository = new FakeNoteRepository();
        var assets = new FakeAssetRepository();
        var service = new NoteService(repository, new FakeNoteContentProcessor(), assets, new FakeAssetObjectStorage());
        var userId = Guid.NewGuid();
        var board = await service.CreateBoardAsync(userId, new CreateNoteBoardRequest("Board"));
        var first = await service.CreatePageAsync(userId, board.Value!.Id, new CreateNotePageRequest("First"));
        var second = await service.CreatePageAsync(userId, board.Value.Id, new CreateNotePageRequest("Second"));
        var asset = Asset.CreatePending(Guid.NewGuid(), userId, AssetType.NoteImage, "note-images/users/demo/image.png", "image/png", 0, DateTime.UtcNow.AddHours(1));
        asset.FinalizeUpload("image/png", 128);
        assets.Assets.Add(asset);
        var content = $"<p><img data-note-asset-id=\"{asset.Id}\"></p>";

        await service.UpdatePageAsync(userId, first.Value!.Id, new UpdateNotePageRequest(Content: content));
        var secondUpdate = await service.UpdatePageAsync(userId, second.Value!.Id, new UpdateNotePageRequest(Content: content));

        Assert.False(secondUpdate.IsSuccess);
        Assert.Equal("VALIDATION_ERROR", ((NoteError)secondUpdate.Error!).Code);
    }

    private sealed class FakeNoteRepository : INoteRepository
    {
        private readonly List<NoteBoard> _boards = [];
        private readonly List<NotePage> _pages = [];
        private readonly Dictionary<Guid, HashSet<Guid>> _assetIdsByPage = [];

        public Task<IReadOnlyList<NoteBoard>> ListBoardsAsync(Guid userId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<NoteBoard>>(_boards
                .Where(board => board.UserId == userId && board.DeletedAt is null)
                .OrderByDescending(board => board.CreatedAt)
                .ThenByDescending(board => board.Id)
                .ToList());
        }

        public Task<NoteBoard?> GetBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(_boards.FirstOrDefault(board => board.UserId == userId && board.Id == boardId && board.DeletedAt is null));
        }

        public Task<NotePage?> GetPageAsync(Guid userId, Guid pageId, CancellationToken cancellationToken = default)
        {
            var ownedBoardIds = _boards
                .Where(board => board.UserId == userId && board.DeletedAt is null)
                .Select(board => board.Id)
                .ToHashSet();
            return Task.FromResult(_pages.FirstOrDefault(page => page.Id == pageId && page.DeletedAt is null && ownedBoardIds.Contains(page.BoardId)));
        }

        public NotePage GetStoredPage(Guid pageId) => _pages.Single(page => page.Id == pageId);

        public Task<IReadOnlySet<Guid>> GetPageAssetIdsAsync(Guid pageId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlySet<Guid>>(_assetIdsByPage.GetValueOrDefault(pageId, []).ToHashSet());
        }

        public Task<IReadOnlyDictionary<Guid, Guid>> GetAttachedAssetPageIdsAsync(IReadOnlyCollection<Guid> assetIds, CancellationToken cancellationToken = default)
        {
            var result = _assetIdsByPage
                .SelectMany(entry => entry.Value.Select(assetId => new KeyValuePair<Guid, Guid>(assetId, entry.Key)))
                .Where(entry => assetIds.Contains(entry.Key))
                .ToDictionary(entry => entry.Key, entry => entry.Value);
            return Task.FromResult<IReadOnlyDictionary<Guid, Guid>>(result);
        }

        public Task ReplacePageAssetLinksAsync(Guid pageId, IReadOnlySet<Guid> assetIds, CancellationToken cancellationToken = default)
        {
            _assetIdsByPage[pageId] = assetIds.ToHashSet();
            return Task.CompletedTask;
        }

        public Task AddBoardAsync(NoteBoard board, CancellationToken cancellationToken = default)
        {
            _boards.Add(board);
            return Task.CompletedTask;
        }

        public Task AddPageAsync(NotePage page, CancellationToken cancellationToken = default)
        {
            _pages.Add(page);
            var board = _boards.Single(item => item.Id == page.BoardId);
            var pagesField = typeof(NoteBoard).GetField("_pages", BindingFlags.Instance | BindingFlags.NonPublic);
            var pages = (List<NotePage>?)pagesField?.GetValue(board);
            pages?.Add(page);
            return Task.CompletedTask;
        }

        public Task UpdateBoardAsync(NoteBoard board, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task UpdatePageAsync(NotePage page, CancellationToken cancellationToken = default) => Task.CompletedTask;

        public Task SoftDeleteBoardAsync(NoteBoard board, CancellationToken cancellationToken = default)
        {
            board.SoftDelete();
            foreach (var page in _pages.Where(page => page.BoardId == board.Id && page.DeletedAt is null))
            {
                page.SoftDelete(board.UpdatedAt);
                _assetIdsByPage.Remove(page.Id);
            }
            return Task.CompletedTask;
        }

        public Task SoftDeletePageAsync(NotePage page, CancellationToken cancellationToken = default)
        {
            page.SoftDelete();
            _assetIdsByPage.Remove(page.Id);
            return Task.CompletedTask;
        }

        public Task SaveChangesAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
    }

    private sealed class FakeAssetRepository : IAssetRepository
    {
        public List<Asset> Assets { get; } = [];

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
            return Task.FromResult(Assets.FirstOrDefault(asset => asset.Id == assetId && asset.UploadedByUserId == userId && asset.DeletedAt is null));
        }

        public Task<IReadOnlyList<Asset>> GetOwnedAsync(Guid userId, IReadOnlyCollection<Guid> assetIds, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<Asset>>(Assets
                .Where(asset => asset.UploadedByUserId == userId && asset.DeletedAt is null && assetIds.Contains(asset.Id))
                .ToList());
        }

        public Task<IReadOnlyList<Asset>> ListOwnedAsync(Guid userId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<Asset>>(Assets.Where(asset => asset.UploadedByUserId == userId && asset.DeletedAt is null).ToList());
        }

        public Task<IReadOnlyList<Asset>> ListPendingCleanupCandidatesAsync(DateTime nowUtc, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<Asset>>([]);
        }

        public Task UpdateAsync(Asset asset, CancellationToken cancellationToken = default) => Task.CompletedTask;
    }

    private sealed class FakeNoteContentProcessor : INoteContentProcessor
    {
        public Task<NoteProcessedContent> ProcessAsync(Guid userId, string? content, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(new NoteProcessedContent(content ?? string.Empty, ExtractReferencedAssetIds(content)));
        }

        public IReadOnlySet<Guid> ExtractReferencedAssetIds(string? content)
        {
            var ids = new HashSet<Guid>();
            if (string.IsNullOrWhiteSpace(content))
            {
                return ids;
            }

            foreach (var token in content.Split(['"', '\'', ' ', '<', '>', '='], StringSplitOptions.RemoveEmptyEntries))
            {
                if (Guid.TryParse(token, out var id))
                {
                    ids.Add(id);
                }
            }

            return ids;
        }

        public string HydrateImageSources(string? content, IReadOnlyDictionary<Guid, string> assetUrls) => content ?? string.Empty;
    }

    private sealed class FakeAssetObjectStorage : IAssetObjectStorage
    {
        public AssetPresignedUpload CreatePresignedUpload(AssetUploadRequest request) => throw new NotSupportedException();
        public AssetPresignedDownload CreatePresignedDownload(AssetDownloadRequest request) => new($"https://signed.example.com/{request.ObjectKey}", DateTime.UtcNow.Add(request.Lifetime));
        public Task<AssetObjectMetadata?> GetObjectMetadataAsync(string objectKey, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<byte[]?> GetObjectPrefixAsync(string objectKey, int maxBytes, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task DeleteIfExistsAsync(string objectKey, CancellationToken cancellationToken = default) => Task.CompletedTask;
    }
}
