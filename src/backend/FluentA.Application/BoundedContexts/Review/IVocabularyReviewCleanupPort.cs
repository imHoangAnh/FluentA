namespace FluentA.Application.BoundedContexts.Review;

public interface IVocabularyReviewCleanupPort
{
    Task RemoveWordProgressAsync(IEnumerable<Guid> wordIds, CancellationToken cancellationToken = default);
}

public sealed class NullVocabularyReviewCleanupPort : IVocabularyReviewCleanupPort
{
    public static readonly NullVocabularyReviewCleanupPort Instance = new();

    private NullVocabularyReviewCleanupPort()
    {
    }

    public Task RemoveWordProgressAsync(IEnumerable<Guid> wordIds, CancellationToken cancellationToken = default) =>
        Task.CompletedTask;
}
