namespace FluentA.Application.BoundedContexts.Flashcards;

public interface IFlashcardSyncNotifier
{
    Task WordSavedAsync(Guid userId, Guid wordId, Guid pageId, CancellationToken cancellationToken = default);
    Task DecksUpdatedAsync(Guid userId, Guid boardId, IReadOnlyList<Guid> deckIds, CancellationToken cancellationToken = default);
}

public sealed class NullFlashcardSyncNotifier : IFlashcardSyncNotifier
{
    public static NullFlashcardSyncNotifier Instance { get; } = new();

    private NullFlashcardSyncNotifier()
    {
    }

    public Task WordSavedAsync(Guid userId, Guid wordId, Guid pageId, CancellationToken cancellationToken = default)
        => Task.CompletedTask;

    public Task DecksUpdatedAsync(Guid userId, Guid boardId, IReadOnlyList<Guid> deckIds, CancellationToken cancellationToken = default)
        => Task.CompletedTask;
}
