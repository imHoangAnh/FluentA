using FluentA.Application.BoundedContexts.Note;
using FluentA.Domain.BoundedContexts.Note.Entities;
using FluentA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FluentA.Infrastructure.Note;

public sealed class EfNoteRepository : INoteRepository
{
    private readonly AppDbContext _dbContext;

    public EfNoteRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<NoteBoard>> ListBoardsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.NoteBoards
            .Include(board => board.Pages)
            .Where(board => board.UserId == userId && board.DeletedAt == null)
            .OrderByDescending(board => board.CreatedAt)
            .ThenByDescending(board => board.Id)
            .ToListAsync(cancellationToken);
    }

    public Task<NoteBoard?> GetBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default)
    {
        return _dbContext.NoteBoards
            .Include(board => board.Pages)
            .FirstOrDefaultAsync(board => board.Id == boardId && board.UserId == userId && board.DeletedAt == null, cancellationToken);
    }

    public Task<NotePage?> GetPageAsync(Guid userId, Guid pageId, CancellationToken cancellationToken = default)
    {
        return (
            from page in _dbContext.NotePages
            join board in _dbContext.NoteBoards on page.BoardId equals board.Id
            where page.Id == pageId
                && page.DeletedAt == null
                && board.UserId == userId
                && board.DeletedAt == null
            select page)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<IReadOnlySet<Guid>> GetPageAssetIdsAsync(Guid pageId, CancellationToken cancellationToken = default)
    {
        return (await _dbContext.NotePageAssets
                .Where(link => link.NotePageId == pageId && link.DeletedAt == null)
                .Select(link => link.AssetId)
                .ToListAsync(cancellationToken))
            .ToHashSet();
    }

    public async Task<IReadOnlyDictionary<Guid, Guid>> GetAttachedAssetPageIdsAsync(IReadOnlyCollection<Guid> assetIds, CancellationToken cancellationToken = default)
    {
        if (assetIds.Count == 0)
        {
            return new Dictionary<Guid, Guid>();
        }

        return await _dbContext.NotePageAssets
            .Where(link => link.DeletedAt == null && assetIds.Contains(link.AssetId))
            .ToDictionaryAsync(link => link.AssetId, link => link.NotePageId, cancellationToken);
    }

    public async Task ReplacePageAssetLinksAsync(Guid pageId, IReadOnlySet<Guid> assetIds, CancellationToken cancellationToken = default)
    {
        var currentLinks = await _dbContext.NotePageAssets
            .Where(link => link.NotePageId == pageId && link.DeletedAt == null)
            .ToListAsync(cancellationToken);
        var currentAssetIds = currentLinks.Select(link => link.AssetId).ToHashSet();

        _dbContext.NotePageAssets.RemoveRange(currentLinks.Where(link => !assetIds.Contains(link.AssetId)));
        var additions = assetIds
            .Where(assetId => !currentAssetIds.Contains(assetId))
            .Select(assetId => NotePageAsset.Create(pageId, assetId));
        await _dbContext.NotePageAssets.AddRangeAsync(additions, cancellationToken);
    }

    public async Task AddBoardAsync(NoteBoard board, CancellationToken cancellationToken = default)
    {
        await _dbContext.NoteBoards.AddAsync(board, cancellationToken);
    }

    public async Task AddPageAsync(NotePage page, CancellationToken cancellationToken = default)
    {
        await _dbContext.NotePages.AddAsync(page, cancellationToken);
    }

    public Task UpdateBoardAsync(NoteBoard board, CancellationToken cancellationToken = default)
    {
        _dbContext.NoteBoards.Update(board);
        return Task.CompletedTask;
    }

    public Task UpdatePageAsync(NotePage page, CancellationToken cancellationToken = default)
    {
        _dbContext.NotePages.Update(page);
        return Task.CompletedTask;
    }

    public async Task SoftDeleteBoardAsync(NoteBoard board, CancellationToken cancellationToken = default)
    {
        board.SoftDelete();

        var pages = await _dbContext.NotePages
            .Where(page => page.BoardId == board.Id && page.DeletedAt == null)
            .ToListAsync(cancellationToken);
        foreach (var page in pages)
        {
            page.SoftDelete(board.UpdatedAt);
        }

        var links = await _dbContext.NotePageAssets
            .Where(link => pages.Select(page => page.Id).Contains(link.NotePageId))
            .ToListAsync(cancellationToken);
        _dbContext.NotePageAssets.RemoveRange(links);
    }

    public async Task SoftDeletePageAsync(NotePage page, CancellationToken cancellationToken = default)
    {
        page.SoftDelete();
        var links = await _dbContext.NotePageAssets
            .Where(link => link.NotePageId == page.Id)
            .ToListAsync(cancellationToken);
        _dbContext.NotePageAssets.RemoveRange(links);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }
}
