using FluentA.Application.BoundedContexts.Flashcards.DTOs;
using FluentA.Application.Common;
using FluentA.Domain.BoundedContexts.Flashcards.Entities;

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

    public async Task<OperationResult<PracticeSessionSummaryDto>> CreatePracticeSessionSummaryAsync(
        Guid userId,
        CreatePracticeSessionSummaryRequest request,
        CancellationToken cancellationToken = default)
    {
        var errors = new Dictionary<string, string[]>();
        if (request.DeckId == Guid.Empty)
        {
            errors["deckId"] = ["Deck id is required."];
        }

        if (!TryParsePracticeMode(request.Mode, out var mode))
        {
            errors["mode"] = ["Mode must be dictation, meaningToWord, or pronunciation."];
        }

        if (request.TotalCards <= 0)
        {
            errors["totalCards"] = ["Total cards must be greater than 0."];
        }

        if (request.CorrectCards < 0)
        {
            errors["correctCards"] = ["Correct cards must be 0 or greater."];
        }

        if (request.WrongCards < 0)
        {
            errors["wrongCards"] = ["Wrong cards must be 0 or greater."];
        }

        if (request.CorrectCards + request.WrongCards != request.TotalCards)
        {
            errors["summary"] = ["Correct cards plus wrong cards must equal total cards."];
        }

        if (!ReviewTime.TryFindTimeZone(request.TimeZoneId, out var timeZone))
        {
            errors["timeZoneId"] = ["A valid browser timezone id is required."];
        }

        if (errors.Count > 0)
        {
            return OperationResult<PracticeSessionSummaryDto>.Failure(FlashcardError.Validation(errors));
        }

        var result = await _repository.CreatePracticeSessionSummaryAsync(
            userId,
            request.DeckId,
            mode,
            request.TotalCards,
            request.CorrectCards,
            request.WrongCards,
            timeZone!,
            DateTime.UtcNow,
            cancellationToken);

        return result.Status switch
        {
            PracticeSessionSummarySaveStatus.Success => OperationResult<PracticeSessionSummaryDto>.Success(result.Summary!),
            PracticeSessionSummarySaveStatus.DeckNotFound => OperationResult<PracticeSessionSummaryDto>.Failure(FlashcardError.DeckOrCardNotFound()),
            PracticeSessionSummarySaveStatus.InconsistentSummary => OperationResult<PracticeSessionSummaryDto>.Failure(FlashcardError.Validation(new Dictionary<string, string[]>
            {
                ["summary"] = ["Practice summary does not match the owned active deck."]
            })),
            _ => OperationResult<PracticeSessionSummaryDto>.Failure(FlashcardError.Validation(new Dictionary<string, string[]>
            {
                ["summary"] = ["Practice summary is invalid."]
            })),
        };
    }

    public async Task<OperationResult<ReviewSessionCreatedDto>> CreateReviewSessionAsync(
        Guid userId,
        CreateReviewSessionRequest request,
        CancellationToken cancellationToken = default)
    {
        var errors = new Dictionary<string, string[]>();
        if (request.BoardId == Guid.Empty)
        {
            errors["boardId"] = ["Board id is required."];
        }

        if (!IsAllowedOrderType(request.OrderType))
        {
            errors["orderType"] = ["Order type must be sequential or shuffle."];
        }

        if (!IsAllowedReviewMode(request.Mode))
        {
            errors["mode"] = ["Mode must be dictation, pronunciation, meaningToWord, or random."];
        }

        if (!ReviewTime.TryFindTimeZone(request.TimeZoneId, out var timeZone))
        {
            errors["timeZoneId"] = ["A valid browser timezone id is required."];
        }

        if (errors.Count > 0)
        {
            return OperationResult<ReviewSessionCreatedDto>.Failure(FlashcardError.Validation(errors));
        }

        var session = await _repository.CreateReviewSessionAsync(
            userId,
            request.BoardId,
            request.OrderType,
            request.Mode,
            timeZone!,
            DateTime.UtcNow,
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

    public Task<PracticeSettingsDto> GetPracticeSettingsAsync(Guid userId, CancellationToken cancellationToken = default) =>
        _repository.GetPracticeSettingsAsync(userId, cancellationToken);

    public async Task<OperationResult<PracticeSettingsDto>> UpdatePracticeSettingsAsync(
        Guid userId,
        UpdatePracticeSettingsRequest request,
        CancellationToken cancellationToken = default)
    {
        var errors = ValidatePracticeSettings(request);
        if (errors.Count > 0)
        {
            return OperationResult<PracticeSettingsDto>.Failure(FlashcardError.Validation(errors));
        }

        return OperationResult<PracticeSettingsDto>.Success(await _repository.UpdatePracticeSettingsAsync(
            userId,
            request.ModeSequence,
            cancellationToken));
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
            request.DailyLimit,
            request.RecapAfterAnswer,
            cancellationToken));
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
            request.Correct,
            request.TimeSpentSeconds,
            timeZone!,
            cancellationToken);

        if (result is null)
        {
            return OperationResult<ReviewResultDto>.Failure(FlashcardError.DeckOrCardNotFound());
        }

        return OperationResult<ReviewResultDto>.Success(result);
    }

    private static Dictionary<string, string[]> ValidateSettings(UpdateReviewSettingsRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        if (request.DailyLimit is < 0 or > ReviewSettings.MaximumDailyLimit)
        {
            errors["dailyLimit"] = [$"Daily limit must be between 0 and {ReviewSettings.MaximumDailyLimit}."];
        }

        return errors;
    }

    private static Dictionary<string, string[]> ValidatePracticeSettings(UpdatePracticeSettingsRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        if (request.ModeSequence is null || request.ModeSequence.Count == 0)
        {
            errors["modeSequence"] = ["Mode sequence must include at least one practice mode."];
            return errors;
        }

        var allowed = new HashSet<string>(StringComparer.Ordinal)
        {
            "dictation",
            "meaningToWord",
            "pronunciation",
        };
        var seen = new HashSet<string>(StringComparer.Ordinal);
        foreach (var mode in request.ModeSequence)
        {
            var value = mode?.Trim() ?? string.Empty;
            if (!allowed.Contains(value))
            {
                errors["modeSequence"] = ["Mode sequence entries must be dictation, meaningToWord, or pronunciation."];
                return errors;
            }

            if (!seen.Add(value))
            {
                errors["modeSequence"] = ["Mode sequence entries must be unique."];
                return errors;
            }
        }

        return errors;
    }

    private static bool TryParsePracticeMode(string? value, out PracticeMode mode)
    {
        mode = default;
        return value switch
        {
            "dictation" => Assign(PracticeMode.Dictation, out mode),
            "meaningToWord" => Assign(PracticeMode.MeaningToWord, out mode),
            "pronunciation" => Assign(PracticeMode.Pronunciation, out mode),
            _ => false,
        };
    }

    private static bool Assign(PracticeMode value, out PracticeMode mode)
    {
        mode = value;
        return true;
    }

    private static bool IsAllowedOrderType(string? value) =>
        value is "sequential" or "shuffle";

    private static bool IsAllowedReviewMode(string? value) =>
        value is "dictation" or "pronunciation" or "meaningToWord" or "random";
}
