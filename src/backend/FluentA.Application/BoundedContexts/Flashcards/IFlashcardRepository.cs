using FluentA.Application.BoundedContexts.Flashcards.DTOs;

namespace FluentA.Application.BoundedContexts.Flashcards;

public interface IFlashcardRepository
{
    Task<IReadOnlyList<FlashcardDeckDto>> ListDecksAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<DeckSessionDto?> GetDeckSessionAsync(Guid userId, Guid deckId, CancellationToken cancellationToken = default);
}
