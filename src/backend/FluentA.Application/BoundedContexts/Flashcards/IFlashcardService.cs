using FluentA.Application.BoundedContexts.Flashcards.DTOs;
using FluentA.Application.Common;

namespace FluentA.Application.BoundedContexts.Flashcards;

public interface IFlashcardService
{
    /// <summary>Lists synchronized flashcard decks for a user.</summary>
    Task<IReadOnlyList<FlashcardDeckDto>> ListDecksAsync(Guid userId, CancellationToken cancellationToken = default);
    /// <summary>Returns cards and metadata for a deck review session.</summary>
    Task<OperationResult<DeckSessionDto>> GetDeckSessionAsync(Guid userId, Guid deckId, CancellationToken cancellationToken = default);
}
