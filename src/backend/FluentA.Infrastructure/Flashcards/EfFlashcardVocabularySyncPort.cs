using FluentA.Application.BoundedContexts.Flashcards;
using FluentA.Domain.BoundedContexts.Flashcards.Entities;
using FluentA.Domain.BoundedContexts.Vocabulary.Entities;
using FluentA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FluentA.Infrastructure.Flashcards;

public sealed class EfFlashcardVocabularySyncPort : IFlashcardVocabularySyncPort
{
    private readonly AppDbContext _dbContext;

    public EfFlashcardVocabularySyncPort(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<Guid>> ListActiveDeckIdsAsync(Guid boardId, Guid pageId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.FlashcardDecks
            .Where(deck => deck.BoardId == boardId
                && deck.PageId == pageId
                && deck.DeletedAt == null)
            .Select(deck => deck.Id)
            .ToListAsync(cancellationToken);
    }

    public async Task CreatePageDeckAsync(Guid userId, Guid boardId, Guid pageId, string boardName, string pageName, CancellationToken cancellationToken = default)
    {
        await _dbContext.FlashcardDecks.AddAsync(
            FlashcardDeck.CreatePageDeck(userId, boardId, pageId, boardName, pageName),
            cancellationToken);
    }

    public async Task RenamePageDeckAsync(Guid pageId, string boardName, string pageName, CancellationToken cancellationToken = default)
    {
        var pageDeck = await _dbContext.FlashcardDecks
            .FirstOrDefaultAsync(deck => deck.PageId == pageId && deck.DeletedAt == null, cancellationToken);
        pageDeck?.Rename($"{boardName} - {pageName}");
    }

    public async Task UpsertCardsForWordAsync(VocabWord word, CancellationToken cancellationToken = default)
    {
        var cards = await _dbContext.FlashcardCards
            .Where(card => card.WordId == word.Id)
            .ToListAsync(cancellationToken);

        if (cards.Count == 0)
        {
            var deckId = await _dbContext.FlashcardDecks
                .Where(deck => deck.PageId == word.PageId && deck.DeletedAt == null)
                .Select(deck => (Guid?)deck.Id)
                .SingleOrDefaultAsync(cancellationToken);

            if (deckId is null)
            {
                throw new InvalidOperationException("An active word requires exactly one synchronized page deck.");
            }

            await _dbContext.FlashcardCards.AddAsync(FlashcardCard.Create(deckId.Value, word), cancellationToken);
            return;
        }

        if (cards.Count != 1)
        {
            throw new InvalidOperationException("An active word must have exactly one synchronized page-deck card.");
        }

        cards[0].SyncFromWord(word);
    }

    public async Task RemoveCardsForWordsAsync(IEnumerable<Guid> wordIds, CancellationToken cancellationToken = default)
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

    public async Task SoftDeleteDecksForBoardAsync(Guid boardId, CancellationToken cancellationToken = default)
    {
        var decks = await _dbContext.FlashcardDecks
            .Where(deck => deck.BoardId == boardId && deck.DeletedAt == null)
            .ToListAsync(cancellationToken);
        foreach (var deck in decks)
        {
            deck.SoftDelete();
        }
    }

    public async Task SoftDeleteDeckForPageAsync(Guid pageId, CancellationToken cancellationToken = default)
    {
        var pageDeck = await _dbContext.FlashcardDecks
            .FirstOrDefaultAsync(deck => deck.PageId == pageId && deck.DeletedAt == null, cancellationToken);
        pageDeck?.SoftDelete();
    }
}
