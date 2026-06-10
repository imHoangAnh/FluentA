using FluentA.Application.BoundedContexts.Flashcards;
using FluentA.Application.BoundedContexts.Flashcards.DTOs;
using FluentA.Domain.BoundedContexts.Flashcards;
using FluentA.Domain.BoundedContexts.Flashcards.Entities;
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
            where deck.UserId == userId && deck.DeletedAt == null && board.DeletedAt == null
            orderby board.SortOrder, board.Name, deck.Type, deck.Name
            select new
            {
                deck.Id,
                deck.BoardId,
                BoardName = board.Name,
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
                card.Note,
                card.Interval,
                card.EaseFactor,
                card.Repetitions,
                card.NextReviewDate,
                card.State
            })
            .ToListAsync(cancellationToken);

        var cardsByDeck = cards
            .GroupBy(card => card.DeckId)
            .ToDictionary(
                group => group.Key,
                group => (IReadOnlyList<FlashcardCardDto>)group.Select(card => new FlashcardCardDto(
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
                    card.Interval,
                    card.EaseFactor,
                    card.Repetitions,
                    card.NextReviewDate,
                    card.State.ToString().ToLowerInvariant())).ToList());

        return decks
            .Select(deck => new FlashcardDeckDto(
                deck.Id,
                deck.BoardId,
                deck.BoardName,
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
                card.Note,
                card.Interval,
                card.EaseFactor,
                card.Repetitions,
                card.NextReviewDate,
                card.State
            })
            .ToListAsync(cancellationToken);

        return new DeckSessionDto(
            deck.Id,
            deck.BoardId,
            deck.Name,
            deck.Type.ToString(),
            deck.Language,
            cards.Select(card => new FlashcardCardDto(
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
                card.Interval,
                card.EaseFactor,
                card.Repetitions,
                card.NextReviewDate,
                card.State.ToString().ToLowerInvariant())).ToList());
    }

    public async Task<ReviewResultDto?> AddReviewAsync(
        Guid userId,
        Guid sessionId,
        Guid cardId,
        ReviewRating rating,
        int timeSpentSeconds,
        TimeZoneInfo timeZone,
        CancellationToken cancellationToken = default)
    {
        var owned = await (
            from flashcardCard in _dbContext.FlashcardCards
            join deck in _dbContext.FlashcardDecks on flashcardCard.DeckId equals deck.Id
            join board in _dbContext.Boards on deck.BoardId equals board.Id
            where flashcardCard.Id == cardId
                && deck.UserId == userId
                && deck.DeletedAt == null
                && board.DeletedAt == null
            select new { Card = flashcardCard, Deck = deck })
            .SingleOrDefaultAsync(cancellationToken);

        if (owned is null)
        {
            return null;
        }

        var reviewedAt = DateTime.UtcNow;
        if (owned.Deck.Type == DeckType.AllWords)
        {
            var schedule = Sm2Scheduler.Calculate(
                owned.Card.Interval,
                owned.Card.EaseFactor,
                owned.Card.Repetitions,
                rating);
            owned.Card.RecordReviewResult(
                schedule.Interval,
                schedule.EaseFactor,
                schedule.Repetitions,
                ReviewTime.NextReviewUtc(reviewedAt, schedule.Interval, timeZone),
                schedule.State);
        }

        var review = CardReview.Create(
            owned.Card.Id,
            sessionId,
            rating,
            timeSpentSeconds,
            reviewedAt,
            owned.Card.Interval,
            owned.Card.EaseFactor);
        await _dbContext.CardReviews.AddAsync(review, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new ReviewResultDto(
            owned.Card.Id,
            review.Id,
            owned.Deck.BoardId,
            owned.Deck.Id,
            owned.Deck.Type.ToString(),
            rating.ToString().ToLowerInvariant(),
            owned.Card.Interval,
            owned.Card.EaseFactor,
            owned.Card.Repetitions,
            owned.Card.NextReviewDate,
            owned.Card.State.ToString().ToLowerInvariant());
    }
}
