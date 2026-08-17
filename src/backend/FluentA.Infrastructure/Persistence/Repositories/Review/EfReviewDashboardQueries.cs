using FluentA.Domain.BoundedContexts.Review.Entities;
using FluentA.Application.BoundedContexts.Review;
using FluentA.Domain.BoundedContexts.Review;
using FluentA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FluentA.Infrastructure.Persistence.Repositories.Review;

internal sealed class EfReviewDashboardQueries
{
    private readonly AppDbContext _dbContext;
    public EfReviewDashboardQueries(AppDbContext dbContext) => _dbContext = dbContext;
    public IQueryable<Guid> QueryActiveBoardWords(Guid userId, Guid? boardId) =>
        from word in _dbContext.Words.AsNoTracking()
        join page in _dbContext.Pages.AsNoTracking() on word.PageId equals page.Id
        join board in _dbContext.Boards.AsNoTracking() on page.BoardId equals board.Id
        where board.UserId == userId
            && word.DeletedAt == null
            && page.DeletedAt == null
            && board.DeletedAt == null
            && (!boardId.HasValue || board.Id == boardId.Value)
        select word.Id;

    public IQueryable<WordReviewState> QueryActiveReviewStates(Guid userId, Guid? boardId) =>
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
            && (!boardId.HasValue || board.Id == boardId.Value)
        select state;

    public IQueryable<WordReviewHistory> QueryActiveReviewHistories(Guid userId, Guid? boardId) =>
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

    public async Task<int> CountCurrentStreakAsync(
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
}
