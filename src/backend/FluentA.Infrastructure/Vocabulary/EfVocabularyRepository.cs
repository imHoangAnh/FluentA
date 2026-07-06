using FluentA.Application.BoundedContexts.Vocabulary;
using FluentA.Domain.BoundedContexts.Vocabulary.Entities;
using FluentA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FluentA.Infrastructure.Vocabulary;

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
            .OrderBy(board => board.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public Task<VocabBoard?> GetBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default)
    {
        return _dbContext.Boards
            .Include(board => board.Pages)
            .FirstOrDefaultAsync(board => board.Id == boardId && board.UserId == userId && board.DeletedAt == null, cancellationToken);
    }

    public async Task<VocabPage?> GetPageAsync(Guid userId, Guid boardId, Guid pageId, CancellationToken cancellationToken = default)
    {
        var board = await GetBoardAsync(userId, boardId, cancellationToken);
        return board?.Pages.FirstOrDefault(page => page.Id == pageId && page.DeletedAt is null);
    }

    public Task<VocabWord?> GetWordAsync(Guid userId, Guid boardId, Guid wordId, CancellationToken cancellationToken = default)
    {
        return (
            from word in _dbContext.Words
            join page in _dbContext.Pages on word.PageId equals page.Id
            join board in _dbContext.Boards on page.BoardId equals board.Id
            where word.Id == wordId
                && word.DeletedAt == null
                && page.DeletedAt == null
                && board.Id == boardId
                && board.UserId == userId
                && board.DeletedAt == null
            select word)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<VocabWord>> ListWordsAsync(Guid userId, Guid boardId, Guid pageId, CancellationToken cancellationToken = default)
    {
        return await (
            from word in _dbContext.Words
            join page in _dbContext.Pages on word.PageId equals page.Id
            join board in _dbContext.Boards on page.BoardId equals board.Id
            where word.PageId == pageId
                && word.DeletedAt == null
                && page.DeletedAt == null
                && board.Id == boardId
                && board.UserId == userId
                && board.DeletedAt == null
            orderby word.CreatedAt
            select word)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<VocabCustomColumn>> ListCustomColumnsAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default)
    {
        return await (
            from column in _dbContext.VocabCustomColumns
            join board in _dbContext.Boards on column.BoardId equals board.Id
            where column.BoardId == boardId && board.UserId == userId && board.DeletedAt == null
            orderby column.CreatedAt
            select column)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<VocabCustomValue>> ListCustomValuesAsync(IEnumerable<Guid> wordIds, CancellationToken cancellationToken = default)
    {
        var ids = wordIds.Distinct().ToList();
        return ids.Count == 0
            ? []
            : await _dbContext.VocabCustomValues.Where(value => ids.Contains(value.WordId)).ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<VocabColumnVisibility>> ListColumnVisibilityAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.VocabColumnVisibility
            .Where(preference => preference.UserId == userId && preference.BoardId == boardId)
            .ToListAsync(cancellationToken);
    }

    public async Task AddBoardAsync(VocabBoard board, CancellationToken cancellationToken = default)
    {
        await _dbContext.Boards.AddAsync(board, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task AddPageAsync(VocabPage page, CancellationToken cancellationToken = default)
    {
        await _dbContext.Pages.AddAsync(page, cancellationToken);
    }

    public async Task AddWordAsync(VocabWord word, IReadOnlyList<VocabCustomValue>? customValues = null, CancellationToken cancellationToken = default)
    {
        await _dbContext.Words.AddAsync(word, cancellationToken);
        if (customValues is { Count: > 0 })
        {
            await _dbContext.VocabCustomValues.AddRangeAsync(customValues, cancellationToken);
        }
    }

    public async Task AddCustomColumnAsync(VocabCustomColumn column, CancellationToken cancellationToken = default)
    {
        await _dbContext.VocabCustomColumns.AddAsync(column, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task ReplaceColumnVisibilityAsync(Guid userId, Guid boardId, IReadOnlyList<VocabColumnVisibility> preferences, CancellationToken cancellationToken = default)
    {
        var existing = await _dbContext.VocabColumnVisibility
            .Where(preference => preference.UserId == userId && preference.BoardId == boardId)
            .ToListAsync(cancellationToken);
        _dbContext.VocabColumnVisibility.RemoveRange(existing);
        await _dbContext.VocabColumnVisibility.AddRangeAsync(preferences, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<bool> DeleteCustomColumnAsync(Guid userId, Guid boardId, Guid columnId, CancellationToken cancellationToken = default)
    {
        var column = await (
            from candidate in _dbContext.VocabCustomColumns
            join board in _dbContext.Boards on candidate.BoardId equals board.Id
            where candidate.Id == columnId && candidate.BoardId == boardId && board.UserId == userId && board.DeletedAt == null
            select candidate)
            .SingleOrDefaultAsync(cancellationToken);
        if (column is null)
        {
            return false;
        }

        var key = $"custom:{column.Id}".ToLowerInvariant();
        var preferences = await _dbContext.VocabColumnVisibility
            .Where(preference => preference.BoardId == boardId && preference.ColumnKey == key)
            .ToListAsync(cancellationToken);
        _dbContext.VocabColumnVisibility.RemoveRange(preferences);
        _dbContext.VocabCustomColumns.Remove(column);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task UpdateBoardAsync(VocabBoard board, CancellationToken cancellationToken = default)
    {
        _dbContext.Boards.Update(board);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdatePageAsync(VocabPage page, CancellationToken cancellationToken = default)
    {
        _dbContext.Pages.Update(page);
    }

    public async Task UpdateWordAsync(VocabWord word, IReadOnlyList<VocabCustomValue>? customValues = null, CancellationToken cancellationToken = default)
    {
        _dbContext.Words.Update(word);
        if (customValues is not null)
        {
            var existing = await _dbContext.VocabCustomValues.Where(value => value.WordId == word.Id).ToListAsync(cancellationToken);
            _dbContext.VocabCustomValues.RemoveRange(existing);
            await _dbContext.VocabCustomValues.AddRangeAsync(customValues, cancellationToken);
        }
    }

    public async Task UpdateCustomValueAsync(Guid wordId, Guid columnId, VocabCustomValue? value, CancellationToken cancellationToken = default)
    {
        var existing = await _dbContext.VocabCustomValues
            .SingleOrDefaultAsync(item => item.WordId == wordId && item.ColumnId == columnId, cancellationToken);
        if (existing is not null)
        {
            _dbContext.VocabCustomValues.Remove(existing);
        }
        if (value is not null)
        {
            await _dbContext.VocabCustomValues.AddAsync(value, cancellationToken);
        }
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateFixedCellAsync(VocabWord word, string columnKey, CancellationToken cancellationToken = default)
    {
        var key = columnKey.ToLowerInvariant();
        var wordQuery = _dbContext.Words.Where(item => item.Id == word.Id);
        switch (key)
        {
            case "word":
                await wordQuery.ExecuteUpdateAsync(setters => setters.SetProperty(item => item.Word, word.Word).SetProperty(item => item.UpdatedAt, word.UpdatedAt), cancellationToken);
                break;
            case "meaningvn":
                await wordQuery.ExecuteUpdateAsync(setters => setters.SetProperty(item => item.MeaningVn, word.MeaningVn).SetProperty(item => item.UpdatedAt, word.UpdatedAt), cancellationToken);
                break;
            case "meaningen":
                await wordQuery.ExecuteUpdateAsync(setters => setters.SetProperty(item => item.MeaningEn, word.MeaningEn).SetProperty(item => item.UpdatedAt, word.UpdatedAt), cancellationToken);
                break;
            case "class":
                var wordClass = word.Class;
                await wordQuery.ExecuteUpdateAsync(setters => setters.SetProperty(item => item.Class, wordClass).SetProperty(item => item.UpdatedAt, word.UpdatedAt), cancellationToken);
                break;
            case "example":
                await wordQuery.ExecuteUpdateAsync(setters => setters.SetProperty(item => item.Example, word.Example).SetProperty(item => item.UpdatedAt, word.UpdatedAt), cancellationToken);
                break;
            case "thesaurus":
                await wordQuery.ExecuteUpdateAsync(setters => setters.SetProperty(item => item.Thesaurus, word.Thesaurus).SetProperty(item => item.UpdatedAt, word.UpdatedAt), cancellationToken);
                break;
            case "collocation":
                await wordQuery.ExecuteUpdateAsync(setters => setters.SetProperty(item => item.Collocation, word.Collocation).SetProperty(item => item.UpdatedAt, word.UpdatedAt), cancellationToken);
                break;
            case "note":
                await wordQuery.ExecuteUpdateAsync(setters => setters.SetProperty(item => item.Note, word.Note).SetProperty(item => item.UpdatedAt, word.UpdatedAt), cancellationToken);
                break;
            default:
                throw new InvalidOperationException("Unsupported fixed vocabulary cell.");
        }
    }

    public async Task SoftDeleteBoardAsync(VocabBoard board, CancellationToken cancellationToken = default)
    {
        board.SoftDelete();

        var pages = await _dbContext.Pages
            .Where(page => page.BoardId == board.Id && page.DeletedAt == null)
            .ToListAsync(cancellationToken);
        foreach (var page in pages)
        {
            page.SoftDelete();
        }

        var pageIds = pages.Select(page => page.Id).ToList();
        var words = await _dbContext.Words
            .Where(word => pageIds.Contains(word.PageId) && word.DeletedAt == null)
            .ToListAsync(cancellationToken);
        foreach (var word in words)
        {
            word.SoftDelete();
        }
    }

    public async Task SoftDeletePageAsync(VocabPage page, CancellationToken cancellationToken = default)
    {
        page.SoftDelete();

        var words = await _dbContext.Words
            .Where(word => word.PageId == page.Id && word.DeletedAt == null)
            .ToListAsync(cancellationToken);
        foreach (var word in words)
        {
            word.SoftDelete();
        }
    }

    public async Task SoftDeleteWordAsync(VocabWord word, CancellationToken cancellationToken = default)
    {
        word.SoftDelete();
        await Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
