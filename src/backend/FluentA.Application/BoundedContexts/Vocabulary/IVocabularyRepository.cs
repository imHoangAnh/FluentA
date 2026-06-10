using FluentA.Domain.BoundedContexts.Flashcards.Entities;
using FluentA.Domain.BoundedContexts.Vocabulary.Entities;

namespace FluentA.Application.BoundedContexts.Vocabulary;

public interface IVocabularyRepository
{
    Task<IReadOnlyList<VocabBoard>> ListBoardsAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<VocabBoard?> GetBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default);
    Task<VocabPage?> GetPageAsync(Guid userId, Guid boardId, Guid pageId, CancellationToken cancellationToken = default);
    Task<VocabWord?> GetWordAsync(Guid userId, Guid boardId, Guid wordId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<VocabWord>> ListWordsAsync(Guid userId, Guid boardId, Guid pageId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Guid>> ListActiveDeckIdsAsync(Guid boardId, Guid pageId, CancellationToken cancellationToken = default);
    Task<int> NextBoardSortOrderAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<int> NextPageSortOrderAsync(Guid boardId, CancellationToken cancellationToken = default);
    Task AddBoardWithDeckAsync(VocabBoard board, FlashcardDeck deck, CancellationToken cancellationToken = default);
    Task AddPageWithDeckAsync(VocabPage page, FlashcardDeck deck, CancellationToken cancellationToken = default);
    Task AddWordAsync(VocabWord word, CancellationToken cancellationToken = default);
    Task UpdateBoardAsync(VocabBoard board, CancellationToken cancellationToken = default);
    Task UpdatePageAsync(VocabPage page, CancellationToken cancellationToken = default);
    Task UpdateWordAsync(VocabWord word, CancellationToken cancellationToken = default);
    Task SoftDeleteBoardAsync(VocabBoard board, CancellationToken cancellationToken = default);
    Task SoftDeletePageAsync(VocabPage page, CancellationToken cancellationToken = default);
    Task SoftDeleteWordAsync(VocabWord word, CancellationToken cancellationToken = default);
}
