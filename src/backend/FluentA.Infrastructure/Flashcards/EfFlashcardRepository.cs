using FluentA.Application.BoundedContexts.Flashcards;
using FluentA.Application.BoundedContexts.Flashcards.DTOs;
using FluentA.Domain.BoundedContexts.Flashcards.Entities;
using FluentA.Domain.BoundedContexts.Review.Entities;
using FluentA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FluentA.Infrastructure.Flashcards;

public sealed class EfFlashcardRepository : IFlashcardRepository
{
    private readonly AppDbContext _dbContext;

    public EfFlashcardRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<FlashcardDeckDto>> ListDecksAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var decks = await (
            from deck in _dbContext.FlashcardDecks.AsNoTracking()
            join board in _dbContext.Boards.AsNoTracking() on deck.BoardId equals board.Id
            where deck.UserId == userId
                && deck.Type == DeckType.PageDeck
                && deck.DeletedAt == null
                && board.DeletedAt == null
            orderby board.CreatedAt, board.Name, deck.Name
            select new
            {
                deck.Id,
                deck.BoardId,
                BoardName = board.Name,
                BoardLanguage = board.Language,
                deck.PageId,
                deck.Name,
                deck.Type
            })
            .ToListAsync(cancellationToken);

        var deckIds = decks.Select(deck => deck.Id).ToList();
        var cards = await _dbContext.FlashcardCards
            .AsNoTracking()
            .Where(card => deckIds.Contains(card.DeckId))
            .OrderBy(card => card.Word)
            .ThenBy(card => card.CreatedAt)
            .Select(card => new
            {
                card.DeckId,
                card.Id,
                card.WordId,
                card.Word,
                card.WordClass,
                card.MeaningVn,
                card.MeaningEn,
                card.Example,
                card.Thesaurus,
                card.Collocation,
                card.Note
            })
            .ToListAsync(cancellationToken);

        var reviewStates = await LoadReviewStatesAsync(userId, cards.Select(card => card.WordId), cancellationToken);
        var cardsByDeck = cards
            .GroupBy(card => card.DeckId)
            .ToDictionary(
                group => group.Key,
                group => (IReadOnlyList<FlashcardCardDto>)group.Select(card => ToCardDto(
                    new ProjectedCard(
                        card.Id,
                        card.WordId,
                        card.Word,
                        card.WordClass,
                        card.MeaningVn,
                        card.MeaningEn,
                        card.Example,
                        card.Thesaurus,
                        card.Collocation,
                        card.Note),
                    reviewStates.GetValueOrDefault(card.WordId))).ToList());

        return decks
            .Select(deck => new FlashcardDeckDto(
                deck.Id,
                deck.BoardId,
                deck.BoardName,
                deck.BoardLanguage,
                deck.PageId,
                deck.Name,
                deck.Type.ToString(),
                cardsByDeck.GetValueOrDefault(deck.Id) ?? []))
            .ToList();
    }

    public async Task<DeckSessionDto?> GetDeckSessionAsync(Guid userId, Guid deckId, CancellationToken cancellationToken = default)
    {
        var deck = await (
            from flashcardDeck in _dbContext.FlashcardDecks.AsNoTracking()
            join board in _dbContext.Boards.AsNoTracking() on flashcardDeck.BoardId equals board.Id
            where flashcardDeck.Id == deckId
                && flashcardDeck.UserId == userId
                && flashcardDeck.Type == DeckType.PageDeck
                && flashcardDeck.DeletedAt == null
                && board.DeletedAt == null
            select new
            {
                flashcardDeck.Id,
                flashcardDeck.BoardId,
                flashcardDeck.Name,
                flashcardDeck.Type,
                board.Language
            })
            .SingleOrDefaultAsync(cancellationToken);

        if (deck is null)
        {
            return null;
        }

        var cards = await _dbContext.FlashcardCards
            .AsNoTracking()
            .Where(card => card.DeckId == deck.Id)
            .OrderBy(card => card.CreatedAt)
            .Select(card => new
            {
                card.Id,
                card.WordId,
                card.Word,
                card.WordClass,
                card.MeaningVn,
                card.MeaningEn,
                card.Example,
                card.Thesaurus,
                card.Collocation,
                card.Note
            })
            .ToListAsync(cancellationToken);

        var reviewStates = await LoadReviewStatesAsync(userId, cards.Select(card => card.WordId), cancellationToken);
        return new DeckSessionDto(
            deck.Id,
            deck.BoardId,
            deck.Name,
            deck.Type.ToString(),
            deck.Language,
            cards.Select(card => ToCardDto(
                new ProjectedCard(
                    card.Id,
                    card.WordId,
                    card.Word,
                    card.WordClass,
                    card.MeaningVn,
                    card.MeaningEn,
                    card.Example,
                    card.Thesaurus,
                    card.Collocation,
                    card.Note),
                reviewStates.GetValueOrDefault(card.WordId))).ToList());
    }

    private async Task<Dictionary<Guid, WordReviewState>> LoadReviewStatesAsync(
        Guid userId,
        IEnumerable<Guid> wordIds,
        CancellationToken cancellationToken)
    {
        var ids = wordIds.Distinct().ToList();
        if (ids.Count == 0)
        {
            return [];
        }

        return await _dbContext.WordReviewStates
            .AsNoTracking()
            .Where(state => state.UserId == userId && state.DeletedAt == null && ids.Contains(state.WordId))
            .ToDictionaryAsync(state => state.WordId, cancellationToken);
    }

    private static FlashcardCardDto ToCardDto(ProjectedCard card, WordReviewState? reviewState) =>
        new(
            card.Id,
            card.WordId,
            card.Word,
            card.WordClass,
            card.MeaningVn,
            card.MeaningEn,
            card.Example,
            card.Thesaurus,
            card.Collocation,
            card.Note,
            reviewState?.Level,
            reviewState?.NextReviewDate,
            reviewState?.LapseCount ?? 0);

    private sealed record ProjectedCard(
        Guid Id,
        Guid WordId,
        string Word,
        string WordClass,
        string MeaningVn,
        string MeaningEn,
        string Example,
        string? Thesaurus,
        string? Collocation,
        string? Note);
}
