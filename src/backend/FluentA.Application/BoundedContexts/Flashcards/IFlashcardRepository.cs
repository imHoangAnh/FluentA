using FluentA.Application.BoundedContexts.Flashcards.DTOs;

namespace FluentA.Application.BoundedContexts.Flashcards;

public interface IFlashcardRepository
{
    Task<IReadOnlyList<FlashcardBoardDto>> ListBoardsAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<PageSessionDto?> GetPageSessionAsync(Guid userId, Guid pageId, CancellationToken cancellationToken = default);
}
