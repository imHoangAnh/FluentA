using FluentA.Application.BoundedContexts.Flashcards.DTOs;
using FluentA.Application.Common;
using FluentA.Domain.BoundedContexts.Flashcards.Entities;

namespace FluentA.Application.BoundedContexts.Flashcards;

public sealed class FlashcardService : IFlashcardService
{
    private readonly IFlashcardRepository _repository;
    private readonly IFlashcardSyncNotifier _flashcardSyncNotifier;

    public FlashcardService(IFlashcardRepository repository, IFlashcardSyncNotifier? flashcardSyncNotifier = null)
    {
        _repository = repository;
        _flashcardSyncNotifier = flashcardSyncNotifier ?? NullFlashcardSyncNotifier.Instance;
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

    public async Task<OperationResult<ReviewResultDto>> SubmitReviewAsync(
        Guid userId,
        SubmitReviewRequest request,
        CancellationToken cancellationToken = default)
    {
        var errors = new Dictionary<string, string[]>();
        if (request.SessionId == Guid.Empty)
        {
            errors["sessionId"] = ["Session id is required."];
        }

        if (request.CardId == Guid.Empty)
        {
            errors["cardId"] = ["Card id is required."];
        }

        if (!Enum.IsDefined(typeof(ReviewRating), request.Rating))
        {
            errors["rating"] = ["Rating must be 0 (Again), 1 (Hard), 2 (Good), or 3 (Easy)."];
        }

        if (request.TimeSpentSeconds is < 0 or > 86400)
        {
            errors["timeSpentSeconds"] = ["Time spent must be between 0 and 86400 seconds."];
        }

        if (!ReviewTime.TryFindTimeZone(request.TimeZoneId, out var timeZone))
        {
            errors["timeZoneId"] = ["A valid browser timezone id is required."];
        }

        if (errors.Count > 0)
        {
            return OperationResult<ReviewResultDto>.Failure(FlashcardError.Validation(errors));
        }

        var result = await _repository.AddReviewAsync(
            userId,
            request.SessionId,
            request.CardId,
            (ReviewRating)request.Rating,
            request.TimeSpentSeconds,
            timeZone!,
            cancellationToken);

        if (result is null)
        {
            return OperationResult<ReviewResultDto>.Failure(FlashcardError.DeckOrCardNotFound());
        }

        if (result.DeckType == DeckType.AllWords.ToString())
        {
            await _flashcardSyncNotifier.DecksUpdatedAsync(userId, result.BoardId, [result.DeckId], cancellationToken);
        }

        return OperationResult<ReviewResultDto>.Success(result);
    }
}
