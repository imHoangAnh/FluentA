using System.Data;
using System.Text.Json;
using FluentA.Application.BoundedContexts.Pronunciation.DTOs;
using FluentA.Application.BoundedContexts.Practice.DTOs;
using FluentA.Application.BoundedContexts.Review;
using FluentA.Application.BoundedContexts.Review.DTOs;
using FluentA.Domain.BoundedContexts.Review;
using FluentA.Domain.BoundedContexts.Review.Entities;
using FluentA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FluentA.Infrastructure.Persistence.Repositories.Review;

public sealed class EfReviewRepository : IReviewRepository
{
    private readonly AppDbContext _dbContext;
    private readonly EfReviewDashboardQueries _dashboardQueries;

    public EfReviewRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
        _dashboardQueries = new EfReviewDashboardQueries(dbContext);
    }

    public Task<AddPracticeWordsToReviewDto?> AddPracticeWordsToReviewAsync(
        Guid userId,
        Guid pageId,
        Guid wordId,
        TimeZoneInfo timeZone,
        DateTime utcNow,
        CancellationToken cancellationToken = default) =>
        AddPracticeWordsToReviewAsync(
            userId,
            pageId,
            wordId,
            timeZone,
            utcNow,
            initialLevel: 0,
            cancellationToken: cancellationToken);

    public async Task<AddPracticeWordsToReviewDto?> AddPracticeWordsToReviewAsync(
        Guid userId,
        Guid pageId,
        Guid wordId,
        TimeZoneInfo timeZone,
        DateTime utcNow,
        int initialLevel,
        CancellationToken cancellationToken = default)
    {
        var intervalDays = FluentAsrsScheduler.IntervalDaysForLevel(initialLevel);

        var pageWord = await (
            from word in _dbContext.Words
            join pageEntity in _dbContext.Pages on word.PageId equals pageEntity.Id
            join board in _dbContext.Boards on pageEntity.BoardId equals board.Id
            where pageEntity.Id == pageId
                && word.Id == wordId
                && board.UserId == userId
                && word.DeletedAt == null
                && pageEntity.DeletedAt == null
                && board.DeletedAt == null
            select new
            {
                pageEntity.Id,
                WordId = word.Id,
            })
            .SingleOrDefaultAsync(cancellationToken);

        if (pageWord is null)
        {
            return null;
        }

        var nextReviewDate = ReviewTime.NextReviewDate(utcNow, intervalDays, timeZone);
        var existingState = await _dbContext.WordReviewStates
            .SingleOrDefaultAsync(
                state => state.UserId == userId
                    && state.WordId == pageWord.WordId
                    && state.DeletedAt == null,
                cancellationToken);

        if (existingState is not null)
        {
            if (existingState.Status == WordReviewStatus.Active)
            {
                return new AddPracticeWordsToReviewDto(pageWord.Id, pageWord.WordId, "alreadyInReview", existingState.NextReviewDate);
            }

            existingState.ReactivateAtLevel(initialLevel, nextReviewDate);
            await _dbContext.SaveChangesAsync(cancellationToken);
            return new AddPracticeWordsToReviewDto(pageWord.Id, pageWord.WordId, "added", nextReviewDate);
        }

        var state = WordReviewState.CreateAtLevel(userId, pageWord.WordId, initialLevel, nextReviewDate);

        await _dbContext.WordReviewStates.AddAsync(state, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return new AddPracticeWordsToReviewDto(pageWord.Id, pageWord.WordId, "added", nextReviewDate);
    }

    public async Task<ReviewSessionDto> CreateReviewSessionAsync(
        Guid userId,
        TimeZoneInfo timeZone,
        DateTime utcNow,
        CancellationToken cancellationToken = default)
    {
        var localToday = ReviewTime.LocalDate(utcNow, timeZone);
        var activeSessions = await _dbContext.ReviewSessions
            .Where(session => session.UserId == userId
                && session.Status == ReviewSessionStatus.Active
                && session.DeletedAt == null)
            .ToListAsync(cancellationToken);
        foreach (var activeSession in activeSessions)
        {
            activeSession.Abandon(utcNow);
        }

        var dueWords = await (
            from state in _dbContext.WordReviewStates
            join word in _dbContext.Words on state.WordId equals word.Id
            join page in _dbContext.Pages on word.PageId equals page.Id
            join board in _dbContext.Boards on page.BoardId equals board.Id
            where state.UserId == userId
                && board.UserId == userId
                && state.DeletedAt == null
                && state.Status == WordReviewStatus.Active
                && word.DeletedAt == null
                && page.DeletedAt == null
                && board.DeletedAt == null
                && state.NextReviewDate <= localToday
            select new
            {
                WordId = word.Id,
                Language = board.Language,
                state.NextReviewDate,
                Word = word.Word,
                Meaning = word.Meaning,
                IpaPronunciation = word.IpaPronunciation,
                Type = word.Type,
                Context = word.Context,
                Example = word.Example,
                Synonyms = word.Synonyms,
                Antonyms = word.Antonyms,
                WordCreatedAt = word.CreatedAt,
            })
            .OrderBy(item => item.NextReviewDate)
            .ThenBy(item => item.WordCreatedAt)
            .ThenBy(item => item.WordId)
            .ToListAsync(cancellationToken);

        var session = ReviewSession.CreateActive(userId, timeZone.Id, localToday, utcNow);
        var items = dueWords
            .Select((item, position) => ReviewSessionItem.Create(
                session.Id,
                item.WordId,
                position,
                PickRandomReviewMode(),
                item.Language,
                item.Word,
                item.Meaning,
                item.IpaPronunciation,
                item.Type.ToString(),
                item.Context,
                item.Example,
                item.Synonyms,
                item.Antonyms))
            .ToArray();

        if (items.Length == 0)
        {
            session.Complete(utcNow);
        }

        _dbContext.ReviewSessions.Add(session);
        _dbContext.ReviewSessionItems.AddRange(items);
        // One SaveChanges keeps prior-session abandonment and the new persisted queue together.
        await _dbContext.SaveChangesAsync(cancellationToken);

        return await BuildSessionDtoAsync(session, items, cancellationToken);
    }

    public async Task<ReviewDashboardDto> GetDashboardAsync(
        Guid userId,
        TimeZoneInfo timeZone,
        DateTime utcNow,
        CancellationToken cancellationToken = default)
    {
        var localToday = ReviewTime.LocalDate(utcNow, timeZone);
        var dueCount = await _dashboardQueries
            .QueryActiveReviewStates(userId)
            .CountAsync(state => state.NextReviewDate <= localToday, cancellationToken);

        return new ReviewDashboardDto(localToday, dueCount);
    }

    public async Task<ReviewSessionDto?> GetSessionAsync(
        Guid userId,
        Guid sessionId,
        CancellationToken cancellationToken = default)
    {
        var session = await _dbContext.ReviewSessions
            .SingleOrDefaultAsync(
                item => item.Id == sessionId
                    && item.UserId == userId
                    && item.DeletedAt == null,
                cancellationToken);
        if (session is null)
        {
            return null;
        }

        var items = await _dbContext.ReviewSessionItems
            .Where(item => item.ReviewSessionId == sessionId && item.DeletedAt == null)
            .OrderBy(item => item.Position)
            .ToListAsync(cancellationToken);
        return await BuildSessionDtoAsync(session, items, cancellationToken);
    }

    public async Task<ReviewAnswerTargetDto?> GetAnswerTargetAsync(
        Guid userId,
        Guid sessionId,
        Guid itemId,
        CancellationToken cancellationToken = default)
    {
        return await (
            from session in _dbContext.ReviewSessions.AsNoTracking()
            join item in _dbContext.ReviewSessionItems.AsNoTracking() on session.Id equals item.ReviewSessionId
            where session.Id == sessionId
                && session.UserId == userId
                && session.Status == ReviewSessionStatus.Active
                && session.DeletedAt == null
                && item.Id == itemId
                && !item.IsReviewed
                && item.DeletedAt == null
            select new ReviewAnswerTargetDto(item.VocabWordId, item.Mode, item.WordSnapshot, item.LanguageSnapshot))
            .SingleOrDefaultAsync(cancellationToken);
    }

    public async Task<ReviewAnswerResultDto?> SubmitTypedAnswerAsync(
        Guid userId,
        Guid sessionId,
        Guid itemId,
        string answerText,
        bool correct,
        int timeSpentSeconds,
        DateTime utcNow,
        CancellationToken cancellationToken = default)
    {
        await using var transaction = await _dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        var session = await GetActiveSessionAsync(userId, sessionId, cancellationToken);
        if (session is null)
        {
            await transaction.RollbackAsync(cancellationToken);
            return null;
        }

        var item = await GetOpenItemAsync(sessionId, itemId, cancellationToken);
        if (item is null || item.Mode is not (ReviewMode.Dictation or ReviewMode.MeaningToWord))
        {
            await transaction.RollbackAsync(cancellationToken);
            return null;
        }

        var reviewState = await GetDueStateAsync(userId, session, item.VocabWordId, utcNow, cancellationToken);
        if (reviewState is null)
        {
            await transaction.RollbackAsync(cancellationToken);
            return null;
        }

        CompleteItem(session, item, reviewState, correct, utcNow);
        _dbContext.Set<ReviewAttempt>().Add(ReviewAttempt.CreateTyped(
            item.Id,
            item.Mode,
            answerText,
            correct,
            timeSpentSeconds,
            utcNow));
        await SaveFinalAttemptAsync(session, item, userId, timeSpentSeconds, utcNow, cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return await BuildAnswerResultAsync(session, item, attemptsUsed: 1, attemptsRemaining: 0, assessment: null, correct, cancellationToken);
    }

    public async Task<ReviewAnswerResultDto?> AddPronunciationAttemptAsync(
        Guid userId,
        Guid sessionId,
        Guid itemId,
        PronunciationAssessmentDto assessment,
        int timeSpentSeconds,
        DateTime utcNow,
        CancellationToken cancellationToken = default)
    {
        await using var transaction = await _dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        var session = await GetActiveSessionAsync(userId, sessionId, cancellationToken);
        if (session is null)
        {
            await transaction.RollbackAsync(cancellationToken);
            return null;
        }

        var item = await GetOpenItemAsync(sessionId, itemId, cancellationToken);
        if (item is null || item.Mode != ReviewMode.ListenAndRepeat)
        {
            await transaction.RollbackAsync(cancellationToken);
            return null;
        }

        var attempts = _dbContext.Set<ReviewAttempt>()
            .Where(attempt => attempt.ReviewSessionItemId == itemId && attempt.DeletedAt == null);
        var attemptsUsedBefore = await attempts.CountAsync(cancellationToken);
        if (attemptsUsedBefore >= 2)
        {
            await transaction.RollbackAsync(cancellationToken);
            return null;
        }

        var attemptNumber = attemptsUsedBefore + 1;
        var timeSpentBefore = await attempts.SumAsync(attempt => (int?)attempt.TimeSpentSeconds, cancellationToken) ?? 0;
        var feedbackJson = JsonSerializer.Serialize(assessment);
        _dbContext.Set<ReviewAttempt>().Add(ReviewAttempt.CreatePronunciation(
            item.Id,
            attemptNumber,
            assessment.Correct,
            assessment.AccuracyScore,
            assessment.CompletenessScore,
            assessment.FeedbackMode,
            feedbackJson,
            timeSpentSeconds,
            utcNow));

        var attemptsUsed = attemptNumber;
        if (assessment.Correct || attemptsUsed == 2)
        {
            var reviewState = await GetDueStateAsync(userId, session, item.VocabWordId, utcNow, cancellationToken);
            if (reviewState is null)
            {
                await transaction.RollbackAsync(cancellationToken);
                return null;
            }

            CompleteItem(
                session,
                item,
                reviewState,
                assessment.Correct,
                utcNow);
            await SaveFinalAttemptAsync(
                session,
                item,
                userId,
                timeSpentBefore + timeSpentSeconds,
                utcNow,
                cancellationToken);
        }
        else
        {
            // Save the successful provider assessment; provider failures never reach this method.
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);

        return await BuildAnswerResultAsync(
            session,
            item,
            attemptsUsed,
            Math.Max(0, 2 - attemptsUsed),
            assessment,
            assessment.Correct,
            cancellationToken);
    }

    private async Task<ReviewSession?> GetActiveSessionAsync(
        Guid userId,
        Guid sessionId,
        CancellationToken cancellationToken) =>
        await _dbContext.ReviewSessions.SingleOrDefaultAsync(
            session => session.Id == sessionId
                && session.UserId == userId
                && session.Status == ReviewSessionStatus.Active
                && session.DeletedAt == null,
            cancellationToken);

    private async Task<ReviewSessionItem?> GetOpenItemAsync(
        Guid sessionId,
        Guid itemId,
        CancellationToken cancellationToken) =>
        await _dbContext.ReviewSessionItems.SingleOrDefaultAsync(
            item => item.Id == itemId
                && item.ReviewSessionId == sessionId
                && !item.IsReviewed
                && item.DeletedAt == null,
            cancellationToken);

    private async Task<WordReviewState?> GetDueStateAsync(
        Guid userId,
        ReviewSession session,
        Guid wordId,
        DateTime utcNow,
        CancellationToken cancellationToken)
    {
        TimeZoneInfo timeZone;
        try
        {
            timeZone = TimeZoneInfo.FindSystemTimeZoneById(session.TimeZoneId);
        }
        catch (TimeZoneNotFoundException)
        {
            return null;
        }
        catch (InvalidTimeZoneException)
        {
            return null;
        }

        var localToday = ReviewTime.LocalDate(utcNow, timeZone);
        var state = await _dbContext.WordReviewStates.SingleOrDefaultAsync(
            item => item.UserId == userId
                && item.WordId == wordId
                && item.Status == WordReviewStatus.Active
                && item.DeletedAt == null,
            cancellationToken);
        return state is { } && state.NextReviewDate <= localToday ? state : null;
    }

    private static void CompleteItem(
        ReviewSession session,
        ReviewSessionItem item,
        WordReviewState reviewState,
        bool correct,
        DateTime utcNow)
    {
        var levelBefore = reviewState.Level;
        var nextReviewDateBefore = reviewState.NextReviewDate;
        var schedule = correct
            ? FluentAsrsScheduler.ApplyCorrect(reviewState.Level, reviewState.LapseCount)
            : FluentAsrsScheduler.ApplyWrong(reviewState.Level, reviewState.LapseCount);

        TimeZoneInfo timeZone;
        try
        {
            timeZone = TimeZoneInfo.FindSystemTimeZoneById(session.TimeZoneId);
        }
        catch (TimeZoneNotFoundException exception)
        {
            throw new InvalidOperationException("Review session timezone is no longer available.", exception);
        }
        catch (InvalidTimeZoneException exception)
        {
            throw new InvalidOperationException("Review session timezone is no longer available.", exception);
        }

        var nextReviewDate = ReviewTime.NextReviewDate(utcNow, schedule.IntervalDays, timeZone);
        var reviewedOn = ReviewTime.LocalDate(utcNow, timeZone);
        reviewState.ApplyResult(schedule.LevelAfter, nextReviewDate, schedule.LapseCountAfter, reviewedOn);
        item.Complete(
            correct ? FluentAsrsReviewResult.Correct : FluentAsrsReviewResult.Wrong,
            levelBefore,
            schedule.LevelAfter,
            nextReviewDateBefore,
            nextReviewDate,
            utcNow);
    }

    private async Task SaveFinalAttemptAsync(
        ReviewSession session,
        ReviewSessionItem item,
        Guid userId,
        int totalTimeSpentSeconds,
        DateTime reviewedAtUtc,
        CancellationToken cancellationToken)
    {
        var openItemCount = await _dbContext.ReviewSessionItems.CountAsync(
            candidate => candidate.ReviewSessionId == session.Id
                && !candidate.IsReviewed
                && candidate.DeletedAt == null,
            cancellationToken);
        if (openItemCount <= 1)
        {
            session.Complete(reviewedAtUtc);
        }

        var result = item.Result!.Value;
        await _dbContext.WordReviewHistories.AddAsync(
            WordReviewHistory.Create(userId, item.VocabWordId, session.Id, totalTimeSpentSeconds, reviewedAtUtc, result),
            cancellationToken);

        // One SaveChanges keeps the attempt, item result, history, word state, and session status atomic.
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task<ReviewSessionDto> BuildSessionDtoAsync(
        ReviewSession session,
        IReadOnlyCollection<ReviewSessionItem> items,
        CancellationToken cancellationToken)
    {
        var itemIds = items.Select(item => item.Id).ToArray();
        var attemptCounts = itemIds.Length == 0
            ? new Dictionary<Guid, int>()
            : await _dbContext.Set<ReviewAttempt>()
                .AsNoTracking()
                .Where(attempt => itemIds.Contains(attempt.ReviewSessionItemId)
                    && attempt.Mode == ReviewMode.ListenAndRepeat
                    && attempt.DeletedAt == null)
                .GroupBy(attempt => attempt.ReviewSessionItemId)
                .Select(group => new { ItemId = group.Key, Count = group.Count() })
                .ToDictionaryAsync(row => row.ItemId, row => row.Count, cancellationToken);

        var itemDtos = items
            .OrderBy(item => item.Position)
            .Select(item => ToSessionItemDto(item, attemptCounts.GetValueOrDefault(item.Id)))
            .ToArray();
        return new ReviewSessionDto(
            session.Id,
            session.SessionDate,
            session.StartedAt,
            session.CompletedAt,
            ToStatus(session.Status),
            itemDtos.Length,
            itemDtos.Count(item => item.IsReviewed),
            itemDtos.FirstOrDefault(item => !item.IsReviewed)?.Position,
            itemDtos);
    }

    private async Task<ReviewAnswerResultDto> BuildAnswerResultAsync(
        ReviewSession session,
        ReviewSessionItem item,
        int attemptsUsed,
        int attemptsRemaining,
        PronunciationAssessmentDto? assessment,
        bool correct,
        CancellationToken cancellationToken)
    {
        var sessionDto = await GetSessionAsync(session.UserId, session.Id, cancellationToken);
        var itemDto = sessionDto!.Items.Single(candidate => candidate.ItemId == item.Id);
        return new ReviewAnswerResultDto(
            item.Id,
            item.VocabWordId,
            correct,
            attemptsUsed,
            attemptsRemaining,
            itemDto.IsReviewed,
            itemDto.Result,
            itemDto.LevelBefore,
            itemDto.LevelAfter,
            itemDto.NextReviewDateBefore,
            itemDto.NextReviewDateAfter,
            sessionDto.CompletedWords,
            sessionDto.CurrentItemIndex,
            sessionDto.Status,
            assessment);
    }

    private static ReviewSessionItemDto ToSessionItemDto(ReviewSessionItem item, int pronunciationAttemptCount) =>
        new(
            item.Id,
            item.VocabWordId,
            item.Position,
            item.Mode,
            item.LanguageSnapshot,
            item.WordSnapshot,
            item.MeaningSnapshot,
            item.IpaPronunciationSnapshot,
            item.TypeSnapshot,
            item.ContextSnapshot,
            item.ExampleSnapshot,
            item.SynonymsSnapshot,
            item.AntonymsSnapshot,
            item.IsReviewed,
            item.Result.HasValue ? ToResult(item.Result.Value) : null,
            item.LevelBefore,
            item.LevelAfter,
            item.NextReviewDateBefore,
            item.NextReviewDateAfter,
            pronunciationAttemptCount);

    private static string ToStatus(ReviewSessionStatus status) => status switch
    {
        ReviewSessionStatus.Active => "active",
        ReviewSessionStatus.Completed => "completed",
        ReviewSessionStatus.Abandoned => "abandoned",
        _ => throw new ArgumentOutOfRangeException(nameof(status)),
    };

    private static string ToResult(FluentAsrsReviewResult result) => result switch
    {
        FluentAsrsReviewResult.Correct => "correct",
        FluentAsrsReviewResult.Wrong => "wrong",
        _ => throw new ArgumentOutOfRangeException(nameof(result)),
    };

    private static string PickRandomReviewMode() => Random.Shared.Next(ReviewMode.All.Count) switch
    {
        0 => ReviewMode.Dictation,
        1 => ReviewMode.MeaningToWord,
        _ => ReviewMode.ListenAndRepeat,
    };
}
