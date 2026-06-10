using FluentA.Application.BoundedContexts.Vocabulary.DTOs;
using FluentA.Application.Common;

namespace FluentA.Application.BoundedContexts.Vocabulary;

public interface IVocabularyService
{
    /// <summary>Lists vocabulary board summaries for a user.</summary>
    Task<OperationResult<IReadOnlyList<BoardSummaryDto>>> ListBoardsAsync(Guid userId, CancellationToken cancellationToken = default);
    /// <summary>Creates a vocabulary board and its All Words deck.</summary>
    Task<OperationResult<BoardDetailDto>> CreateBoardAsync(Guid userId, CreateBoardRequest request, CancellationToken cancellationToken = default);
    /// <summary>Returns one vocabulary board with pages.</summary>
    Task<OperationResult<BoardDetailDto>> GetBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default);
    /// <summary>Updates vocabulary board metadata.</summary>
    Task<OperationResult<BoardDetailDto>> UpdateBoardAsync(Guid userId, Guid boardId, UpdateBoardRequest request, CancellationToken cancellationToken = default);
    /// <summary>Soft-deletes a vocabulary board.</summary>
    Task<OperationResult<bool>> DeleteBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default);
    /// <summary>Lists pages for a vocabulary board.</summary>
    Task<OperationResult<IReadOnlyList<PageDto>>> ListPagesAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default);
    /// <summary>Creates a page and its Page Deck.</summary>
    Task<OperationResult<PageDto>> CreatePageAsync(Guid userId, Guid boardId, CreatePageRequest request, CancellationToken cancellationToken = default);
    /// <summary>Updates page metadata.</summary>
    Task<OperationResult<PageDto>> UpdatePageAsync(Guid userId, Guid boardId, Guid pageId, UpdatePageRequest request, CancellationToken cancellationToken = default);
    /// <summary>Soft-deletes a page.</summary>
    Task<OperationResult<bool>> DeletePageAsync(Guid userId, Guid boardId, Guid pageId, CancellationToken cancellationToken = default);
    /// <summary>Lists vocabulary words for a page.</summary>
    Task<OperationResult<IReadOnlyList<WordDto>>> ListWordsAsync(Guid userId, Guid boardId, Guid pageId, CancellationToken cancellationToken = default);
    /// <summary>Creates a vocabulary word and synchronized cards.</summary>
    Task<OperationResult<WordDto>> CreateWordAsync(Guid userId, Guid boardId, Guid pageId, WordRequest request, CancellationToken cancellationToken = default);
    /// <summary>Updates a full vocabulary word.</summary>
    Task<OperationResult<WordDto>> UpdateWordAsync(Guid userId, Guid boardId, Guid wordId, WordRequest request, CancellationToken cancellationToken = default);
    /// <summary>Updates one spreadsheet cell for a vocabulary word.</summary>
    Task<OperationResult<WordDto>> UpdateWordCellAsync(Guid userId, Guid boardId, Guid wordId, UpdateWordCellRequest request, CancellationToken cancellationToken = default);
    /// <summary>Soft-deletes a vocabulary word.</summary>
    Task<OperationResult<bool>> DeleteWordAsync(Guid userId, Guid boardId, Guid wordId, CancellationToken cancellationToken = default);
    /// <summary>Returns custom columns and visibility preferences.</summary>
    Task<OperationResult<ColumnConfigurationDto>> GetColumnConfigurationAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default);
    /// <summary>Creates a custom vocabulary column.</summary>
    Task<OperationResult<CustomColumnDto>> CreateCustomColumnAsync(Guid userId, Guid boardId, CreateCustomColumnRequest request, CancellationToken cancellationToken = default);
    /// <summary>Permanently deletes a custom vocabulary column.</summary>
    Task<OperationResult<bool>> DeleteCustomColumnAsync(Guid userId, Guid boardId, Guid columnId, CancellationToken cancellationToken = default);
    /// <summary>Updates hidden-column preferences for a board.</summary>
    Task<OperationResult<ColumnConfigurationDto>> UpdateColumnVisibilityAsync(Guid userId, Guid boardId, UpdateColumnVisibilityRequest request, CancellationToken cancellationToken = default);
}
