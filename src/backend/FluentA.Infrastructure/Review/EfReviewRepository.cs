using System.Globalization;
using FluentA.Application.BoundedContexts.Practice.DTOs;
using FluentA.Application.BoundedContexts.Review;
using FluentA.Application.BoundedContexts.Review.DTOs;
using FluentA.Domain.BoundedContexts.Review;
using FluentA.Domain.BoundedContexts.Review.Entities;
using FluentA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FluentA.Infrastructure.Review;

public sealed class EfReviewRepository : IReviewRepository
{
    private readonly AppDbContext _dbContext;
    private readonly EfReviewDashboardQueries _dashboardQueries;

    public EfReviewRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
        _dashboardQueries = new EfReviewDashboardQueries(dbContext);
    }

    public async Task<AddPracticeWordsToReviewDto?> AddPracticeWordsToReviewAsync(
        Guid userId,
        Guid pageId,
        Guid wordId,
        TimeZoneInfo timeZone,
        DateTime utcNow,
        CancellationToken cancellationToken = default)
    {
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

        var nextReviewDate = ReviewTime.NextReviewDate(utcNow, intervalDays: 1, timeZone);
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

            existingState.ReactivateLevelZero(nextReviewDate);
            await _dbContext.SaveChangesAsync(cancellationToken);
            return new AddPracticeWordsToReviewDto(pageWord.Id, pageWord.WordId, "added", nextReviewDate);
        }

        await _dbContext.WordReviewStates.AddAsync(
            WordReviewState.CreateLevelZero(userId, pageWord.WordId, nextReviewDate),
            cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return new AddPracticeWordsToReviewDto(pageWord.Id, pageWord.WordId, "added", nextReviewDate);
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

        var localToday = ReviewTime.LocalDate(utcNow, timeZone);
        var sessionDate = localToday;
        var activeSessions = await _dbContext.ReviewSessions
            .Where(session => session.UserId == userId
                && session.BoardId == boardId
                && session.Status == ReviewSessionStatus.Active
                && session.DeletedAt == null)
            .ToListAsync(cancellationToken);
        foreach (var activeSession in activeSessions)
        {
            activeSession.Replace();
        }

        var dueWords = await (
            from state in _dbContext.WordReviewStates
            join word in _dbContext.Words on state.WordId equals word.Id
            join page in _dbContext.Pages on word.PageId equals page.Id
            join boardEntity in _dbContext.Boards on page.BoardId equals boardEntity.Id
            where page.BoardId == boardId
                && state.UserId == userId
                && boardEntity.UserId == userId
                && state.DeletedAt == null
                && state.Status == WordReviewStatus.Active
                && word.DeletedAt == null
                && page.DeletedAt == null
                && boardEntity.DeletedAt == null
                && state.NextReviewDate <= localToday
            select new
            {
                state,
                WordId = word.Id,
                word.Word,
                WordClass = word.Class,
                word.IpaPronunciation,
                MeaningVn = word.MeaningVn,
                MeaningEn = word.Definition,
                word.Example,
                Thesaurus = word.Synonyms,
                Collocation = word.Antonyms,
                word.Note,
                word.CreatedAt
            })
            .OrderBy(item => item.state.NextReviewDate)
            .ThenBy(item => item.CreatedAt)
            .ToListAsync(cancellationToken);

        var kept = orderType == "shuffle"
            ? dueWords.OrderBy(_ => Random.Shared.Next()).ToList()
            : dueWords;

        var reviewSession = ReviewSession.CreateActive(
            userId,
            board.Id,
            orderType,
            sessionDate,
            utcNow);
        if (kept.Count == 0)
        {
            reviewSession.Complete(utcNow);
        }

        await _dbContext.ReviewSessions.AddAsync(reviewSession, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        foreach (var item in kept)
        {
            await _dbContext.ReviewSessionItems.AddAsync(
                ReviewSessionItem.Create(reviewSession.Id, item.WordId),
                cancellationToken);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        var assignedModes = kept.Select(item => new ReviewSessionWordDto(
            item.WordId,
            item.Word,
            item.WordClass.ToString(),
            item.IpaPronunciation,
            item.MeaningVn,
            item.MeaningEn,
            item.Example,
            item.Thesaurus,
            item.Collocation,
            item.Note,
            mode == "random" ? PickRandomReviewMode() : mode)).ToList();

        return new ReviewSessionCreatedDto(
            reviewSession.Id,
            board.Id,
            board.Name,
            orderType,
            mode,
            reviewSession.StartedAt,
            assignedModes.Count,
            assignedModes);
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

        var localToday = ReviewTime.LocalDate(utcNow, timeZone);
        var activeWords = _dashboardQueries.QueryActiveBoardWords(userId, boardId);
        var reviewStates = _dashboardQueries.QueryActiveReviewStates(userId, boardId);
        var reviews = _dashboardQueries.QueryActiveReviewHistories(userId, boardId);

        var totalCards = await activeWords.CountAsync(cancellationToken);
        var reviewStateCount = await reviewStates.CountAsync(cancellationToken);
        var overdue = await reviewStates.CountAsync(state => state.NextReviewDate < localToday, cancellationToken);
        var dueToday = await reviewStates.CountAsync(state => state.NextReviewDate == localToday, cancellationToken);
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
        var streak = await _dashboardQueries.CountCurrentStreakAsync(
            reviews,
            localToday.ToDateTime(TimeOnly.MinValue),
            timeZone,
            cancellationToken);

        var forecast = new List<DashboardForecastPointDto>(capacity: 7);
        for (var offset = 0; offset < 7; offset++)
        {
            var day = localToday.AddDays(offset);
            var count = await reviewStates.CountAsync(state => state.NextReviewDate == day, cancellationToken);
            forecast.Add(new DashboardForecastPointDto(
                day.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
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

        var reviewSession = await _dbContext.ReviewSessions
            .SingleOrDefaultAsync(
                session => session.Id == sessionId
                    && session.UserId == userId
                    && session.Status == ReviewSessionStatus.Active
                    && session.DeletedAt == null,
                cancellationToken);
        if (reviewSession is null)
        {
            return null;
        }

        var sessionItem = await _dbContext.ReviewSessionItems
            .SingleOrDefaultAsync(
                item => item.ReviewSessionId == sessionId
                    && item.VocabWordId == wordId
                    && !item.IsReviewed
                    && item.DeletedAt == null,
                cancellationToken);
        if (sessionItem is null)
        {
            return null;
        }

        var reviewedAt = DateTime.UtcNow;
        var reviewedOn = ReviewTime.LocalDate(reviewedAt, timeZone);
        var reviewState = await _dbContext.WordReviewStates
            .SingleOrDefaultAsync(
                state => state.UserId == userId
                    && state.WordId == owned.WordId
                    && state.DeletedAt == null
                    && state.Status == WordReviewStatus.Active,
                cancellationToken);
        if (reviewState is null || reviewState.NextReviewDate > reviewedOn)
        {
            return null;
        }

        var levelBefore = reviewState.Level;
        var schedule = correct
            ? FluentAsrsScheduler.ApplyCorrect(reviewState.Level, reviewState.LapseCount)
            : FluentAsrsScheduler.ApplyWrong(reviewState.Level, reviewState.LapseCount);
        var nextReviewDate = ReviewTime.NextReviewDate(reviewedAt, schedule.IntervalDays, timeZone);
        reviewState.ApplyResult(schedule.LevelAfter, nextReviewDate, schedule.LapseCountAfter, reviewedOn);

        var review = WordReviewHistory.Create(
            userId,
            owned.WordId,
            sessionId,
            timeSpentSeconds,
            reviewedAt,
            correct ? FluentAsrsReviewResult.Correct : FluentAsrsReviewResult.Wrong);
        await _dbContext.WordReviewHistories.AddAsync(review, cancellationToken);
        sessionItem.MarkReviewed();

        var remainingItems = await _dbContext.ReviewSessionItems
            .CountAsync(
                item => item.ReviewSessionId == sessionId
                    && !item.IsReviewed
                    && item.DeletedAt == null,
                cancellationToken);
        if (remainingItems == 0)
        {
            reviewSession.Complete(reviewedAt);
        }

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

    public async Task<IReadOnlyList<LevelFiveReviewItemDto>> ListLevelFiveWordsAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        return await (
            from state in _dbContext.WordReviewStates.AsNoTracking()
            join word in _dbContext.Words.AsNoTracking() on state.WordId equals word.Id
            join page in _dbContext.Pages.AsNoTracking() on word.PageId equals page.Id
            join board in _dbContext.Boards.AsNoTracking() on page.BoardId equals board.Id
            where state.UserId == userId
                && state.DeletedAt == null
                && state.Level == 5
                && state.Status == WordReviewStatus.Active
                && word.DeletedAt == null
                && page.DeletedAt == null
                && board.DeletedAt == null
            orderby state.Status == WordReviewStatus.Active descending, state.LastReviewedAt descending
            select new LevelFiveReviewItemDto(
                word.Id,
                word.Word,
                board.Id,
                board.Name,
                page.Id,
                page.Name,
                state.Status == WordReviewStatus.Active ? "active" : "inactive",
                state.LastReviewedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task<int> RemoveLevelFiveWordsAsync(
        Guid userId,
        IReadOnlyList<Guid> wordIds,
        CancellationToken cancellationToken = default)
    {
        var ids = wordIds.Distinct().ToList();
        var states = await _dbContext.WordReviewStates
            .Where(state =>
                state.UserId == userId
                && state.DeletedAt == null
                && state.Level == 5
                && state.Status == WordReviewStatus.Active
                && ids.Contains(state.WordId))
            .ToListAsync(cancellationToken);

        foreach (var state in states)
        {
            state.Deactivate();
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return states.Count;
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


}
