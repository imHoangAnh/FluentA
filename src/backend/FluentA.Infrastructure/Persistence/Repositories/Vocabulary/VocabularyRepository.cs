using FluentA.Application.BoundedContexts.Vocabulary;
using FluentA.Domain.SeedWork;
using FluentA.Domain.BoundedContexts.Vocabulary.Entities;
using FluentA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FluentA.Infrastructure.Persistence.Repositories.Vocabulary;

public sealed class VocabularyRepository : IVocabularyRepository
{
    private readonly AppDbContext _dbContext;

    public VocabularyRepository(AppDbContext dbContext)
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

    public async Task AddBoardAsync(VocabBoard board, CancellationToken cancellationToken = default)
    {
        await _dbContext.Boards.AddAsync(board, cancellationToken);
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
        if (_dbContext.Entry(board).State == EntityState.Detached)
            _dbContext.Boards.Update(board);
        return Task.CompletedTask;
    }

    public Task UpdatePageAsync(VocabPage page, CancellationToken cancellationToken = default)
    {
        if (_dbContext.Entry(page).State == EntityState.Detached)
            _dbContext.Pages.Update(page);
        return Task.CompletedTask;
    }

    public Task UpdateWordAsync(VocabWord word, CancellationToken cancellationToken = default)
    {
        if (_dbContext.Entry(word).State == EntityState.Detached)
            _dbContext.Words.Update(word);
        return Task.CompletedTask;
    }

    public Task UpdateBoardPreferenceAsync(VocabBoardPreference preference, CancellationToken cancellationToken = default)
    {
        if (_dbContext.Entry(preference).State == EntityState.Detached)
            _dbContext.VocabBoardPreferences.Update(preference);
        return Task.CompletedTask;
    }

    public async Task SoftDeleteBoardAsync(VocabBoard board, DateTime deletedAtUtc, CancellationToken cancellationToken = default)
    {
        board.SoftDelete(deletedAtUtc);

        var pages = await _dbContext.Pages
            .Where(page => page.BoardId == board.Id && page.DeletedAt == null)
            .ToListAsync(cancellationToken);
        foreach (var page in pages)
        {
            page.SoftDelete(deletedAtUtc);
        }

        var pageIds = pages.Select(page => page.Id).ToList();
        var words = await _dbContext.Words
            .Where(word => pageIds.Contains(word.PageId) && word.DeletedAt == null)
            .ToListAsync(cancellationToken);
        foreach (var word in words)
        {
            word.SoftDelete(deletedAtUtc);
        }
        var preferences = await _dbContext.VocabBoardPreferences
            .Where(preference => preference.BoardId == board.Id && preference.DeletedAt == null)
            .ToListAsync(cancellationToken);
        HideRows(preferences, deletedAtUtc);
        await HideLearningHistoryAsync(board.UserId, words.Select(word => word.Id).ToArray(),
            pageIds, deletedAtUtc, cancellationToken);
    }

    public async Task SoftDeletePageAsync(VocabPage page, DateTime deletedAtUtc, CancellationToken cancellationToken = default)
    {
        page.SoftDelete(deletedAtUtc);

        var words = await _dbContext.Words
            .Where(word => word.PageId == page.Id && word.DeletedAt == null)
            .ToListAsync(cancellationToken);
        foreach (var word in words)
        {
            word.SoftDelete(deletedAtUtc);
        }
        var userId = await _dbContext.Boards.Where(board => board.Id == page.BoardId)
            .Select(board => board.UserId).SingleAsync(cancellationToken);
        await HideLearningHistoryAsync(userId, words.Select(word => word.Id).ToArray(),
            [page.Id], deletedAtUtc, cancellationToken);
    }

    public async Task SoftDeleteWordAsync(VocabWord word, DateTime deletedAtUtc, CancellationToken cancellationToken = default)
    {
        word.SoftDelete(deletedAtUtc);
        var userId = await (from page in _dbContext.Pages
                            join board in _dbContext.Boards on page.BoardId equals board.Id
                            where page.Id == word.PageId
                            select board.UserId).SingleAsync(cancellationToken);
        await HideLearningHistoryAsync(userId, [word.Id], [word.PageId], deletedAtUtc, cancellationToken, wholePages: false);
    }

    private async Task HideLearningHistoryAsync(Guid userId, IReadOnlyCollection<Guid> wordIds,
        IReadOnlyCollection<Guid> pageIds, DateTime deletedAtUtc, CancellationToken cancellationToken, bool wholePages = true)
    {
        // Keep complete recaps together; no learning row or object is physically deleted.
        var practiceSessions = await _dbContext.PracticeSessions
            .Where(session => session.UserId == userId && session.DeletedAt == null
                && ((wholePages && pageIds.Contains(session.PageId)) || _dbContext.PracticeSessionItems
                    .Any(item => item.PracticeSessionId == session.Id && wordIds.Contains(item.WordId))))
            .ToListAsync(cancellationToken);
        var practiceIds = practiceSessions.Select(session => session.Id).ToArray();
        HideRows(practiceSessions, deletedAtUtc);
        HideRows(await _dbContext.PracticeSessionItems.Where(item => practiceIds.Contains(item.PracticeSessionId)
            && item.DeletedAt == null).ToListAsync(cancellationToken), deletedAtUtc);
        HideRows(await _dbContext.PracticeAttempts.Where(attempt => practiceIds.Contains(attempt.PracticeSessionId)
            && attempt.DeletedAt == null).ToListAsync(cancellationToken), deletedAtUtc);
        HideRows(await _dbContext.PracticeSessionSummaries.Where(summary => summary.UserId == userId
            && pageIds.Contains(summary.PageId) && summary.DeletedAt == null).ToListAsync(cancellationToken), deletedAtUtc);

        var reviewSessions = await _dbContext.ReviewSessions
            .Where(session => session.UserId == userId && session.DeletedAt == null
                && _dbContext.ReviewSessionItems.Any(item => item.ReviewSessionId == session.Id
                    && wordIds.Contains(item.VocabWordId))).ToListAsync(cancellationToken);
        var reviewIds = reviewSessions.Select(session => session.Id).ToArray();
        HideRows(reviewSessions, deletedAtUtc);
        var reviewItems = await _dbContext.ReviewSessionItems.Where(item => reviewIds.Contains(item.ReviewSessionId))
            .ToListAsync(cancellationToken);
        var reviewItemIds = reviewItems.Select(item => item.Id).ToArray();
        HideRows(reviewItems, deletedAtUtc);
        HideRows(await _dbContext.ReviewAttempts.Where(attempt => reviewItemIds.Contains(attempt.ReviewSessionItemId)
            && attempt.DeletedAt == null).ToListAsync(cancellationToken), deletedAtUtc);
        HideRows(await _dbContext.WordReviewHistories.Where(history => history.UserId == userId
            && (wordIds.Contains(history.WordId) || reviewIds.Contains(history.SessionId))
            && history.DeletedAt == null).ToListAsync(cancellationToken), deletedAtUtc);
        HideRows(await _dbContext.WordReviewStates.Where(state => state.UserId == userId
            && wordIds.Contains(state.WordId) && state.DeletedAt == null).ToListAsync(cancellationToken), deletedAtUtc);
    }

    private void HideRows<T>(IEnumerable<T> rows, DateTime deletedAtUtc) where T : BaseEntity
    {
        foreach (var row in rows.Where(row => row.DeletedAt == null))
        {
            _dbContext.Entry(row).Property(entity => entity.DeletedAt).CurrentValue = deletedAtUtc;
            _dbContext.Entry(row).Property(entity => entity.UpdatedAt).CurrentValue = deletedAtUtc;
        }
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }
}
