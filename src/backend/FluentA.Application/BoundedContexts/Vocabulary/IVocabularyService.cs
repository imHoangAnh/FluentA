using FluentA.Application.BoundedContexts.Vocabulary.DTOs;
using FluentA.Application.Common;

namespace FluentA.Application.BoundedContexts.Vocabulary;

public interface IVocabularyService
{
    Task<OperationResult<IReadOnlyList<BoardSummaryDto>>> ListBoardsAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<OperationResult<BoardDetailDto>> CreateBoardAsync(Guid userId, CreateBoardRequest request, CancellationToken cancellationToken = default);
    Task<OperationResult<BoardDetailDto>> GetBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default);
    Task<OperationResult<BoardDetailDto>> UpdateBoardAsync(Guid userId, Guid boardId, UpdateBoardRequest request, CancellationToken cancellationToken = default);
    Task<OperationResult<bool>> DeleteBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default);
    Task<OperationResult<IReadOnlyList<PageDto>>> ListPagesAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default);
    Task<OperationResult<PageDto>> CreatePageAsync(Guid userId, Guid boardId, CreatePageRequest request, CancellationToken cancellationToken = default);
    Task<OperationResult<PageDto>> UpdatePageAsync(Guid userId, Guid boardId, Guid pageId, UpdatePageRequest request, CancellationToken cancellationToken = default);
    Task<OperationResult<bool>> DeletePageAsync(Guid userId, Guid boardId, Guid pageId, CancellationToken cancellationToken = default);
    Task<OperationResult<IReadOnlyList<WordDto>>> ListWordsAsync(Guid userId, Guid boardId, Guid pageId, CancellationToken cancellationToken = default);
    Task<OperationResult<WordDto>> CreateWordAsync(Guid userId, Guid boardId, Guid pageId, WordRequest request, CancellationToken cancellationToken = default);
    Task<OperationResult<WordDto>> UpdateWordAsync(Guid userId, Guid boardId, Guid wordId, WordRequest request, CancellationToken cancellationToken = default);
    Task<OperationResult<WordDto>> UpdateWordCellAsync(Guid userId, Guid boardId, Guid wordId, UpdateWordCellRequest request, CancellationToken cancellationToken = default);
    Task<OperationResult<bool>> DeleteWordAsync(Guid userId, Guid boardId, Guid wordId, CancellationToken cancellationToken = default);
    Task<OperationResult<BoardPreferencesDto>> UpdateBoardPreferencesAsync(Guid userId, Guid boardId, UpdateBoardPreferencesRequest request, CancellationToken cancellationToken = default);
}
