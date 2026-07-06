using FluentA.Domain.BoundedContexts.Vocabulary.Entities;

namespace FluentA.Application.BoundedContexts.Flashcards;

public interface IFlashcardVocabularySyncPort
{
    Task<IReadOnlyList<Guid>> ListActiveDeckIdsAsync(Guid boardId, Guid pageId, CancellationToken cancellationToken = default);
    Task CreatePageDeckAsync(Guid userId, Guid boardId, Guid pageId, string boardName, string pageName, CancellationToken cancellationToken = default);
    Task RenamePageDeckAsync(Guid pageId, string boardName, string pageName, CancellationToken cancellationToken = default);
    Task UpsertCardsForWordAsync(VocabWord word, CancellationToken cancellationToken = default);
    Task RemoveCardsForWordsAsync(IEnumerable<Guid> wordIds, CancellationToken cancellationToken = default);
    Task SoftDeleteDecksForBoardAsync(Guid boardId, CancellationToken cancellationToken = default);
    Task SoftDeleteDeckForPageAsync(Guid pageId, CancellationToken cancellationToken = default);
}

public sealed class NullFlashcardVocabularySyncPort : IFlashcardVocabularySyncPort
{
    public static readonly NullFlashcardVocabularySyncPort Instance = new();

    private NullFlashcardVocabularySyncPort()
    {
    }

    public Task<IReadOnlyList<Guid>> ListActiveDeckIdsAsync(Guid boardId, Guid pageId, CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<Guid>>([]);

    public Task CreatePageDeckAsync(Guid userId, Guid boardId, Guid pageId, string boardName, string pageName, CancellationToken cancellationToken = default) =>
        Task.CompletedTask;

    public Task RenamePageDeckAsync(Guid pageId, string boardName, string pageName, CancellationToken cancellationToken = default) =>
        Task.CompletedTask;

    public Task UpsertCardsForWordAsync(VocabWord word, CancellationToken cancellationToken = default) =>
        Task.CompletedTask;

    public Task RemoveCardsForWordsAsync(IEnumerable<Guid> wordIds, CancellationToken cancellationToken = default) =>
        Task.CompletedTask;

    public Task SoftDeleteDecksForBoardAsync(Guid boardId, CancellationToken cancellationToken = default) =>
        Task.CompletedTask;

    public Task SoftDeleteDeckForPageAsync(Guid pageId, CancellationToken cancellationToken = default) =>
        Task.CompletedTask;
}
