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

    public async Task<OperationResult<ReviewSessionCreatedDto>> CreateReviewSessionAsync(
        Guid userId,
        CreateReviewSessionRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.DeckId == Guid.Empty)
        {
            return OperationResult<ReviewSessionCreatedDto>.Failure(FlashcardError.Validation(new Dictionary<string, string[]>
            {
                ["deckId"] = ["Deck id is required."]
            }));
        }

        var session = await _repository.CreateReviewSessionAsync(
            userId,
            request.DeckId,
            Guid.NewGuid(),
            cancellationToken);

        return session is null
            ? OperationResult<ReviewSessionCreatedDto>.Failure(FlashcardError.DeckOrCardNotFound())
            : OperationResult<ReviewSessionCreatedDto>.Success(session);
    }

    public async Task<OperationResult<ReviewSessionSummaryDto>> GetReviewSessionSummaryAsync(
        Guid userId,
        Guid sessionId,
        CancellationToken cancellationToken = default)
    {
        if (sessionId == Guid.Empty)
        {
            return OperationResult<ReviewSessionSummaryDto>.Failure(FlashcardError.Validation(new Dictionary<string, string[]>
            {
                ["sessionId"] = ["Session id is required."]
            }));
        }

        var summary = await _repository.GetReviewSessionSummaryAsync(userId, sessionId, cancellationToken);
        return summary is null
            ? OperationResult<ReviewSessionSummaryDto>.Failure(FlashcardError.DeckOrCardNotFound())
            : OperationResult<ReviewSessionSummaryDto>.Success(summary);
    }

    public Task<ReviewSettingsDto> GetReviewSettingsAsync(Guid userId, CancellationToken cancellationToken = default) =>
        _repository.GetReviewSettingsAsync(userId, cancellationToken);

    public async Task<OperationResult<ReviewSettingsDto>> UpdateReviewSettingsAsync(
        Guid userId,
        UpdateReviewSettingsRequest request,
        CancellationToken cancellationToken = default)
    {
        var errors = ValidateSettings(request);
        if (errors.Count > 0)
        {
            return OperationResult<ReviewSettingsDto>.Failure(FlashcardError.Validation(errors));
        }

        return OperationResult<ReviewSettingsDto>.Success(await _repository.UpdateReviewSettingsAsync(
            userId,
            request.NewCardsPerDay,
            request.ReviewCardsPerDay,
            cancellationToken));
    }

    public async Task<OperationResult<DueDeckDto>> GetDueDeckAsync(
        Guid userId,
        Guid deckId,
        string? timeZoneId,
        CancellationToken cancellationToken = default)
    {
        if (!ReviewTime.TryFindTimeZone(timeZoneId, out var timeZone))
        {
            return OperationResult<DueDeckDto>.Failure(FlashcardError.Validation(new Dictionary<string, string[]>
            {
                ["timeZoneId"] = ["A valid browser timezone id is required."]
            }));
        }

        var dueDeck = await _repository.GetDueDeckAsync(userId, deckId, timeZone!, DateTime.UtcNow, cancellationToken);
        return dueDeck is null
            ? OperationResult<DueDeckDto>.Failure(FlashcardError.DeckOrCardNotFound())
            : OperationResult<DueDeckDto>.Success(dueDeck);
    }

    public async Task<OperationResult<FlashcardDashboardDto>> GetDashboardAsync(
        Guid userId,
        Guid? boardId,
        string? timeZoneId,
        CancellationToken cancellationToken = default)
    {
        if (!ReviewTime.TryFindTimeZone(timeZoneId, out var timeZone))
        {
            return OperationResult<FlashcardDashboardDto>.Failure(FlashcardError.Validation(new Dictionary<string, string[]>
            {
                ["timeZoneId"] = ["A valid browser timezone id is required."]
            }));
        }

        var dashboard = await _repository.GetDashboardAsync(userId, boardId, timeZone!, DateTime.UtcNow, cancellationToken);
        return dashboard is null
            ? OperationResult<FlashcardDashboardDto>.Failure(FlashcardError.DeckOrCardNotFound())
            : OperationResult<FlashcardDashboardDto>.Success(dashboard);
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

    private static Dictionary<string, string[]> ValidateSettings(UpdateReviewSettingsRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        if (request.NewCardsPerDay is < 0 or > ReviewSettings.MaximumDailyLimit)
        {
            errors["newCardsPerDay"] = [$"New cards per day must be between 0 and {ReviewSettings.MaximumDailyLimit}."];
        }

        if (request.ReviewCardsPerDay is < 0 or > ReviewSettings.MaximumDailyLimit)
        {
            errors["reviewCardsPerDay"] = [$"Review cards per day must be between 0 and {ReviewSettings.MaximumDailyLimit}."];
        }

        return errors;
    }
}
