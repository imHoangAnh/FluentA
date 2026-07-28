using FluentA.Domain.BoundedContexts.Review.Entities;

namespace FluentA.Application.BoundedContexts.Review;

/// <summary>
/// Review-owned persistence boundary for the Level 5 Trash participant.
/// It deliberately never returns or deletes the Vocabulary source word.
/// </summary>
public interface ILevelFiveTrashRepository
{
    Task<LevelFiveTrashSource?> GetActiveAsync(Guid userId, Guid wordId, CancellationToken cancellationToken = default);
    Task<WordReviewState?> GetTrashedAsync(Guid userId, Guid wordId, CancellationToken cancellationToken = default);
    Task DeleteProgressAsync(Guid userId, Guid wordId, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}

public sealed record LevelFiveTrashSource(WordReviewState State, string Word, string Location);
