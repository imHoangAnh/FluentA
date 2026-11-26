using FluentA.Domain.BoundedContexts.Review.Entities;
using FluentA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FluentA.Infrastructure.Persistence.Repositories.Review;

internal sealed class EfReviewDashboardQueries
{
    private readonly AppDbContext _dbContext;

    public EfReviewDashboardQueries(AppDbContext dbContext) => _dbContext = dbContext;

    public IQueryable<WordReviewState> QueryActiveReviewStates(Guid userId) =>
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
        select state;
}
