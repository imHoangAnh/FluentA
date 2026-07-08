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

    public Task<IReadOnlyList<FlashcardBoardDto>> ListBoardsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return _repository.ListBoardsAsync(userId, cancellationToken);
    }

    public async Task<OperationResult<PageSessionDto>> GetPageSessionAsync(
        Guid userId,
        Guid pageId,
        CancellationToken cancellationToken = default)
    {
        var session = await _repository.GetPageSessionAsync(userId, pageId, cancellationToken);
        return session is null
            ? OperationResult<PageSessionDto>.Failure(FlashcardError.DeckOrCardNotFound())
            : OperationResult<PageSessionDto>.Success(session);
    }
}
