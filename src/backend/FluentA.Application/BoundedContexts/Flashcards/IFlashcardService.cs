using FluentA.Application.BoundedContexts.Flashcards.DTOs;
using FluentA.Application.Common;

namespace FluentA.Application.BoundedContexts.Flashcards;

public interface IFlashcardService
{
    /// <summary>Lists vocabulary boards and pages for Flashcard/Practice.</summary>
    Task<IReadOnlyList<FlashcardBoardDto>> ListBoardsAsync(Guid userId, CancellationToken cancellationToken = default);
    /// <summary>Returns words and metadata for a page-scoped learning session.</summary>
    Task<OperationResult<PageSessionDto>> GetPageSessionAsync(Guid userId, Guid pageId, CancellationToken cancellationToken = default);
}
