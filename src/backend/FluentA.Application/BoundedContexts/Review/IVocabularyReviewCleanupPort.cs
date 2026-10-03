namespace FluentA.Application.BoundedContexts.Review;

public interface IVocabularyReviewCleanupPort
{
    Task PrepareForPermanentVocabularyDeletionAsync(
        IEnumerable<Guid> wordIds,
        DateTime deletedAtUtc,
        CancellationToken cancellationToken = default);
}
