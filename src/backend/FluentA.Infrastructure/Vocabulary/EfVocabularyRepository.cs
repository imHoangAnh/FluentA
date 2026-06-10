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
            .OrderBy(board => board.SortOrder)
            .ThenBy(board => board.CreatedAt)
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

    public async Task<IReadOnlyList<Guid>> ListActiveDeckIdsAsync(Guid boardId, Guid pageId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.FlashcardDecks
            .Where(deck => deck.BoardId == boardId
                && deck.DeletedAt == null
                && (deck.Type == DeckType.AllWords || deck.PageId == pageId))
            .OrderBy(deck => deck.Type)
            .Select(deck => deck.Id)
            .ToListAsync(cancellationToken);
    }

    public async Task<int> NextBoardSortOrderAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var maxSortOrder = await _dbContext.Boards
            .Where(board => board.UserId == userId && board.DeletedAt == null)
            .Select(board => (int?)board.SortOrder)
            .MaxAsync(cancellationToken);

        return (maxSortOrder ?? -1) + 1;
    }

    public async Task<int> NextPageSortOrderAsync(Guid boardId, CancellationToken cancellationToken = default)
    {
        var maxSortOrder = await _dbContext.Pages
            .Where(page => page.BoardId == boardId && page.DeletedAt == null)
            .Select(page => (int?)page.SortOrder)
            .MaxAsync(cancellationToken);

        return (maxSortOrder ?? -1) + 1;
    }

    public async Task AddBoardWithDeckAsync(VocabBoard board, FlashcardDeck deck, CancellationToken cancellationToken = default)
    {
        await _dbContext.Boards.AddAsync(board, cancellationToken);
        await _dbContext.FlashcardDecks.AddAsync(deck, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task AddPageWithDeckAsync(VocabPage page, FlashcardDeck deck, CancellationToken cancellationToken = default)
    {
        await _dbContext.Pages.AddAsync(page, cancellationToken);
        await _dbContext.FlashcardDecks.AddAsync(deck, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task AddWordAsync(VocabWord word, CancellationToken cancellationToken = default)
    {
        await _dbContext.Words.AddAsync(word, cancellationToken);
        await SynchronizeWordEventsAsync(word, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateBoardAsync(VocabBoard board, CancellationToken cancellationToken = default)
    {
        var allWordsDeck = await _dbContext.FlashcardDecks
            .FirstOrDefaultAsync(deck => deck.BoardId == board.Id && deck.Type == DeckType.AllWords && deck.DeletedAt == null, cancellationToken);
        allWordsDeck?.Rename($"{board.Name} - All Words");

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

    public async Task UpdateWordAsync(VocabWord word, CancellationToken cancellationToken = default)
    {
        _dbContext.Words.Update(word);
        await SynchronizeWordEventsAsync(word, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
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

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task SoftDeleteWordAsync(VocabWord word, CancellationToken cancellationToken = default)
    {
        word.SoftDelete();
        await SynchronizeWordEventsAsync(word, cancellationToken);
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
                && (deck.Type == DeckType.AllWords || deck.PageId == word.PageId))
            .ToListAsync(cancellationToken);

        if (decks.Count != 2)
        {
            throw new InvalidOperationException("An active word requires exactly one Page Deck and one All Words Deck.");
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

        if (cards.Count != 2)
        {
            throw new InvalidOperationException("An active word must have exactly two synchronized cards.");
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
}
