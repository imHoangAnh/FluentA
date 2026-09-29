using FluentA.Application.BoundedContexts.Vocabulary;
using FluentA.Domain.BoundedContexts.Vocabulary.Entities;
using FluentA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FluentA.Infrastructure.Persistence.Repositories.Vocabulary;

public sealed class EfVocabularyRepository : IVocabularyRepository
{
    private readonly AppDbContext _dbContext;

    public EfVocabularyRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<VocabBoard>> ListBoardsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Boards
            .Include(board => board.Pages)
            .Where(board => board.UserId == userId && board.DeletedAt == null)
            .OrderByDescending(board => board.CreatedAt)
            .ThenByDescending(board => board.Id)
            .ToListAsync(cancellationToken);
    }

    public Task<VocabBoard?> GetBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default)
    {
        return _dbContext.Boards
            .Include(board => board.Pages)
            .FirstOrDefaultAsync(board => board.Id == boardId && board.UserId == userId && board.DeletedAt == null, cancellationToken);
    }

    public Task<VocabPage?> GetPageAsync(Guid userId, Guid pageId, CancellationToken cancellationToken = default) =>
        (from page in _dbContext.Pages
         join board in _dbContext.Boards on page.BoardId equals board.Id
         where page.Id == pageId
             && page.DeletedAt == null
             && board.UserId == userId
             && board.DeletedAt == null
         select page).FirstOrDefaultAsync(cancellationToken);

    public Task<VocabWord?> GetWordAsync(Guid userId, Guid wordId, CancellationToken cancellationToken = default)
    {
        return (
            from word in _dbContext.Words
            join page in _dbContext.Pages on word.PageId equals page.Id
            join board in _dbContext.Boards on page.BoardId equals board.Id
            where word.Id == wordId
                && word.DeletedAt == null
                && page.DeletedAt == null
                && board.UserId == userId
                && board.DeletedAt == null
            select word)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public Task<VocabBoard?> GetTrashedBoardAsync(Guid userId, Guid boardId, DateTime trashedAt, CancellationToken cancellationToken = default) =>
        _dbContext.Boards.Include(board => board.Pages).FirstOrDefaultAsync(board => board.Id == boardId && board.UserId == userId && board.DeletedAt == trashedAt, cancellationToken);

    public Task<VocabPage?> GetTrashedPageAsync(Guid userId, Guid pageId, DateTime trashedAt, CancellationToken cancellationToken = default) =>
        (from page in _dbContext.Pages
         join board in _dbContext.Boards on page.BoardId equals board.Id
         where page.Id == pageId && page.DeletedAt == trashedAt && board.UserId == userId && board.DeletedAt == null
         select page).FirstOrDefaultAsync(cancellationToken);

    public Task<VocabWord?> GetTrashedWordAsync(Guid userId, Guid wordId, DateTime trashedAt, CancellationToken cancellationToken = default) =>
        (from word in _dbContext.Words
         join page in _dbContext.Pages on word.PageId equals page.Id
         join board in _dbContext.Boards on page.BoardId equals board.Id
         where word.Id == wordId && word.DeletedAt == trashedAt && page.DeletedAt == null && board.UserId == userId && board.DeletedAt == null
         select word).FirstOrDefaultAsync(cancellationToken);

    public Task<VocabBoardPreference?> GetBoardPreferenceAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default)
    {
        return _dbContext.VocabBoardPreferences
            .FirstOrDefaultAsync(preference => preference.UserId == userId && preference.BoardId == boardId && preference.DeletedAt == null, cancellationToken);
    }

    public async Task<IReadOnlyList<VocabWord>> ListWordsAsync(Guid userId, Guid pageId, CancellationToken cancellationToken = default)
    {
        return await (
            from word in _dbContext.Words
            join page in _dbContext.Pages on word.PageId equals page.Id
            join board in _dbContext.Boards on page.BoardId equals board.Id
            where word.PageId == pageId
                && word.DeletedAt == null
                && page.DeletedAt == null
                && board.UserId == userId
                && board.DeletedAt == null
            orderby word.CreatedAt
            select word)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<VocabWord>> ListTrashedWordsAsync(IReadOnlyCollection<Guid> pageIds, DateTime trashedAt, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Words
            .Where(word => pageIds.Contains(word.PageId) && word.DeletedAt == trashedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<VocabWord>> ListWordsForPagesAsync(IReadOnlyCollection<Guid> pageIds, CancellationToken cancellationToken = default)
    {
        if (pageIds.Count == 0)
        {
            return [];
        }

        return await _dbContext.Words
            .Where(word => pageIds.Contains(word.PageId))
            .ToListAsync(cancellationToken);
    }

    public async Task AddBoardAsync(VocabBoard board, CancellationToken cancellationToken = default)
    {
        await _dbContext.Boards.AddAsync(board, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task AddBoardWithPreferencesAsync(VocabBoard board, VocabBoardPreference preference, CancellationToken cancellationToken = default)
    {
        await _dbContext.Boards.AddAsync(board, cancellationToken);
        await _dbContext.VocabBoardPreferences.AddAsync(preference, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task AddPageAsync(VocabPage page, CancellationToken cancellationToken = default)
    {
        await _dbContext.Pages.AddAsync(page, cancellationToken);
    }

    public async Task AddWordAsync(VocabWord word, CancellationToken cancellationToken = default)
    {
        await _dbContext.Words.AddAsync(word, cancellationToken);
    }

    public async Task AddBoardPreferenceAsync(VocabBoardPreference preference, CancellationToken cancellationToken = default)
    {
        await _dbContext.VocabBoardPreferences.AddAsync(preference, cancellationToken);
    }

    public Task UpdateBoardAsync(VocabBoard board, CancellationToken cancellationToken = default)
    {
        _dbContext.Boards.Update(board);
        return _dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task UpdatePageAsync(VocabPage page, CancellationToken cancellationToken = default)
    {
        _dbContext.Pages.Update(page);
        return Task.CompletedTask;
    }

    public Task UpdateWordAsync(VocabWord word, CancellationToken cancellationToken = default)
    {
        _dbContext.Words.Update(word);
        return Task.CompletedTask;
    }

    public Task UpdateBoardPreferenceAsync(VocabBoardPreference preference, CancellationToken cancellationToken = default)
    {
        _dbContext.VocabBoardPreferences.Update(preference);
        return Task.CompletedTask;
    }

    public async Task SoftDeleteBoardAsync(VocabBoard board, DateTime trashedAt, CancellationToken cancellationToken = default)
    {
        board.SoftDelete(trashedAt);

        var pages = await _dbContext.Pages
            .Where(page => page.BoardId == board.Id && page.DeletedAt == null)
            .ToListAsync(cancellationToken);
        foreach (var page in pages)
        {
            page.SoftDelete(trashedAt);
        }

        var pageIds = pages.Select(page => page.Id).ToList();
        var words = await _dbContext.Words
            .Where(word => pageIds.Contains(word.PageId) && word.DeletedAt == null)
            .ToListAsync(cancellationToken);
        foreach (var word in words)
        {
            word.SoftDelete(trashedAt);
        }
    }

    public async Task SoftDeletePageAsync(VocabPage page, DateTime trashedAt, CancellationToken cancellationToken = default)
    {
        page.SoftDelete(trashedAt);

        var words = await _dbContext.Words
            .Where(word => word.PageId == page.Id && word.DeletedAt == null)
            .ToListAsync(cancellationToken);
        foreach (var word in words)
        {
            word.SoftDelete(trashedAt);
        }
    }

    public Task SoftDeleteWordAsync(VocabWord word, DateTime trashedAt, CancellationToken cancellationToken = default)
    {
        word.SoftDelete(trashedAt);
        return Task.CompletedTask;
    }

    public Task RemoveBoardAsync(VocabBoard board, CancellationToken cancellationToken = default) { _dbContext.Boards.Remove(board); return Task.CompletedTask; }
    public Task RemovePageAsync(VocabPage page, CancellationToken cancellationToken = default) { _dbContext.Pages.Remove(page); return Task.CompletedTask; }
    public Task RemoveWordAsync(VocabWord word, CancellationToken cancellationToken = default) { _dbContext.Words.Remove(word); return Task.CompletedTask; }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }
}
