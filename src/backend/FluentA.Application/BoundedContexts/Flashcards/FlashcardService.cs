using FluentA.Application.BoundedContexts.Flashcards.DTOs;
using FluentA.Application.Common;

namespace FluentA.Application.BoundedContexts.Flashcards;

public sealed class FlashcardService : IFlashcardService
{
    private readonly IFlashcardRepository _repository;

    public FlashcardService(IFlashcardRepository repository, IFlashcardSyncNotifier? flashcardSyncNotifier = null)
    {
        _repository = repository;
    }

    public Task<IReadOnlyList<FlashcardDeckDto>> ListDecksAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return _repository.ListDecksAsync(userId, cancellationToken);
    }

    public async Task<OperationResult<DeckSessionDto>> GetDeckSessionAsync(
        Guid userId,
        Guid deckId,
        CancellationToken cancellationToken = default)
    {
        var session = await _repository.GetDeckSessionAsync(userId, deckId, cancellationToken);
        return session is null
            ? OperationResult<DeckSessionDto>.Failure(FlashcardError.DeckOrCardNotFound())
            : OperationResult<DeckSessionDto>.Success(session);
    }
}
