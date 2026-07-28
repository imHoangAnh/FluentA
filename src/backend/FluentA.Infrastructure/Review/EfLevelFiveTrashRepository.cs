using FluentA.Application.BoundedContexts.Review;
using FluentA.Domain.BoundedContexts.Review;
using FluentA.Domain.BoundedContexts.Review.Entities;
using FluentA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FluentA.Infrastructure.Review;

public sealed class EfLevelFiveTrashRepository : ILevelFiveTrashRepository
{
    private readonly AppDbContext _dbContext;

    public EfLevelFiveTrashRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<LevelFiveTrashSource?> GetActiveAsync(Guid userId, Guid wordId, CancellationToken cancellationToken = default)
    {
        return await (
            from state in _dbContext.WordReviewStates
            join word in _dbContext.Words on state.WordId equals word.Id
            join page in _dbContext.Pages on word.PageId equals page.Id
            join board in _dbContext.Boards on page.BoardId equals board.Id
            where state.UserId == userId
                && state.WordId == wordId
                && state.DeletedAt == null
                && state.Status == WordReviewStatus.Active
                && state.Level == 5
                && word.DeletedAt == null
                && page.DeletedAt == null
                && board.DeletedAt == null
            select new LevelFiveTrashSource(state, word.Word, $"{board.Name} / {page.Name}"))
            .SingleOrDefaultAsync(cancellationToken);
    }

    public async Task<WordReviewState?> GetTrashedAsync(Guid userId, Guid wordId, CancellationToken cancellationToken = default)
    {
        return await (
            from state in _dbContext.WordReviewStates
            join word in _dbContext.Words on state.WordId equals word.Id
            join page in _dbContext.Pages on word.PageId equals page.Id
            join board in _dbContext.Boards on page.BoardId equals board.Id
            where state.UserId == userId
                && state.WordId == wordId
                && state.DeletedAt == null
                && state.Status == WordReviewStatus.Inactive
                && state.Level == 5
                && word.DeletedAt == null
                && page.DeletedAt == null
                && board.DeletedAt == null
            select state)
            .SingleOrDefaultAsync(cancellationToken);
    }

    public async Task DeleteProgressAsync(Guid userId, Guid wordId, CancellationToken cancellationToken = default)
    {
        var states = await _dbContext.WordReviewStates
            .Where(state => state.UserId == userId && state.WordId == wordId)
            .ToListAsync(cancellationToken);
        var histories = await _dbContext.WordReviewHistories
            .Where(history => history.UserId == userId && history.WordId == wordId)
            .ToListAsync(cancellationToken);

        _dbContext.WordReviewStates.RemoveRange(states);
        _dbContext.WordReviewHistories.RemoveRange(histories);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _dbContext.SaveChangesAsync(cancellationToken);
}
