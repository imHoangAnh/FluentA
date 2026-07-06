using FluentA.Application.BoundedContexts.Review;
using FluentA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FluentA.Infrastructure.Review;

public sealed class EfVocabularyReviewCleanupPort : IVocabularyReviewCleanupPort
{
    private readonly AppDbContext _dbContext;

    public EfVocabularyReviewCleanupPort(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task RemoveWordProgressAsync(IEnumerable<Guid> wordIds, CancellationToken cancellationToken = default)
    {
        var ids = wordIds.Distinct().ToList();
        if (ids.Count == 0)
        {
            return;
        }

        var states = await _dbContext.WordReviewStates
            .Where(state => ids.Contains(state.WordId))
            .ToListAsync(cancellationToken);
        var histories = await _dbContext.WordReviewHistories
            .Where(history => ids.Contains(history.WordId))
            .ToListAsync(cancellationToken);

        _dbContext.WordReviewStates.RemoveRange(states);
        _dbContext.WordReviewHistories.RemoveRange(histories);
    }
}
