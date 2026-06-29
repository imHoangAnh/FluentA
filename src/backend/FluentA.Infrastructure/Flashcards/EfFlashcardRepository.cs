using System.Globalization;
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

    public async Task<PracticeSessionSummarySaveResult> CreatePracticeSessionSummaryAsync(
        Guid userId,
        Guid deckId,
        PracticeMode mode,
        int totalCards,
        int correctCards,
        int wrongCards,
        CancellationToken cancellationToken = default)
    {
        var deck = await (
            from flashcardDeck in _dbContext.FlashcardDecks
            join board in _dbContext.Boards on flashcardDeck.BoardId equals board.Id
            where flashcardDeck.Id == deckId
                && flashcardDeck.UserId == userId
                && flashcardDeck.DeletedAt == null
                && board.DeletedAt == null
            select new
            {
                flashcardDeck.Id,
                flashcardDeck.UserId,
            })
            .SingleOrDefaultAsync(cancellationToken);

        if (deck is null)
        {
            return new PracticeSessionSummarySaveResult(PracticeSessionSummarySaveStatus.DeckNotFound, null);
        }

        var actualCardCount = await _dbContext.FlashcardCards
            .AsNoTracking()
            .CountAsync(card => card.DeckId == deck.Id && card.DeletedAt == null, cancellationToken);

        if (actualCardCount != totalCards || correctCards < 0 || wrongCards < 0 || correctCards + wrongCards != totalCards)
        {
            return new PracticeSessionSummarySaveResult(PracticeSessionSummarySaveStatus.InconsistentSummary, null);
        }

        var completedAt = DateTime.UtcNow;
        var summary = PracticeSessionSummary.Create(
            deck.UserId,
            deck.Id,
            mode,
            totalCards,
            correctCards,
            wrongCards,
            completedAt);
        await _dbContext.PracticeSessionSummaries.AddAsync(summary, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new PracticeSessionSummarySaveResult(
            PracticeSessionSummarySaveStatus.Success,
            new PracticeSessionSummaryDto(
                summary.Id,
                summary.UserId,
                summary.DeckId,
                summary.Mode switch
                {
                    PracticeMode.Dictation => "dictation",
                    PracticeMode.MeaningToWord => "meaningToWord",
                    PracticeMode.Pronunciation => "pronunciation",
                    _ => throw new InvalidOperationException("Unknown practice mode."),
                },
                summary.TotalCards,
                summary.CorrectCards,
                summary.WrongCards,
                summary.CompletedAt));
    }

    public async Task<ReviewSessionCreatedDto?> CreateReviewSessionAsync(
        Guid userId,
        Guid deckId,
        Guid sessionId,
        CancellationToken cancellationToken = default)
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
                flashcardDeck.Name,
                flashcardDeck.Type
            })
            .SingleOrDefaultAsync(cancellationToken);

        if (deck is null)
        {
            return null;
        }

        var totalCards = await _dbContext.FlashcardCards
            .AsNoTracking()
            .CountAsync(card => card.DeckId == deck.Id && card.DeletedAt == null, cancellationToken);

        return new ReviewSessionCreatedDto(
            sessionId,
            deck.Id,
            deck.Name,
            deck.Type.ToString(),
            totalCards);
    }

    public async Task<ReviewSessionSummaryDto?> GetReviewSessionSummaryAsync(
        Guid userId,
        Guid sessionId,
        CancellationToken cancellationToken = default)
    {
        var reviews = await (
            from review in _dbContext.CardReviews.AsNoTracking()
            join card in _dbContext.FlashcardCards.AsNoTracking() on review.CardId equals card.Id
            join deck in _dbContext.FlashcardDecks.AsNoTracking() on card.DeckId equals deck.Id
            join board in _dbContext.Boards.AsNoTracking() on deck.BoardId equals board.Id
            where review.SessionId == sessionId
                && deck.UserId == userId
                && deck.DeletedAt == null
                && card.DeletedAt == null
                && board.DeletedAt == null
            select new
            {
                review.Rating,
                review.TimeSpentSeconds
            })
            .ToListAsync(cancellationToken);

        if (reviews.Count == 0)
        {
            return null;
        }

        var easy = reviews.Count(review => review.Rating == ReviewRating.Easy);
        var good = reviews.Count(review => review.Rating == ReviewRating.Good);
        var hard = reviews.Count(review => review.Rating == ReviewRating.Hard);
        var again = reviews.Count(review => review.Rating == ReviewRating.Again);
        var total = reviews.Count;
        var averageTime = (int)Math.Round(reviews.Average(review => review.TimeSpentSeconds), MidpointRounding.AwayFromZero);

        return new ReviewSessionSummaryDto(
            sessionId,
            total,
            easy,
            good,
            hard,
            again,
            Percentage(easy, total),
            Percentage(good, total),
            Percentage(hard, total),
            Percentage(again, total),
            averageTime);
    }

    public async Task<ReviewSettingsDto> GetReviewSettingsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var settings = await _dbContext.ReviewSettings
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.UserId == userId, cancellationToken);

        return settings is null
            ? new ReviewSettingsDto(ReviewSettings.DefaultNewCardsPerDay, ReviewSettings.DefaultReviewCardsPerDay)
            : new ReviewSettingsDto(settings.NewCardsPerDay, settings.ReviewCardsPerDay);
    }

    public async Task<ReviewSettingsDto> UpdateReviewSettingsAsync(
        Guid userId,
        int newCardsPerDay,
        int reviewCardsPerDay,
        CancellationToken cancellationToken = default)
    {
        var settings = await _dbContext.ReviewSettings.SingleOrDefaultAsync(item => item.UserId == userId, cancellationToken);
        if (settings is null)
        {
            settings = ReviewSettings.Create(userId, newCardsPerDay, reviewCardsPerDay);
            await _dbContext.ReviewSettings.AddAsync(settings, cancellationToken);
        }
        else
        {
            settings.Update(newCardsPerDay, reviewCardsPerDay);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return new ReviewSettingsDto(settings.NewCardsPerDay, settings.ReviewCardsPerDay);
    }

    public async Task<DueDeckDto?> GetDueDeckAsync(
        Guid userId,
        Guid deckId,
        TimeZoneInfo timeZone,
        DateTime utcNow,
        CancellationToken cancellationToken = default)
    {
        var deck = await (
            from flashcardDeck in _dbContext.FlashcardDecks.AsNoTracking()
            join board in _dbContext.Boards.AsNoTracking() on flashcardDeck.BoardId equals board.Id
            where flashcardDeck.Id == deckId
                && flashcardDeck.UserId == userId
                && flashcardDeck.Type == DeckType.AllWords
                && flashcardDeck.DeletedAt == null
                && board.DeletedAt == null
            select new { flashcardDeck.Id, flashcardDeck.BoardId, flashcardDeck.Name, board.Language })
            .SingleOrDefaultAsync(cancellationToken);

        if (deck is null)
        {
            return null;
        }

        var settings = await GetReviewSettingsAsync(userId, cancellationToken);
        var (startUtc, endUtc) = ReviewTime.LocalDayBoundsUtc(utcNow, timeZone);

        var reviewedTodayIds = await (
            from review in _dbContext.CardReviews.AsNoTracking()
            join card in _dbContext.FlashcardCards.AsNoTracking() on review.CardId equals card.Id
            join reviewedDeck in _dbContext.FlashcardDecks.AsNoTracking() on card.DeckId equals reviewedDeck.Id
            where reviewedDeck.UserId == userId
                && reviewedDeck.Type == DeckType.AllWords
                && review.ReviewedAt >= startUtc
                && review.ReviewedAt < endUtc
            select review.CardId)
            .Distinct()
            .ToListAsync(cancellationToken);

        var previouslyReviewedIds = reviewedTodayIds.Count == 0
            ? []
            : await _dbContext.CardReviews
                .AsNoTracking()
                .Where(review => reviewedTodayIds.Contains(review.CardId) && review.ReviewedAt < startUtc)
                .Select(review => review.CardId)
                .Distinct()
                .ToListAsync(cancellationToken);

        var reviewConsumed = previouslyReviewedIds.Count;
        var newConsumed = reviewedTodayIds.Count - reviewConsumed;
        var remainingReview = Math.Max(0, settings.ReviewCardsPerDay - reviewConsumed);
        var remainingNew = Math.Max(0, settings.NewCardsPerDay - newConsumed);

        var cards = await _dbContext.FlashcardCards
            .AsNoTracking()
            .Where(card => card.DeckId == deck.Id)
            .Where(card => !reviewedTodayIds.Contains(card.Id))
            .Where(card =>
                (card.State == CardState.New && remainingNew > 0)
                || (card.State != CardState.New && card.NextReviewDate < endUtc && remainingReview > 0))
            .OrderBy(card => card.State == CardState.New ? 2 : card.NextReviewDate < startUtc ? 0 : 1)
            .ThenBy(card => card.NextReviewDate)
            .ThenBy(card => card.CreatedAt)
            .ToListAsync(cancellationToken);

        var overdue = cards.Where(card => card.State != CardState.New && card.NextReviewDate < startUtc).Take(remainingReview).ToList();
        var dueToday = cards
            .Where(card => card.State != CardState.New && card.NextReviewDate >= startUtc && card.NextReviewDate < endUtc)
            .Take(Math.Max(0, remainingReview - overdue.Count))
            .ToList();
        var newCards = cards.Where(card => card.State == CardState.New).Take(remainingNew).ToList();
        var selected = overdue.Concat(dueToday).Concat(newCards).Select(ToCardDto).ToList();

        return new DueDeckDto(
            deck.Id,
            deck.BoardId,
            deck.Name,
            deck.Language,
            settings,
            new DueAllowanceDto(settings.NewCardsPerDay, newConsumed, remainingNew),
            new DueAllowanceDto(settings.ReviewCardsPerDay, reviewConsumed, remainingReview),
            new DueCountsDto(overdue.Count, dueToday.Count, newCards.Count, selected.Count),
            selected);
    }

    public async Task<FlashcardDashboardDto?> GetDashboardAsync(
        Guid userId,
        Guid? boardId,
        TimeZoneInfo timeZone,
        DateTime utcNow,
        CancellationToken cancellationToken = default)
    {
        string? boardName = null;
        if (boardId.HasValue)
        {
            boardName = await _dbContext.Boards
                .AsNoTracking()
                .Where(board => board.Id == boardId.Value && board.UserId == userId && board.DeletedAt == null)
                .Select(board => board.Name)
                .SingleOrDefaultAsync(cancellationToken);

            if (boardName is null)
            {
                return null;
            }
        }

        var (startUtc, endUtc) = ReviewTime.LocalDayBoundsUtc(utcNow, timeZone);
        var allWordsCards = await (
            from card in _dbContext.FlashcardCards.AsNoTracking()
            join deck in _dbContext.FlashcardDecks.AsNoTracking() on card.DeckId equals deck.Id
            join board in _dbContext.Boards.AsNoTracking() on deck.BoardId equals board.Id
            where deck.UserId == userId
                && deck.Type == DeckType.AllWords
                && deck.DeletedAt == null
                && card.DeletedAt == null
                && board.DeletedAt == null
                && (!boardId.HasValue || deck.BoardId == boardId.Value)
            select new
            {
                card.Id,
                card.State,
                card.NextReviewDate
            })
            .ToListAsync(cancellationToken);

        var reviews = await (
            from review in _dbContext.CardReviews.AsNoTracking()
            join card in _dbContext.FlashcardCards.AsNoTracking() on review.CardId equals card.Id
            join deck in _dbContext.FlashcardDecks.AsNoTracking() on card.DeckId equals deck.Id
            join board in _dbContext.Boards.AsNoTracking() on deck.BoardId equals board.Id
            where deck.UserId == userId
                && deck.DeletedAt == null
                && card.DeletedAt == null
                && board.DeletedAt == null
                && (!boardId.HasValue || deck.BoardId == boardId.Value)
            select new
            {
                review.Rating,
                review.ReviewedAt
            })
            .ToListAsync(cancellationToken);

        var overdue = allWordsCards.Count(card => card.State != CardState.New && card.NextReviewDate < startUtc);
        var dueToday = allWordsCards.Count(card => card.State != CardState.New && card.NextReviewDate >= startUtc && card.NextReviewDate < endUtc);
        var newCards = allWordsCards.Count(card => card.State == CardState.New);
        var retained = reviews.Count(review => review.Rating is ReviewRating.Good or ReviewRating.Easy);
        var retentionRate = reviews.Count == 0 ? 0 : (int)Math.Round((double)retained / reviews.Count * 100, MidpointRounding.AwayFromZero);
        var localToday = TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utcNow, DateTimeKind.Utc), timeZone).Date;

        var reviewDates = reviews
            .Select(review => TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(review.ReviewedAt, DateTimeKind.Utc), timeZone).Date)
            .Distinct()
            .ToHashSet();
        var streakStart = reviewDates.Contains(localToday)
            ? localToday
            : reviewDates.Contains(localToday.AddDays(-1))
                ? localToday.AddDays(-1)
                : (DateTime?)null;
        var streak = 0;
        for (var day = streakStart; day.HasValue && reviewDates.Contains(day.Value); day = day.Value.AddDays(-1))
        {
            streak++;
        }

        var forecast = Enumerable.Range(0, 7)
            .Select(offset =>
            {
                var day = localToday.AddDays(offset);
                var count = allWordsCards.Count(card =>
                    card.State != CardState.New
                    && card.NextReviewDate.HasValue
                    && TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(card.NextReviewDate.Value, DateTimeKind.Utc), timeZone).Date == day);
                return new DashboardForecastPointDto(
                    DateOnly.FromDateTime(day).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                    count);
            })
            .ToList();

        return new FlashcardDashboardDto(
            boardId,
            boardName,
            allWordsCards.Count,
            reviews.Count,
            streak,
            retentionRate,
            overdue,
            dueToday,
            newCards,
            forecast);
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

    private static FlashcardCardDto ToCardDto(FlashcardCard card) =>
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
            card.Interval,
            card.EaseFactor,
            card.Repetitions,
            card.NextReviewDate,
            card.State.ToString().ToLowerInvariant());

    private static int Percentage(int count, int total) =>
        total == 0 ? 0 : (int)Math.Round((double)count / total * 100, MidpointRounding.AwayFromZero);
}
