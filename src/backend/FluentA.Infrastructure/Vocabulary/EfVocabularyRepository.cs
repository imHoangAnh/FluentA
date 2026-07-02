using FluentA.Application.BoundedContexts.Vocabulary;
using FluentA.Domain.BoundedContexts.Flashcards.Entities;
using FluentA.Domain.BoundedContexts.Vocabulary.Entities;
using FluentA.Domain.BoundedContexts.Vocabulary.Events;
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

    public async Task<IReadOnlyList<Guid>> ListActiveDeckIdsAsync(Guid boardId, Guid pageId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.FlashcardDecks
            .Where(deck => deck.BoardId == boardId
                && deck.DeletedAt == null
                && deck.PageId == pageId)
            .Select(deck => deck.Id)
            .ToListAsync(cancellationToken);
    }

    public async Task AddBoardAsync(VocabBoard board, CancellationToken cancellationToken = default)
    {
        await _dbContext.Boards.AddAsync(board, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task AddPageWithDeckAsync(VocabPage page, FlashcardDeck deck, CancellationToken cancellationToken = default)
    {
        await _dbContext.Pages.AddAsync(page, cancellationToken);
        await _dbContext.FlashcardDecks.AddAsync(deck, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task AddWordAsync(VocabWord word, IReadOnlyList<VocabCustomValue>? customValues = null, CancellationToken cancellationToken = default)
    {
        await _dbContext.Words.AddAsync(word, cancellationToken);
        if (customValues is { Count: > 0 })
        {
            await _dbContext.VocabCustomValues.AddRangeAsync(customValues, cancellationToken);
        }
        await SynchronizeWordEventsAsync(word, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
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
        var board = await _dbContext.Boards.FirstAsync(board => board.Id == page.BoardId, cancellationToken);
        var pageDeck = await _dbContext.FlashcardDecks
            .FirstOrDefaultAsync(deck => deck.PageId == page.Id && deck.DeletedAt == null, cancellationToken);
        pageDeck?.Rename($"{board.Name} - {page.Name}");

        _dbContext.Pages.Update(page);
        await _dbContext.SaveChangesAsync(cancellationToken);
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
        await SynchronizeWordEventsAsync(word, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
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
        await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
        var key = columnKey.ToLowerInvariant();
        var wordQuery = _dbContext.Words.Where(item => item.Id == word.Id);
        var cardQuery = _dbContext.FlashcardCards.Where(card => card.WordId == word.Id);
        switch (key)
        {
            case "word":
                await wordQuery.ExecuteUpdateAsync(setters => setters.SetProperty(item => item.Word, word.Word).SetProperty(item => item.UpdatedAt, word.UpdatedAt), cancellationToken);
                await cardQuery.ExecuteUpdateAsync(setters => setters.SetProperty(card => card.Word, word.Word).SetProperty(card => card.UpdatedAt, word.UpdatedAt), cancellationToken);
                break;
            case "meaningvn":
                await wordQuery.ExecuteUpdateAsync(setters => setters.SetProperty(item => item.MeaningVn, word.MeaningVn).SetProperty(item => item.UpdatedAt, word.UpdatedAt), cancellationToken);
                await cardQuery.ExecuteUpdateAsync(setters => setters.SetProperty(card => card.MeaningVn, word.MeaningVn).SetProperty(card => card.UpdatedAt, word.UpdatedAt), cancellationToken);
                break;
            case "meaningen":
                await wordQuery.ExecuteUpdateAsync(setters => setters.SetProperty(item => item.MeaningEn, word.MeaningEn).SetProperty(item => item.UpdatedAt, word.UpdatedAt), cancellationToken);
                await cardQuery.ExecuteUpdateAsync(setters => setters.SetProperty(card => card.MeaningEn, word.MeaningEn).SetProperty(card => card.UpdatedAt, word.UpdatedAt), cancellationToken);
                break;
            case "class":
                var wordClass = word.Class;
                var cardClass = word.Class.ToString().ToLowerInvariant();
                await wordQuery.ExecuteUpdateAsync(setters => setters.SetProperty(item => item.Class, wordClass).SetProperty(item => item.UpdatedAt, word.UpdatedAt), cancellationToken);
                await cardQuery.ExecuteUpdateAsync(setters => setters.SetProperty(card => card.WordClass, cardClass).SetProperty(card => card.UpdatedAt, word.UpdatedAt), cancellationToken);
                break;
            case "example":
                await wordQuery.ExecuteUpdateAsync(setters => setters.SetProperty(item => item.Example, word.Example).SetProperty(item => item.UpdatedAt, word.UpdatedAt), cancellationToken);
                await cardQuery.ExecuteUpdateAsync(setters => setters.SetProperty(card => card.Example, word.Example).SetProperty(card => card.UpdatedAt, word.UpdatedAt), cancellationToken);
                break;
            case "thesaurus":
                await wordQuery.ExecuteUpdateAsync(setters => setters.SetProperty(item => item.Thesaurus, word.Thesaurus).SetProperty(item => item.UpdatedAt, word.UpdatedAt), cancellationToken);
                await cardQuery.ExecuteUpdateAsync(setters => setters.SetProperty(card => card.Thesaurus, word.Thesaurus).SetProperty(card => card.UpdatedAt, word.UpdatedAt), cancellationToken);
                break;
            case "collocation":
                await wordQuery.ExecuteUpdateAsync(setters => setters.SetProperty(item => item.Collocation, word.Collocation).SetProperty(item => item.UpdatedAt, word.UpdatedAt), cancellationToken);
                await cardQuery.ExecuteUpdateAsync(setters => setters.SetProperty(card => card.Collocation, word.Collocation).SetProperty(card => card.UpdatedAt, word.UpdatedAt), cancellationToken);
                break;
            case "note":
                await wordQuery.ExecuteUpdateAsync(setters => setters.SetProperty(item => item.Note, word.Note).SetProperty(item => item.UpdatedAt, word.UpdatedAt), cancellationToken);
                await cardQuery.ExecuteUpdateAsync(setters => setters.SetProperty(card => card.Note, word.Note).SetProperty(card => card.UpdatedAt, word.UpdatedAt), cancellationToken);
                break;
            default:
                throw new InvalidOperationException("Unsupported fixed vocabulary cell.");
        }
        await transaction.CommitAsync(cancellationToken);
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

        await RemoveCardsForWordsAsync(words.Select(word => word.Id), cancellationToken);
        await RemoveReviewStatesForWordsAsync(words.Select(word => word.Id), cancellationToken);

        var decks = await _dbContext.FlashcardDecks
            .Where(deck => deck.BoardId == board.Id && deck.DeletedAt == null)
            .ToListAsync(cancellationToken);
        foreach (var deck in decks)
        {
            deck.SoftDelete();
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task SoftDeletePageAsync(VocabPage page, CancellationToken cancellationToken = default)
    {
        page.SoftDelete();

        var pageDeck = await _dbContext.FlashcardDecks
            .FirstOrDefaultAsync(deck => deck.PageId == page.Id && deck.DeletedAt == null, cancellationToken);
        pageDeck?.SoftDelete();

        var words = await _dbContext.Words
            .Where(word => word.PageId == page.Id && word.DeletedAt == null)
            .ToListAsync(cancellationToken);
        foreach (var word in words)
        {
            word.SoftDelete();
        }

        await RemoveCardsForWordsAsync(words.Select(word => word.Id), cancellationToken);
        await RemoveReviewStatesForWordsAsync(words.Select(word => word.Id), cancellationToken);

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task SoftDeleteWordAsync(VocabWord word, CancellationToken cancellationToken = default)
    {
        word.SoftDelete();
        await SynchronizeWordEventsAsync(word, cancellationToken);
        await RemoveReviewStatesForWordsAsync([word.Id], cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task SynchronizeWordEventsAsync(VocabWord word, CancellationToken cancellationToken)
    {
        foreach (var domainEvent in word.DomainEvents)
        {
            switch (domainEvent)
            {
                case WordAddedEvent:
                    await AddCardsForWordAsync(word, cancellationToken);
                    break;
                case WordUpdatedEvent:
                    await UpdateCardsForWordAsync(word, cancellationToken);
                    break;
                case WordDeletedEvent:
                    await RemoveCardsForWordsAsync([word.Id], cancellationToken);
                    break;
            }
        }

        word.ClearDomainEvents();
    }

    private async Task AddCardsForWordAsync(VocabWord word, CancellationToken cancellationToken)
    {
        var boardId = await _dbContext.Pages
            .Where(page => page.Id == word.PageId && page.DeletedAt == null)
            .Select(page => page.BoardId)
            .SingleAsync(cancellationToken);

        var decks = await _dbContext.FlashcardDecks
            .Where(deck => deck.BoardId == boardId
                && deck.DeletedAt == null
                && deck.PageId == word.PageId)
            .ToListAsync(cancellationToken);

        if (decks.Count != 1)
        {
            throw new InvalidOperationException("An active word requires exactly one synchronized page deck.");
        }

        await _dbContext.FlashcardCards.AddRangeAsync(
            decks.Select(deck => FlashcardCard.Create(deck.Id, word)),
            cancellationToken);
    }

    private async Task UpdateCardsForWordAsync(VocabWord word, CancellationToken cancellationToken)
    {
        var cards = await _dbContext.FlashcardCards
            .Where(card => card.WordId == word.Id)
            .ToListAsync(cancellationToken);

        if (cards.Count == 0)
        {
            await AddCardsForWordAsync(word, cancellationToken);
            return;
        }

        if (cards.Count != 1)
        {
            throw new InvalidOperationException("An active word must have exactly one synchronized page-deck card.");
        }

        foreach (var card in cards)
        {
            card.SyncFromWord(word);
        }
    }

    private async Task RemoveCardsForWordsAsync(IEnumerable<Guid> wordIds, CancellationToken cancellationToken)
    {
        var ids = wordIds.Distinct().ToList();
        if (ids.Count == 0)
        {
            return;
        }

        var cards = await _dbContext.FlashcardCards
            .Where(card => ids.Contains(card.WordId))
            .ToListAsync(cancellationToken);
        _dbContext.FlashcardCards.RemoveRange(cards);
    }

    private async Task RemoveReviewStatesForWordsAsync(IEnumerable<Guid> wordIds, CancellationToken cancellationToken)
    {
        var ids = wordIds.Distinct().ToList();
        if (ids.Count == 0)
        {
            return;
        }

        var states = await _dbContext.WordReviewStates
            .Where(state => ids.Contains(state.WordId))
            .ToListAsync(cancellationToken);
        _dbContext.WordReviewStates.RemoveRange(states);
    }
}
