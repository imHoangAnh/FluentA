using FluentA.Application.BoundedContexts.Pronunciation;
using FluentA.Application.BoundedContexts.Pronunciation.DTOs;
using FluentA.Application.BoundedContexts.Practice.DTOs;
using FluentA.Application.Common;
using FluentA.Domain.BoundedContexts.Practice.Entities;

namespace FluentA.Application.BoundedContexts.Practice;

public sealed class PracticeService : IPracticeService
{
    private const int MaxDeckPageSize = 100;
    private readonly IPracticeRepository _repository;
    private readonly IPracticeSessionRepository? _sessionRepository;
    private readonly IReviewEnrollmentPort _reviewEnrollment;
    private readonly IPronunciationService? _pronunciation;

    // Kept for existing internal callers and unit-test doubles that exercise
    // only the legacy summary/enrollment helpers.
    public PracticeService(IPracticeRepository repository, IReviewEnrollmentPort reviewEnrollment)
    {
        _repository = repository;
        _sessionRepository = repository as IPracticeSessionRepository;
        _reviewEnrollment = reviewEnrollment;
    }

    public PracticeService(
        IPracticeRepository repository,
        IReviewEnrollmentPort reviewEnrollment,
        IPronunciationService pronunciation)
        : this(repository, reviewEnrollment)
    {
        _pronunciation = pronunciation;
    }

    public async Task<OperationResult<PracticeDeckPageDto>> GetDecksAsync(
        Guid userId,
        Guid boardId,
        string? search,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var errors = new Dictionary<string, string[]>();
        if (boardId == Guid.Empty)
        {
            errors["boardId"] = ["Board id is required."];
        }

        if (page < 1)
        {
            errors["page"] = ["Page must be 1 or greater."];
        }

        if (pageSize is < 1 or > MaxDeckPageSize)
        {
            errors["pageSize"] = [$"Page size must be between 1 and {MaxDeckPageSize}."];
        }

        if (errors.Count > 0)
        {
            return OperationResult<PracticeDeckPageDto>.Failure(PracticeError.Validation(errors));
        }

        var result = await Sessions.GetDecksAsync(
            userId,
            boardId,
            string.IsNullOrWhiteSpace(search) ? null : search.Trim(),
            page,
            pageSize,
            cancellationToken);
        return result.Status switch
        {
            PracticeRepositoryOperationStatus.Success => OperationResult<PracticeDeckPageDto>.Success(result.Page!),
            PracticeRepositoryOperationStatus.NotFound => OperationResult<PracticeDeckPageDto>.Failure(PracticeError.DeckOrCardNotFound()),
            _ => OperationResult<PracticeDeckPageDto>.Failure(PracticeError.Validation(new Dictionary<string, string[]>
            {
                ["decks"] = ["The deck list could not be loaded."],
            })),
        };
    }

    public async Task<OperationResult<PracticeSessionDto>> CreateSessionAsync(
        Guid userId,
        CreatePracticeSessionRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.PageId == Guid.Empty)
        {
            return OperationResult<PracticeSessionDto>.Failure(PracticeError.Validation(new Dictionary<string, string[]>
            {
                ["pageId"] = ["Page id is required."],
            }));
        }

        var result = await Sessions.CreateSessionAsync(userId, request.PageId, DateTime.UtcNow, cancellationToken);
        return result.Status switch
        {
            PracticeRepositoryOperationStatus.Success => OperationResult<PracticeSessionDto>.Success(result.Value!),
            PracticeRepositoryOperationStatus.NotFound => OperationResult<PracticeSessionDto>.Failure(PracticeError.DeckOrCardNotFound()),
            PracticeRepositoryOperationStatus.EmptyDeck => OperationResult<PracticeSessionDto>.Failure(PracticeError.EmptyDeck()),
            PracticeRepositoryOperationStatus.Conflict => OperationResult<PracticeSessionDto>.Failure(PracticeError.Conflict()),
            _ => OperationResult<PracticeSessionDto>.Failure(PracticeError.Conflict()),
        };
    }

    public async Task<OperationResult<PracticeSessionDto>> GetSessionAsync(
        Guid userId,
        Guid sessionId,
        CancellationToken cancellationToken = default)
    {
        var result = await Sessions.GetSessionAsync(userId, sessionId, cancellationToken);
        return MapRepositoryResult(result);
    }

    public async Task<OperationResult<PracticeAnswerResultDto>> SubmitAnswerAsync(
        Guid userId,
        Guid sessionId,
        SubmitPracticeAnswerRequest request,
        CancellationToken cancellationToken = default)
    {
        var errors = new Dictionary<string, string[]>();
        if (request.ItemId == Guid.Empty)
        {
            errors["itemId"] = ["Item id is required."];
        }

        if (!TryParseStep(request.Step, out var step))
        {
            errors["step"] = ["Step must be dictation, wordToMeaning, pronunciation, or recap."];
        }

        if (request.DurationMs < 0)
        {
            errors["durationMs"] = ["Duration must be 0 or greater."];
        }

        if (TryParseStep(request.Step, out step))
        {
            if (request.Skip)
            {
                if (!string.IsNullOrWhiteSpace(request.AnswerText) || request.AnswerSlotId.HasValue)
                {
                    errors["answer"] = ["A skipped step cannot also include an answer."];
                }
            }
            else
            {
                switch (step)
                {
                    case PracticeStep.Dictation:
                        if (string.IsNullOrWhiteSpace(request.AnswerText) || request.AnswerSlotId.HasValue)
                        {
                            errors["answerText"] = ["Dictation requires a typed answer."];
                        }

                        break;
                    case PracticeStep.WordToMeaning:
                        if (!request.AnswerSlotId.HasValue || !string.IsNullOrWhiteSpace(request.AnswerText))
                        {
                            errors["answerSlotId"] = ["Word-to-meaning requires an answer slot id."];
                        }

                        break;
                    case PracticeStep.Pronunciation:
                        errors["step"] = ["Use the pronunciation-attempt endpoint for this step."];
                        break;
                    case PracticeStep.Recap:
                        errors["step"] = ["The recap step can only be skipped or completed by choosing a review level."];
                        break;
                }
            }
        }

        if (errors.Count > 0)
        {
            return OperationResult<PracticeAnswerResultDto>.Failure(PracticeError.Validation(errors));
        }

        var result = await Sessions.SubmitAnswerAsync(
            userId,
            sessionId,
            request.ItemId,
            step,
            request.AnswerText?.Trim(),
            request.AnswerSlotId,
            request.Skip,
            request.DurationMs,
            DateTime.UtcNow,
            cancellationToken);
        return MapRepositoryResult(result);
    }

    public async Task<OperationResult<PracticePronunciationAttemptResultDto>> SubmitPronunciationAttemptAsync(
        Guid userId,
        Guid sessionId,
        Guid itemId,
        ReadOnlyMemory<byte> wavAudio,
        long durationMs,
        CancellationToken cancellationToken = default)
    {
        if (itemId == Guid.Empty || durationMs < 0)
        {
            return OperationResult<PracticePronunciationAttemptResultDto>.Failure(PracticeError.Validation(new Dictionary<string, string[]>
            {
                [itemId == Guid.Empty ? "itemId" : "durationMs"] = [itemId == Guid.Empty ? "Item id is required." : "Duration must be 0 or greater."],
            }));
        }

        var target = await Sessions.GetPronunciationTargetAsync(userId, sessionId, itemId, cancellationToken);
        if (target.Status != PracticeRepositoryOperationStatus.Success || target.Value is null)
        {
            return MapRepositoryResult<PracticePronunciationAttemptResultDto>(
                target.Status,
                null);
        }

        if (_pronunciation is null)
        {
            return OperationResult<PracticePronunciationAttemptResultDto>.Failure(PracticeError.PronunciationUnavailable());
        }

        var assessment = await _pronunciation.AssessFromSessionAsync(
            userId,
            new PronunciationTarget(target.Value.Word, target.Value.Language),
            wavAudio,
            cancellationToken);
        if (!assessment.IsSuccess)
        {
            // Provider and microphone failures are not saved as failed answers.
            return OperationResult<PracticePronunciationAttemptResultDto>.Failure(assessment.Error!);
        }

        var result = await Sessions.RecordPronunciationAttemptAsync(
            userId,
            sessionId,
            itemId,
            assessment.Value!,
            durationMs,
            DateTime.UtcNow,
            cancellationToken);
        return MapRepositoryResult(result);
    }

    public async Task<OperationResult<PracticeReviewLevelResultDto>> SetReviewLevelAsync(
        Guid userId,
        Guid sessionId,
        Guid wordId,
        SetPracticeReviewLevelRequest request,
        CancellationToken cancellationToken = default)
    {
        var errors = new Dictionary<string, string[]>();
        if (wordId == Guid.Empty)
        {
            errors["wordId"] = ["Word id is required."];
        }

        if (request.Level is < 0 or > 5)
        {
            errors["level"] = ["Level must be between 0 and 5."];
        }

        if (!PracticeTime.TryFindTimeZone(request.TimeZoneId, out var timeZone))
        {
            errors["timeZoneId"] = ["A valid browser timezone id is required."];
        }

        if (errors.Count > 0)
        {
            return OperationResult<PracticeReviewLevelResultDto>.Failure(PracticeError.Validation(errors));
        }

        var context = await Sessions.GetReviewEnrollmentContextAsync(userId, sessionId, wordId, cancellationToken);
        if (context.Status != PracticeRepositoryOperationStatus.Success || context.Value is null)
        {
            return MapRepositoryResult<PracticeReviewLevelResultDto>(context.Status, null);
        }

        var enrollment = await _reviewEnrollment.EnrollMissingPracticeWordsAsync(
            userId,
            context.Value.PageId,
            context.Value.WordId,
            timeZone!,
            DateTime.UtcNow,
            request.Level,
            cancellationToken);
        if (enrollment is null)
        {
            return OperationResult<PracticeReviewLevelResultDto>.Failure(PracticeError.DeckOrCardNotFound());
        }

        var advanced = await Sessions.AdvanceAfterReviewEnrollmentAsync(
            userId,
            sessionId,
            wordId,
            request.Level,
            string.Equals(enrollment.Status, "alreadyInReview", StringComparison.Ordinal),
            DateTime.UtcNow,
            cancellationToken);
        return MapRepositoryResult(advanced);
    }

    public async Task<OperationResult<PracticeSessionDto>> CompleteSessionAsync(
        Guid userId,
        Guid sessionId,
        CompletePracticeSessionRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!PracticeTime.TryFindTimeZone(request.TimeZoneId, out _))
        {
            return OperationResult<PracticeSessionDto>.Failure(PracticeError.Validation(new Dictionary<string, string[]>
            {
                ["timeZoneId"] = ["A valid browser timezone id is required."],
            }));
        }

        var result = await Sessions.CompleteSessionAsync(userId, sessionId, DateTime.UtcNow, cancellationToken);
        return MapRepositoryResult(result);
    }

    public async Task<OperationResult<PracticeSessionSummaryDto>> CreatePracticeSessionSummaryAsync(
        Guid userId,
        CreatePracticeSessionSummaryRequest request,
        CancellationToken cancellationToken = default)
    {
        var errors = new Dictionary<string, string[]>();
        if (request.PageId == Guid.Empty)
        {
            errors["pageId"] = ["Page id is required."];
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

        if (!PracticeTime.TryFindTimeZone(request.TimeZoneId, out var timeZone))
        {
            errors["timeZoneId"] = ["A valid browser timezone id is required."];
        }

        if (errors.Count > 0)
        {
            return OperationResult<PracticeSessionSummaryDto>.Failure(PracticeError.Validation(errors));
        }

        var result = await _repository.CreatePracticeSessionSummaryAsync(
            userId,
            request.PageId,
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
            PracticeSessionSummarySaveStatus.PageNotFound => OperationResult<PracticeSessionSummaryDto>.Failure(PracticeError.DeckOrCardNotFound()),
            PracticeSessionSummarySaveStatus.InconsistentSummary => OperationResult<PracticeSessionSummaryDto>.Failure(PracticeError.Validation(new Dictionary<string, string[]>
            {
                ["summary"] = ["Practice summary does not match the owned active deck."],
            })),
            _ => OperationResult<PracticeSessionSummaryDto>.Failure(PracticeError.Validation(new Dictionary<string, string[]>
            {
                ["summary"] = ["Practice summary is invalid."],
            })),
        };
    }

    public async Task<OperationResult<AddPracticeWordsToReviewDto>> AddPracticeWordsToReviewAsync(
        Guid userId,
        AddPracticeWordsToReviewRequest request,
        CancellationToken cancellationToken = default)
    {
        var errors = new Dictionary<string, string[]>();
        if (request.PageId == Guid.Empty)
        {
            errors["pageId"] = ["Page id is required."];
        }

        if (request.WordId == Guid.Empty)
        {
            errors["wordId"] = ["Word id is required."];
        }

        if (request.InitialLevel is < 0 or > 5)
        {
            errors["initialLevel"] = ["Initial level must be between 0 and 5."];
        }

        if (!PracticeTime.TryFindTimeZone(request.TimeZoneId, out var timeZone))
        {
            errors["timeZoneId"] = ["A valid browser timezone id is required."];
        }

        if (errors.Count > 0)
        {
            return OperationResult<AddPracticeWordsToReviewDto>.Failure(PracticeError.Validation(errors));
        }

        var result = await _reviewEnrollment.EnrollMissingPracticeWordsAsync(
            userId,
            request.PageId,
            request.WordId,
            timeZone!,
            DateTime.UtcNow,
            request.InitialLevel,
            cancellationToken);

        return result is null
            ? OperationResult<AddPracticeWordsToReviewDto>.Failure(PracticeError.DeckOrCardNotFound())
            : OperationResult<AddPracticeWordsToReviewDto>.Success(result);
    }

    private IPracticeSessionRepository Sessions => _sessionRepository
        ?? throw new InvalidOperationException("The registered Practice repository does not support persisted sessions.");

    private static OperationResult<T> MapRepositoryResult<T>(PracticeRepositoryOperationResult<T> result) =>
        MapRepositoryResult(result.Status, result.Value);

    private static OperationResult<T> MapRepositoryResult<T>(PracticeRepositoryOperationStatus status, T? value) => status switch
    {
        PracticeRepositoryOperationStatus.Success => OperationResult<T>.Success(value!),
        PracticeRepositoryOperationStatus.NotFound => OperationResult<T>.Failure(PracticeError.DeckOrCardNotFound()),
        PracticeRepositoryOperationStatus.EmptyDeck => OperationResult<T>.Failure(PracticeError.EmptyDeck()),
        _ => OperationResult<T>.Failure(PracticeError.Conflict()),
    };

    private static bool TryParseStep(string? value, out PracticeStep step)
    {
        step = default;
        return value switch
        {
            "dictation" => Assign(PracticeStep.Dictation, out step),
            "wordToMeaning" => Assign(PracticeStep.WordToMeaning, out step),
            "pronunciation" => Assign(PracticeStep.Pronunciation, out step),
            "recap" => Assign(PracticeStep.Recap, out step),
            _ => false,
        };
    }

    private static string? StepValue(PracticeStep? step) => step switch
    {
        PracticeStep.Dictation => "dictation",
        PracticeStep.WordToMeaning => "wordToMeaning",
        PracticeStep.Pronunciation => "pronunciation",
        PracticeStep.Recap => "recap",
        _ => null,
    };

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

    private static bool Assign<T>(T value, out T target)
    {
        target = value;
        return true;
    }
}
