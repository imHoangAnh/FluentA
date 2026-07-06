using FluentA.Domain.BoundedContexts.Vocabulary.Entities;

namespace FluentA.Application.BoundedContexts.Vocabulary;

public interface IVocabularyRepository
{
    Task<IReadOnlyList<VocabBoard>> ListBoardsAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<VocabBoard?> GetBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default);
    Task<VocabPage?> GetPageAsync(Guid userId, Guid boardId, Guid pageId, CancellationToken cancellationToken = default);
    Task<VocabWord?> GetWordAsync(Guid userId, Guid boardId, Guid wordId, CancellationToken cancellationToken = default);
    Task<VocabBoardPreference?> GetBoardPreferenceAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<VocabWord>> ListWordsAsync(Guid userId, Guid boardId, Guid pageId, CancellationToken cancellationToken = default);
    Task AddBoardAsync(VocabBoard board, CancellationToken cancellationToken = default);
    Task AddPageAsync(VocabPage page, CancellationToken cancellationToken = default);
    Task AddWordAsync(VocabWord word, CancellationToken cancellationToken = default);
    Task AddBoardPreferenceAsync(VocabBoardPreference preference, CancellationToken cancellationToken = default);
    Task UpdateBoardAsync(VocabBoard board, CancellationToken cancellationToken = default);
    Task UpdatePageAsync(VocabPage page, CancellationToken cancellationToken = default);
    Task UpdateWordAsync(VocabWord word, CancellationToken cancellationToken = default);
    Task UpdateBoardPreferenceAsync(VocabBoardPreference preference, CancellationToken cancellationToken = default);
    Task UpdateFixedCellAsync(VocabWord word, string columnKey, CancellationToken cancellationToken = default);
    Task SoftDeleteBoardAsync(VocabBoard board, CancellationToken cancellationToken = default);
    Task SoftDeletePageAsync(VocabPage page, CancellationToken cancellationToken = default);
    Task SoftDeleteWordAsync(VocabWord word, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
