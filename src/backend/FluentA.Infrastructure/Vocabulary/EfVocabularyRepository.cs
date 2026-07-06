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

    public Task<VocabBoardPreference?> GetBoardPreferenceAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default)
    {
        return _dbContext.VocabBoardPreferences
            .FirstOrDefaultAsync(preference => preference.UserId == userId && preference.BoardId == boardId && preference.DeletedAt == null, cancellationToken);
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

    public async Task AddBoardAsync(VocabBoard board, CancellationToken cancellationToken = default)
    {
        await _dbContext.Boards.AddAsync(board, cancellationToken);
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

    public async Task UpdateFixedCellAsync(VocabWord word, string columnKey, CancellationToken cancellationToken = default)
    {
        var key = columnKey.Trim().ToLowerInvariant();
        var wordQuery = _dbContext.Words.Where(item => item.Id == word.Id);
        switch (key)
        {
            case "word":
                await wordQuery.ExecuteUpdateAsync(setters => setters.SetProperty(item => item.Word, word.Word).SetProperty(item => item.UpdatedAt, word.UpdatedAt), cancellationToken);
                break;
            case "meaningvn":
                await wordQuery.ExecuteUpdateAsync(setters => setters.SetProperty(item => item.MeaningVn, word.MeaningVn).SetProperty(item => item.UpdatedAt, word.UpdatedAt), cancellationToken);
                break;
            case "ipapronunciation":
                await wordQuery.ExecuteUpdateAsync(setters => setters.SetProperty(item => item.IpaPronunciation, word.IpaPronunciation).SetProperty(item => item.UpdatedAt, word.UpdatedAt), cancellationToken);
                break;
            case "definition":
                await wordQuery.ExecuteUpdateAsync(setters => setters.SetProperty(item => item.Definition, word.Definition).SetProperty(item => item.UpdatedAt, word.UpdatedAt), cancellationToken);
                break;
            case "class":
                var wordClass = word.Class;
                await wordQuery.ExecuteUpdateAsync(setters => setters.SetProperty(item => item.Class, wordClass).SetProperty(item => item.UpdatedAt, word.UpdatedAt), cancellationToken);
                break;
            case "example":
                await wordQuery.ExecuteUpdateAsync(setters => setters.SetProperty(item => item.Example, word.Example).SetProperty(item => item.UpdatedAt, word.UpdatedAt), cancellationToken);
                break;
            case "note":
                await wordQuery.ExecuteUpdateAsync(setters => setters.SetProperty(item => item.Note, word.Note).SetProperty(item => item.UpdatedAt, word.UpdatedAt), cancellationToken);
                break;
            case "synonyms":
                await wordQuery.ExecuteUpdateAsync(setters => setters.SetProperty(item => item.Synonyms, word.Synonyms).SetProperty(item => item.UpdatedAt, word.UpdatedAt), cancellationToken);
                break;
            case "antonyms":
                await wordQuery.ExecuteUpdateAsync(setters => setters.SetProperty(item => item.Antonyms, word.Antonyms).SetProperty(item => item.UpdatedAt, word.UpdatedAt), cancellationToken);
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

    public Task SoftDeleteWordAsync(VocabWord word, CancellationToken cancellationToken = default)
    {
        word.SoftDelete();
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }
}
