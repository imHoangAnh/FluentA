using System.Globalization;
using FluentA.Application.BoundedContexts.Practice.DTOs;
using FluentA.Application.BoundedContexts.Review;
using FluentA.Application.BoundedContexts.Review.DTOs;
using FluentA.Domain.BoundedContexts.Flashcards.Entities;
using FluentA.Domain.BoundedContexts.Review;
using FluentA.Domain.BoundedContexts.Review.Entities;
using FluentA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FluentA.Infrastructure.Review;

public sealed class EfReviewRepository : IReviewRepository
{
    private readonly AppDbContext _dbContext;

    public EfReviewRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<AddPracticeWordsToReviewDto?> AddPracticeWordsToReviewAsync(
        Guid userId,
        Guid deckId,
        TimeZoneInfo timeZone,
        DateTime utcNow,
        CancellationToken cancellationToken = default)
    {
        var deck = await (
            from flashcardDeck in _dbContext.FlashcardDecks
            join board in _dbContext.Boards on flashcardDeck.BoardId equals board.Id
            where flashcardDeck.Id == deckId
                && flashcardDeck.UserId == userId
                && flashcardDeck.Type == DeckType.PageDeck
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
            return null;
        }

        var wordIds = await _dbContext.FlashcardCards
            .AsNoTracking()
            .Where(card => card.DeckId == deck.Id && card.DeletedAt == null)
            .Select(card => card.WordId)
            .Distinct()
            .ToListAsync(cancellationToken);

        if (wordIds.Count == 0)
        {
            return new AddPracticeWordsToReviewDto(deck.Id, 0, ReviewTime.NextReviewUtc(utcNow, intervalDays: 1, timeZone));
        }

        var existingWordIds = await _dbContext.WordReviewStates
            .Where(state => state.UserId == userId && state.DeletedAt == null && wordIds.Contains(state.WordId))
            .Select(state => state.WordId)
            .ToListAsync(cancellationToken);

        var missingWordIds = wordIds.Except(existingWordIds).ToList();
        var nextReviewDate = ReviewTime.NextReviewUtc(utcNow, intervalDays: 1, timeZone);

        foreach (var wordId in missingWordIds)
        {
            await _dbContext.WordReviewStates.AddAsync(
                WordReviewState.CreateLevelZero(userId, wordId, nextReviewDate),
                cancellationToken);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return new AddPracticeWordsToReviewDto(deck.Id, missingWordIds.Count, nextReviewDate);
    }

    public async Task<ReviewSessionCreatedDto?> CreateReviewSessionAsync(
        Guid userId,
        Guid boardId,
        string orderType,
        string mode,
        TimeZoneInfo timeZone,
        DateTime utcNow,
        Guid sessionId,
        CancellationToken cancellationToken = default)
    {
        var board = await _dbContext.Boards
            .AsNoTracking()
            .Where(item => item.Id == boardId && item.UserId == userId && item.DeletedAt == null)
            .Select(item => new
            {
                item.Id,
                item.Name,
                item.Language,
            })
            .SingleOrDefaultAsync(cancellationToken);

        if (board is null)
        {
            return null;
        }

        var (_, endUtc) = ReviewTime.LocalDayBoundsUtc(utcNow, timeZone);
        var settings = await _dbContext.ReviewSettings
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.UserId == userId, cancellationToken);
        var dailyLimit = settings?.DailyLimit ?? ReviewSettings.DefaultDailyLimit;

        var dueWords = await (
            from state in _dbContext.WordReviewStates
            join word in _dbContext.Words on state.WordId equals word.Id
            join page in _dbContext.Pages on word.PageId equals page.Id
            join deck in _dbContext.FlashcardDecks on page.Id equals deck.PageId
            join card in _dbContext.FlashcardCards on new { DeckId = deck.Id, WordId = word.Id } equals new { card.DeckId, card.WordId }
            where page.BoardId == boardId
                && state.UserId == userId
                && deck.UserId == userId
                && deck.Type == DeckType.PageDeck
                && state.DeletedAt == null
                && word.DeletedAt == null
                && page.DeletedAt == null
                && deck.DeletedAt == null
                && card.DeletedAt == null
                && state.NextReviewDate < endUtc
            select new
            {
                state,
                card.WordId,
                card.Word,
                card.WordClass,
                card.MeaningVn,
                card.MeaningEn,
                card.Example,
                card.Thesaurus,
                card.Collocation,
                card.Note,
                card.CreatedAt
            })
            .OrderBy(item => item.state.NextReviewDate)
            .ThenBy(item => item.CreatedAt)
            .ToListAsync(cancellationToken);

        var kept = dueWords.Take(dailyLimit).ToList();
        var overflow = dueWords.Skip(dailyLimit).ToList();
        if (overflow.Count > 0)
        {
            var tomorrow = ReviewTime.NextReviewUtc(utcNow, intervalDays: 1, timeZone);
            foreach (var item in overflow)
            {
                item.state.MoveDueDate(tomorrow);
            }

            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        if (orderType == "shuffle")
        {
            kept = kept.OrderBy(_ => Random.Shared.Next()).ToList();
        }

        var assignedModes = kept.Select(item => new ReviewSessionWordDto(
            item.WordId,
            item.Word,
            item.WordClass,
            item.MeaningVn,
            item.MeaningEn,
            item.Example,
            item.Thesaurus,
            item.Collocation,
            item.Note,
            mode == "random" ? PickRandomReviewMode() : mode)).ToList();

        return new ReviewSessionCreatedDto(
            sessionId,
            board.Id,
            board.Name,
            orderType,
            mode,
            assignedModes.Count,
            assignedModes);
    }

    public async Task<ReviewSessionSummaryDto?> GetReviewSessionSummaryAsync(
        Guid userId,
        Guid sessionId,
        CancellationToken cancellationToken = default)
    {
        var materialized = await _dbContext.WordReviewHistories
            .AsNoTracking()
            .Where(review => review.UserId == userId && review.SessionId == sessionId)
            .Where(review => review.DeletedAt == null)
            .Select(review => new
            {
                review.Result,
                review.TimeSpentSeconds
            })
            .ToListAsync(cancellationToken);

        if (materialized.Count == 0)
        {
            return null;
        }

        var correct = materialized.Count(review => review.Result == FluentAsrsReviewResult.Correct);
        var wrong = materialized.Count(review => review.Result == FluentAsrsReviewResult.Wrong);
        var total = materialized.Count;
        var averageTime = (int)Math.Round(materialized.Average(review => review.TimeSpentSeconds), MidpointRounding.AwayFromZero);

        return new ReviewSessionSummaryDto(
            sessionId,
            total,
            correct,
            wrong,
            Percentage(correct, total),
            Percentage(wrong, total),
            averageTime);
    }

    public async Task<ReviewSettingsDto> GetReviewSettingsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var settings = await _dbContext.ReviewSettings
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.UserId == userId, cancellationToken);

        return settings is null
            ? new ReviewSettingsDto(ReviewSettings.DefaultDailyLimit, true)
            : new ReviewSettingsDto(settings.DailyLimit, settings.RecapAfterAnswer);
    }

    public async Task<ReviewSettingsDto> UpdateReviewSettingsAsync(
        Guid userId,
        int dailyLimit,
        bool recapAfterAnswer,
        CancellationToken cancellationToken = default)
    {
        var settings = await _dbContext.ReviewSettings.SingleOrDefaultAsync(item => item.UserId == userId, cancellationToken);
        if (settings is null)
        {
            settings = ReviewSettings.Create(userId, dailyLimit, recapAfterAnswer);
            await _dbContext.ReviewSettings.AddAsync(settings, cancellationToken);
        }
        else
        {
            settings.Update(dailyLimit, recapAfterAnswer);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return new ReviewSettingsDto(settings.DailyLimit, settings.RecapAfterAnswer);
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
        var localToday = TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utcNow, DateTimeKind.Utc), timeZone).Date;
        var pageDeckCards = QueryActivePageDeckCards(userId, boardId);
        var reviewStates = QueryActiveReviewStates(userId, boardId);
        var reviews = QueryActiveReviewHistories(userId, boardId);

        var totalCards = await pageDeckCards.CountAsync(cancellationToken);
        var reviewStateCount = await reviewStates.CountAsync(cancellationToken);
        var overdue = await reviewStates.CountAsync(state => state.NextReviewDate < startUtc, cancellationToken);
        var dueToday = await reviewStates.CountAsync(
            state => state.NextReviewDate >= startUtc && state.NextReviewDate < endUtc,
            cancellationToken);
        var reviewSummary = await reviews
            .GroupBy(_ => 1)
            .Select(group => new
            {
                Total = group.Count(),
                Correct = group.Count(review => review.Result == FluentAsrsReviewResult.Correct)
            })
            .SingleOrDefaultAsync(cancellationToken);

        var totalReviews = reviewSummary?.Total ?? 0;
        var retained = reviewSummary?.Correct ?? 0;
        var retentionRate = totalReviews == 0
            ? 0
            : (int)Math.Round((double)retained / totalReviews * 100, MidpointRounding.AwayFromZero);
        var streak = await CountCurrentStreakAsync(reviews, localToday, timeZone, cancellationToken);

        var forecast = new List<DashboardForecastPointDto>(capacity: 7);
        for (var offset = 0; offset < 7; offset++)
        {
            var day = localToday.AddDays(offset);
            var (dayStartUtc, dayEndUtc) = ReviewTime.LocalDateBoundsUtc(day, timeZone);
            var count = await reviewStates.CountAsync(
                state => state.NextReviewDate >= dayStartUtc && state.NextReviewDate < dayEndUtc,
                cancellationToken);
            forecast.Add(new DashboardForecastPointDto(
                DateOnly.FromDateTime(day).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                count));
        }

        return new FlashcardDashboardDto(
            boardId,
            boardName,
            totalCards,
            totalReviews,
            streak,
            retentionRate,
            overdue,
            dueToday,
            Math.Max(0, totalCards - reviewStateCount),
            forecast);
    }

    public async Task<ReviewResultDto?> AddReviewAsync(
        Guid userId,
        Guid sessionId,
        Guid wordId,
        bool correct,
        int timeSpentSeconds,
        TimeZoneInfo timeZone,
        CancellationToken cancellationToken = default)
    {
        var owned = await (
            from word in _dbContext.Words
            join page in _dbContext.Pages on word.PageId equals page.Id
            join board in _dbContext.Boards on page.BoardId equals board.Id
            where word.Id == wordId
                && board.UserId == userId
                && word.DeletedAt == null
                && page.DeletedAt == null
                && board.DeletedAt == null
            select new
            {
                WordId = word.Id,
                BoardId = board.Id,
            })
            .SingleOrDefaultAsync(cancellationToken);

        if (owned is null)
        {
            return null;
        }

        var reviewedAt = DateTime.UtcNow;
        var (_, endUtc) = ReviewTime.LocalDayBoundsUtc(reviewedAt, timeZone);
        var reviewState = await _dbContext.WordReviewStates
            .SingleOrDefaultAsync(state => state.UserId == userId && state.WordId == owned.WordId && state.DeletedAt == null, cancellationToken);
        if (reviewState is null || reviewState.NextReviewDate >= endUtc)
        {
            return null;
        }

        var levelBefore = reviewState.Level;
        var schedule = correct
            ? FluentAsrsScheduler.ApplyCorrect(reviewState.Level, reviewState.LapseCount)
            : FluentAsrsScheduler.ApplyWrong(reviewState.Level, reviewState.LapseCount);
        var nextReviewDate = ReviewTime.NextReviewUtc(reviewedAt, schedule.IntervalDays, timeZone);
        reviewState.ApplyResult(schedule.LevelAfter, nextReviewDate, schedule.LapseCountAfter, reviewedAt);

        var review = WordReviewHistory.Create(
            userId,
            owned.WordId,
            sessionId,
            timeSpentSeconds,
            reviewedAt,
            correct ? FluentAsrsReviewResult.Correct : FluentAsrsReviewResult.Wrong,
            levelBefore,
            schedule.LevelAfter,
            nextReviewDate);
        await _dbContext.WordReviewHistories.AddAsync(review, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new ReviewResultDto(
            owned.WordId,
            review.Id,
            correct ? "correct" : "wrong",
            levelBefore,
            schedule.LevelAfter,
            schedule.LapseCountAfter,
            nextReviewDate);
    }

    private static string PickRandomReviewMode()
    {
        var value = Random.Shared.Next(0, 3);
        return value switch
        {
            0 => "dictation",
            1 => "pronunciation",
            _ => "meaningToWord",
        };
    }

    private IQueryable<FlashcardCard> QueryActivePageDeckCards(Guid userId, Guid? boardId) =>
        from card in _dbContext.FlashcardCards.AsNoTracking()
        join deck in _dbContext.FlashcardDecks.AsNoTracking() on card.DeckId equals deck.Id
        join board in _dbContext.Boards.AsNoTracking() on deck.BoardId equals board.Id
        where deck.UserId == userId
            && deck.Type == DeckType.PageDeck
            && deck.DeletedAt == null
            && card.DeletedAt == null
            && board.DeletedAt == null
            && (!boardId.HasValue || deck.BoardId == boardId.Value)
        select card;

    private IQueryable<WordReviewState> QueryActiveReviewStates(Guid userId, Guid? boardId) =>
        from state in _dbContext.WordReviewStates.AsNoTracking()
        join word in _dbContext.Words.AsNoTracking() on state.WordId equals word.Id
        join page in _dbContext.Pages.AsNoTracking() on word.PageId equals page.Id
        join board in _dbContext.Boards.AsNoTracking() on page.BoardId equals board.Id
        where board.UserId == userId
            && state.UserId == userId
            && state.DeletedAt == null
            && word.DeletedAt == null
            && page.DeletedAt == null
            && board.DeletedAt == null
            && (!boardId.HasValue || board.Id == boardId.Value)
        select state;

    private IQueryable<WordReviewHistory> QueryActiveReviewHistories(Guid userId, Guid? boardId) =>
        from review in _dbContext.WordReviewHistories.AsNoTracking()
        join word in _dbContext.Words.AsNoTracking() on review.WordId equals word.Id
        join page in _dbContext.Pages.AsNoTracking() on word.PageId equals page.Id
        join board in _dbContext.Boards.AsNoTracking() on page.BoardId equals board.Id
        where review.UserId == userId
            && review.DeletedAt == null
            && word.DeletedAt == null
            && page.DeletedAt == null
            && board.DeletedAt == null
            && (!boardId.HasValue || board.Id == boardId.Value)
        select review;

    private static async Task<int> CountCurrentStreakAsync(
        IQueryable<WordReviewHistory> reviews,
        DateTime localToday,
        TimeZoneInfo timeZone,
        CancellationToken cancellationToken)
    {
        var todayHasReview = await HasReviewOnLocalDateAsync(reviews, localToday, timeZone, cancellationToken);
        var cursor = todayHasReview
            ? localToday
            : await HasReviewOnLocalDateAsync(reviews, localToday.AddDays(-1), timeZone, cancellationToken)
                ? localToday.AddDays(-1)
                : (DateTime?)null;

        var streak = 0;
        while (cursor.HasValue)
        {
            streak++;
            var previous = cursor.Value.AddDays(-1);
            if (!await HasReviewOnLocalDateAsync(reviews, previous, timeZone, cancellationToken))
            {
                break;
            }

            cursor = previous;
        }

        return streak;
    }

    private static Task<bool> HasReviewOnLocalDateAsync(
        IQueryable<WordReviewHistory> reviews,
        DateTime localDate,
        TimeZoneInfo timeZone,
        CancellationToken cancellationToken)
    {
        var (startUtc, endUtc) = ReviewTime.LocalDateBoundsUtc(localDate, timeZone);
        return reviews.AnyAsync(review => review.ReviewedAt >= startUtc && review.ReviewedAt < endUtc, cancellationToken);
    }

    private static int Percentage(int count, int total) =>
        total == 0 ? 0 : (int)Math.Round((double)count / total * 100, MidpointRounding.AwayFromZero);
}
