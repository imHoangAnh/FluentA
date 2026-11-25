using System.Data;
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
        DateTime utcNow,
        CancellationToken cancellationToken = default) =>
        AddPracticeWordsToReviewAsync(
            userId,
            pageId,
            wordId,
            utcNow,
            initialLevel: 0,
            cancellationToken: cancellationToken);

    public async Task<AddPracticeWordsToReviewDto?> AddPracticeWordsToReviewAsync(
        Guid userId,
        Guid pageId,
        Guid wordId,
        DateTime utcNow,
        int initialLevel,
        CancellationToken cancellationToken = default)
    {
        await using var transaction = _dbContext.Database.CurrentTransaction is null
            ? await _dbContext.Database.BeginTransactionAsync(cancellationToken) : null;
        var result = await StagePracticeWordEnrollmentAsync(userId, pageId, wordId, utcNow, initialLevel, cancellationToken);
        if (result is not null) await _dbContext.SaveChangesAsync(cancellationToken);
        if (transaction is not null) await transaction.CommitAsync(cancellationToken);
        return result;
    }

    public async Task<AddPracticeWordsToReviewDto?> StagePracticeWordEnrollmentAsync(
        Guid userId,
        Guid pageId,
        Guid wordId,
        DateTime utcNow,
        int initialLevel,
        CancellationToken cancellationToken = default)
    {
        var intervalDays = FluentAsrsScheduler.IntervalDaysForLevel(initialLevel);

        if (_dbContext.Database.CurrentTransaction is null)
            throw new InvalidOperationException("Practice Review enrollment must be staged inside a transaction.");
        // Different Practice sessions can contain the same word. Serialize
        // enrollment so an inactive state cannot overwrite a newly active one.
        await _dbContext.Database.ExecuteSqlInterpolatedAsync($"""
            SELECT 1 FROM vocab_words w
            JOIN vocab_pages p ON p.id = w.page_id
            JOIN vocab_boards b ON b.id = p.board_id
            WHERE w.id = {wordId} AND p.id = {pageId} AND b.user_id = {userId}
            FOR UPDATE OF w
            """, cancellationToken);

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

        var nextReviewDate = ReviewTime.NextReviewDate(utcNow, intervalDays);
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
            return new AddPracticeWordsToReviewDto(pageWord.Id, pageWord.WordId, "added", nextReviewDate);
        }

        var state = WordReviewState.CreateAtLevel(userId, pageWord.WordId, initialLevel, nextReviewDate);

        await _dbContext.WordReviewStates.AddAsync(state, cancellationToken);
        return new AddPracticeWordsToReviewDto(pageWord.Id, pageWord.WordId, "added", nextReviewDate);
    }

    public async Task<ReviewSessionDto> CreateReviewSessionAsync(
        Guid userId,
        DateTime utcNow,
        CancellationToken cancellationToken = default)
    {
        var utcToday = ReviewTime.UtcDate(utcNow);
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
                && state.NextReviewDate <= utcToday
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

        var session = ReviewSession.CreateActive(userId, utcToday, utcNow);
        var items = dueWords
            .Select((item, position) => ReviewSessionItem.Create(
                session.Id,
                item.WordId,
                position,
                ReviewMode.MeaningToWord,
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

        return BuildSessionDto(session, items);
    }

    public async Task<ReviewDashboardDto> GetDashboardAsync(
        Guid userId,
        DateTime utcNow,
        CancellationToken cancellationToken = default)
    {
        var utcToday = ReviewTime.UtcDate(utcNow);
        var dueCount = await _dashboardQueries
            .QueryActiveReviewStates(userId)
            .CountAsync(state => state.NextReviewDate <= utcToday, cancellationToken);

        return new ReviewDashboardDto(utcToday, dueCount);
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

        var openItemIds = items
            .Where(item => !item.IsReviewed)
            .Select(item => item.Id)
            .ToArray();
        if (openItemIds.Length > 0)
        {
            var availableOpenItemIds = await (
                from item in _dbContext.ReviewSessionItems.AsNoTracking()
                join word in _dbContext.Words.AsNoTracking() on item.VocabWordId equals word.Id
                join page in _dbContext.Pages.AsNoTracking() on word.PageId equals page.Id
                join board in _dbContext.Boards.AsNoTracking() on page.BoardId equals board.Id
                where openItemIds.Contains(item.Id)
                    && item.ReviewSessionId == sessionId
                    && item.DeletedAt == null
                    && word.DeletedAt == null
                    && page.DeletedAt == null
                    && board.UserId == session.UserId
                    && board.DeletedAt == null
                select item.Id)
                .ToHashSetAsync(cancellationToken);

            items = items
                .Where(item => item.IsReviewed || availableOpenItemIds.Contains(item.Id))
                .ToList();
        }

        return BuildSessionDto(session, items);
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
            join word in _dbContext.Words.AsNoTracking() on item.VocabWordId equals word.Id
            join page in _dbContext.Pages.AsNoTracking() on word.PageId equals page.Id
            join board in _dbContext.Boards.AsNoTracking() on page.BoardId equals board.Id
            where session.Id == sessionId
                && session.UserId == userId
                && session.Status == ReviewSessionStatus.Active
                && session.DeletedAt == null
                && item.Id == itemId
                && !item.IsReviewed
                && item.DeletedAt == null
                && word.DeletedAt == null
                && page.DeletedAt == null
                && board.UserId == userId
                && board.DeletedAt == null
            select new ReviewAnswerTargetDto(item.VocabWordId, ReviewMode.MeaningToWord, item.WordSnapshot, item.LanguageSnapshot))
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
        if (item is null)
        {
            await transaction.RollbackAsync(cancellationToken);
            return null;
        }

        var reviewState = await GetDueStateAsync(userId, item.VocabWordId, utcNow, cancellationToken);
        if (reviewState is null)
        {
            await transaction.RollbackAsync(cancellationToken);
            return null;
        }

        CompleteItem(item, reviewState, correct, utcNow);
        _dbContext.Set<ReviewAttempt>().Add(ReviewAttempt.CreateTyped(
            item.Id,
            ReviewMode.MeaningToWord,
            answerText,
            correct,
            timeSpentSeconds,
            utcNow));
        await SaveFinalAttemptAsync(session, item, userId, timeSpentSeconds, utcNow, cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return await BuildAnswerResultAsync(session, item, correct, cancellationToken);
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
        Guid wordId,
        DateTime utcNow,
        CancellationToken cancellationToken)
    {
        var utcToday = ReviewTime.UtcDate(utcNow);
        var state = await (
            from item in _dbContext.WordReviewStates
            join word in _dbContext.Words on item.WordId equals word.Id
            join page in _dbContext.Pages on word.PageId equals page.Id
            join board in _dbContext.Boards on page.BoardId equals board.Id
            where item.UserId == userId
                && item.WordId == wordId
                && item.Status == WordReviewStatus.Active
                && item.DeletedAt == null
                && word.DeletedAt == null
                && page.DeletedAt == null
                && board.UserId == userId
                && board.DeletedAt == null
            select item)
            .SingleOrDefaultAsync(cancellationToken);
        return state is { } && state.NextReviewDate <= utcToday ? state : null;
    }

    private static void CompleteItem(
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

        var nextReviewDate = ReviewTime.NextReviewDate(utcNow, schedule.IntervalDays);
        var reviewedOn = ReviewTime.UtcDate(utcNow);
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
        var openItemCount = await (
            from candidate in _dbContext.ReviewSessionItems
            join word in _dbContext.Words on candidate.VocabWordId equals word.Id
            join page in _dbContext.Pages on word.PageId equals page.Id
            join board in _dbContext.Boards on page.BoardId equals board.Id
            where candidate.ReviewSessionId == session.Id
                && !candidate.IsReviewed
                && candidate.DeletedAt == null
                && word.DeletedAt == null
                && page.DeletedAt == null
                && board.UserId == userId
                && board.DeletedAt == null
            select candidate.Id)
            .CountAsync(cancellationToken);
        if (openItemCount <= 1)
        {
            session.Complete(reviewedAtUtc);
        }

        var result = item.Result!.Value;
        await _dbContext.WordReviewHistories.AddAsync(
            WordReviewHistory.Create(userId, item.VocabWordId, session.Id, item.Id, totalTimeSpentSeconds, reviewedAtUtc, result),
            cancellationToken);

        // One SaveChanges keeps the attempt, item result, history, word state, and session status atomic.
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private static ReviewSessionDto BuildSessionDto(
        ReviewSession session,
        IReadOnlyCollection<ReviewSessionItem> items)
    {
        var itemDtos = items
            .OrderBy(item => item.Position)
            .Select(ToSessionItemDto)
            .ToArray();
        var currentItemIndex = Array.FindIndex(itemDtos, item => !item.IsReviewed);
        return new ReviewSessionDto(
            session.Id,
            session.SessionDate,
            session.StartedAt,
            session.CompletedAt,
            ToStatus(session.Status),
            itemDtos.Length,
            itemDtos.Count(item => item.IsReviewed),
            currentItemIndex >= 0 ? currentItemIndex : null,
            itemDtos);
    }

    private async Task<ReviewAnswerResultDto> BuildAnswerResultAsync(
        ReviewSession session,
        ReviewSessionItem item,
        bool correct,
        CancellationToken cancellationToken)
    {
        var sessionDto = await GetSessionAsync(session.UserId, session.Id, cancellationToken);
        var itemDto = sessionDto!.Items.Single(candidate => candidate.ItemId == item.Id);
        return new ReviewAnswerResultDto(
            item.Id,
            item.VocabWordId,
            correct,
            itemDto.IsReviewed,
            itemDto.Result,
            itemDto.LevelBefore,
            itemDto.LevelAfter,
            itemDto.NextReviewDateBefore,
            itemDto.NextReviewDateAfter,
            sessionDto.CompletedWords,
            sessionDto.CurrentItemIndex,
            sessionDto.Status);
    }

    private static ReviewSessionItemDto ToSessionItemDto(ReviewSessionItem item) =>
        new(
            item.Id,
            item.VocabWordId,
            item.Position,
            item.IsReviewed ? item.Mode : ReviewMode.MeaningToWord,
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
            item.NextReviewDateAfter);

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
}
