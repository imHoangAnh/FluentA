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

    public Task<bool> IsAssetReferencedAsync(Guid userId, Guid assetId, Guid? excludingPageId = null, CancellationToken cancellationToken = default)
    {
        var assetIdText = assetId.ToString();

        return (
            from page in _dbContext.NotePages
            join board in _dbContext.NoteBoards on page.BoardId equals board.Id
            where page.DeletedAt == null
                && board.UserId == userId
                && board.DeletedAt == null
                && (!excludingPageId.HasValue || page.Id != excludingPageId.Value)
                && EF.Functions.Like(page.Content, $"%{assetIdText}%")
            select page.Id)
            .AnyAsync(cancellationToken);
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
    }

    public Task SoftDeletePageAsync(NotePage page, CancellationToken cancellationToken = default)
    {
        page.SoftDelete();
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }
}
