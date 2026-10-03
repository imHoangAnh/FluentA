using FluentA.Application.BoundedContexts.Review;
using FluentA.Domain.BoundedContexts.Practice.Entities;
using FluentA.Domain.BoundedContexts.Review.Entities;
using FluentA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FluentA.Infrastructure.Persistence.Repositories.Review;

public sealed class EfVocabularyReviewCleanupPort : IVocabularyReviewCleanupPort
{
    private readonly AppDbContext _dbContext;

    public EfVocabularyReviewCleanupPort(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task PrepareForPermanentVocabularyDeletionAsync(
        IEnumerable<Guid> wordIds,
        DateTime deletedAtUtc,
        CancellationToken cancellationToken = default)
    {
        var ids = wordIds.Distinct().ToList();
        if (ids.Count == 0)
        {
            return;
        }

        var states = await _dbContext.WordReviewStates
            .Where(state => ids.Contains(state.WordId))
            .ToListAsync(cancellationToken);
        var reviewSessionIds = await _dbContext.ReviewSessionItems
            .Where(item => ids.Contains(item.VocabWordId))
            .Select(item => item.ReviewSessionId)
            .Distinct()
            .ToArrayAsync(cancellationToken);
        var activeReviewSessions = await _dbContext.ReviewSessions
            .Where(session => reviewSessionIds.Contains(session.Id)
                && session.Status == ReviewSessionStatus.Active
                && session.DeletedAt == null)
            .ToListAsync(cancellationToken);
        var practiceSessionIds = await _dbContext.Set<PracticeSessionItem>()
            .Where(item => ids.Contains(item.WordId))
            .Select(item => item.PracticeSessionId)
            .Distinct()
            .ToArrayAsync(cancellationToken);
        var activePracticeSessions = await _dbContext.Set<PracticeSession>()
            .Where(session => practiceSessionIds.Contains(session.Id)
                && session.Status == PracticeSessionStatus.Active
                && session.DeletedAt == null)
            .ToListAsync(cancellationToken);

        _dbContext.WordReviewStates.RemoveRange(states);
        foreach (var session in activeReviewSessions) session.Abandon(deletedAtUtc);
        foreach (var session in activePracticeSessions) session.Abandon(deletedAtUtc);
    }
}
