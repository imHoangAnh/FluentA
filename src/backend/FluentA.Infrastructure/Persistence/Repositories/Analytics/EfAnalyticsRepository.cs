using FluentA.Application.BoundedContexts.Analytics;
using FluentA.Application.BoundedContexts.Analytics.DTOs;
using FluentA.Domain.BoundedContexts.Practice.Entities;
using FluentA.Domain.BoundedContexts.Review.Entities;
using Microsoft.EntityFrameworkCore;

namespace FluentA.Infrastructure.Persistence.Repositories.Analytics;

public sealed class EfAnalyticsRepository : IAnalyticsRepository
{
    private const int RecentPronunciationAttemptLimit = 50;
    private readonly AppDbContext _dbContext;

    public EfAnalyticsRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<LearningAnalyticsSourceData> GetLearningAnalyticsSourceAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var activeReviewStates = await (
            from state in _dbContext.WordReviewStates.AsNoTracking()
            join word in _dbContext.Words.AsNoTracking() on state.WordId equals word.Id
            join page in _dbContext.Pages.AsNoTracking() on word.PageId equals page.Id
            join board in _dbContext.Boards.AsNoTracking() on page.BoardId equals board.Id
            where board.UserId == userId
                && state.UserId == userId
                && state.DeletedAt == null
                && state.Status == WordReviewStatus.Active
                && word.DeletedAt == null
                && page.DeletedAt == null
                && board.DeletedAt == null
            select new ActiveReviewStateSnapshot(state.Level, state.NextReviewDate))
            .ToArrayAsync(cancellationToken);

        var reviewHistories = await _dbContext.WordReviewHistories
            .AsNoTracking()
            .Where(history => history.UserId == userId && history.DeletedAt == null)
            .Select(history => new ReviewHistorySnapshot(history.ReviewedAt, history.Result))
            .ToArrayAsync(cancellationToken);

        var practiceTimestamps = await (
            from attempt in _dbContext.PracticeAttempts.AsNoTracking()
            join session in _dbContext.PracticeSessions.AsNoTracking() on attempt.PracticeSessionId equals session.Id
            where session.UserId == userId
                && session.DeletedAt == null
                && attempt.DeletedAt == null
            select attempt.CreatedAt)
            .ToArrayAsync(cancellationToken);

        var recentPronunciationAttempts = await (
            from attempt in _dbContext.PracticeAttempts.AsNoTracking()
            join item in _dbContext.PracticeSessionItems.AsNoTracking() on attempt.PracticeSessionItemId equals item.Id
            join session in _dbContext.PracticeSessions.AsNoTracking() on attempt.PracticeSessionId equals session.Id
            where session.UserId == userId
                && session.DeletedAt == null
                && item.DeletedAt == null
                && attempt.DeletedAt == null
                && attempt.Kind == PracticeAttemptKind.PronunciationAssessment
                && attempt.AssessmentJson != null
            orderby attempt.CreatedAt descending
            select new PronunciationAttemptSnapshot(item.Word, attempt.AssessmentJson!, attempt.CreatedAt))
            .Take(RecentPronunciationAttemptLimit)
            .ToArrayAsync(cancellationToken);

        return new LearningAnalyticsSourceData(
            activeReviewStates,
            reviewHistories,
            practiceTimestamps,
            recentPronunciationAttempts);
    }
}
