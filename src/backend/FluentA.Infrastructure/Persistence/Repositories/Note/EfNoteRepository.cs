using FluentA.Application.BoundedContexts.Note;
using FluentA.Domain.BoundedContexts.Note.Entities;
using FluentA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FluentA.Infrastructure.Persistence.Repositories.Note;

public sealed class EfNoteRepository : INoteRepository
{
    private readonly AppDbContext _dbContext;

    public EfNoteRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<NoteBoardListItem>> ListBoardsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.NoteBoards
            .AsNoTracking()
            .Where(board => board.UserId == userId && board.DeletedAt == null)
            .OrderByDescending(board => board.CreatedAt)
            .ThenByDescending(board => board.Id)
            .Select(board => new NoteBoardListItem(
                board.Id, board.Name,
                board.Pages.Where(page => page.DeletedAt == null)
                    .OrderByDescending(page => page.CreatedAt).ThenByDescending(page => page.Id)
                    .Select(page => new NotePageListItem(page.Id, page.BoardId, page.Name, page.Date, page.CreatedAt, page.UpdatedAt))
                    .ToList(),
                board.CreatedAt, board.UpdatedAt))
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

        foreach (var link in currentLinks.Where(link => !assetIds.Contains(link.AssetId)))
        {
            link.SoftDelete(DateTime.UtcNow);
        }
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
        if (_dbContext.Entry(board).State == EntityState.Detached)
            _dbContext.NoteBoards.Update(board);
        return Task.CompletedTask;
    }

    public Task UpdatePageAsync(NotePage page, CancellationToken cancellationToken = default)
    {
        if (_dbContext.Entry(page).State == EntityState.Detached)
            _dbContext.NotePages.Update(page);
        return Task.CompletedTask;
    }

    public async Task SoftDeleteBoardAsync(NoteBoard board, DateTime trashedAt, CancellationToken cancellationToken = default)
    {
        board.SoftDelete(trashedAt);

        var pages = await _dbContext.NotePages
            .Where(page => page.BoardId == board.Id && page.DeletedAt == null)
            .ToListAsync(cancellationToken);
        foreach (var page in pages)
        {
            page.SoftDelete(trashedAt);
        }

    }

    public Task SoftDeletePageAsync(NotePage page, DateTime trashedAt, CancellationToken cancellationToken = default)
    {
        page.SoftDelete(trashedAt);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }
}
