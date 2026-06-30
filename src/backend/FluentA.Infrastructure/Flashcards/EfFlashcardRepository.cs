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
            where deck.UserId == userId
                && deck.Type == DeckType.PageDeck
                && deck.DeletedAt == null
                && board.DeletedAt == null
            orderby board.SortOrder, board.Name, deck.Name
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

        var reviewStates = await LoadReviewStatesAsync(cards.Select(card => card.WordId), cancellationToken);
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
                card.Note,
                card.Interval,
                card.EaseFactor,
                card.Repetitions,
                card.NextReviewDate,
                card.State
            })
            .ToListAsync(cancellationToken);

        var reviewStates = await LoadReviewStatesAsync(cards.Select(card => card.WordId), cancellationToken);
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

    public async Task<PracticeSessionSummarySaveResult> CreatePracticeSessionSummaryAsync(
        Guid userId,
        Guid deckId,
        PracticeMode mode,
        int totalCards,
        int correctCards,
        int wrongCards,
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
            .Where(state => state.UserId == userId && wordIds.Contains(state.WordId))
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

        var (startUtc, endUtc) = ReviewTime.LocalDayBoundsUtc(utcNow, timeZone);
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

    public async Task<PracticeSettingsDto> GetPracticeSettingsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var settings = await _dbContext.PracticeSettings
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.UserId == userId, cancellationToken);

        return settings is null
            ? new PracticeSettingsDto(PracticeSettings.DefaultModeSequence)
            : new PracticeSettingsDto(settings.ModeSequence);
    }

    public async Task<PracticeSettingsDto> UpdatePracticeSettingsAsync(
        Guid userId,
        IReadOnlyList<string> modeSequence,
        CancellationToken cancellationToken = default)
    {
        var settings = await _dbContext.PracticeSettings.SingleOrDefaultAsync(item => item.UserId == userId, cancellationToken);
        if (settings is null)
        {
            settings = PracticeSettings.Create(userId, modeSequence);
            await _dbContext.PracticeSettings.AddAsync(settings, cancellationToken);
        }
        else
        {
            settings.Update(modeSequence);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return new PracticeSettingsDto(settings.ModeSequence);
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
        var pageDeckCards = await (
            from card in _dbContext.FlashcardCards.AsNoTracking()
            join deck in _dbContext.FlashcardDecks.AsNoTracking() on card.DeckId equals deck.Id
            join board in _dbContext.Boards.AsNoTracking() on deck.BoardId equals board.Id
            where deck.UserId == userId
                && deck.Type == DeckType.PageDeck
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

        var reviewStates = await (
            from state in _dbContext.WordReviewStates.AsNoTracking()
            join word in _dbContext.Words.AsNoTracking() on state.WordId equals word.Id
            join page in _dbContext.Pages.AsNoTracking() on word.PageId equals page.Id
            join board in _dbContext.Boards.AsNoTracking() on page.BoardId equals board.Id
            where board.UserId == userId
                && word.DeletedAt == null
                && page.DeletedAt == null
                && board.DeletedAt == null
                && (!boardId.HasValue || board.Id == boardId.Value)
            select new
            {
                state.WordId,
                state.Level,
                state.NextReviewDate
            })
            .ToListAsync(cancellationToken);

        var reviews = await (
            from review in _dbContext.WordReviewHistories.AsNoTracking()
            join word in _dbContext.Words.AsNoTracking() on review.WordId equals word.Id
            join page in _dbContext.Pages.AsNoTracking() on word.PageId equals page.Id
            join board in _dbContext.Boards.AsNoTracking() on page.BoardId equals board.Id
            where review.UserId == userId
                && word.DeletedAt == null
                && page.DeletedAt == null
                && board.DeletedAt == null
                && (!boardId.HasValue || board.Id == boardId.Value)
            select new
            {
                review.Result,
                review.ReviewedAt
            })
            .ToListAsync(cancellationToken);

        var overdue = reviewStates.Count(state => state.NextReviewDate < startUtc);
        var dueToday = reviewStates.Count(state => state.NextReviewDate >= startUtc && state.NextReviewDate < endUtc);
        var newCards = Math.Max(0, pageDeckCards.Count - reviewStates.Count);
        var retained = reviews.Count(review => review.Result == FluentAsrsReviewResult.Correct);
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
                var count = reviewStates.Count(state =>
                    TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(state.NextReviewDate, DateTimeKind.Utc), timeZone).Date == day);
                return new DashboardForecastPointDto(
                    DateOnly.FromDateTime(day).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                    count);
            })
            .ToList();

        return new FlashcardDashboardDto(
            boardId,
            boardName,
            pageDeckCards.Count,
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
            .SingleOrDefaultAsync(state => state.UserId == userId && state.WordId == owned.WordId, cancellationToken);
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

    private async Task<Dictionary<Guid, WordReviewState>> LoadReviewStatesAsync(IEnumerable<Guid> wordIds, CancellationToken cancellationToken)
    {
        var ids = wordIds.Distinct().ToList();
        if (ids.Count == 0)
        {
            return [];
        }

        return await _dbContext.WordReviewStates
            .AsNoTracking()
            .Where(state => ids.Contains(state.WordId))
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

    private static int Percentage(int count, int total) =>
        total == 0 ? 0 : (int)Math.Round((double)count / total * 100, MidpointRounding.AwayFromZero);
}
