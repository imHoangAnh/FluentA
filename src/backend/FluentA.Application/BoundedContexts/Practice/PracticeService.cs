using FluentA.Application.BoundedContexts.Practice.DTOs;
using FluentA.Application.Common;
using FluentA.Domain.BoundedContexts.Practice.Entities;

namespace FluentA.Application.BoundedContexts.Practice;

public sealed class PracticeService : IPracticeService
{
    private readonly IPracticeRepository _repository;
    private readonly IReviewEnrollmentPort _reviewEnrollment;

    public PracticeService(IPracticeRepository repository, IReviewEnrollmentPort reviewEnrollment)
    {
        _repository = repository;
        _reviewEnrollment = reviewEnrollment;
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
                ["summary"] = ["Practice summary does not match the owned active deck."]
            })),
            _ => OperationResult<PracticeSessionSummaryDto>.Failure(PracticeError.Validation(new Dictionary<string, string[]>
            {
                ["summary"] = ["Practice summary is invalid."]
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
            cancellationToken);

        return result is null
            ? OperationResult<AddPracticeWordsToReviewDto>.Failure(PracticeError.DeckOrCardNotFound())
            : OperationResult<AddPracticeWordsToReviewDto>.Success(result);
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
            return OperationResult<PracticeSettingsDto>.Failure(PracticeError.Validation(errors));
        }

        return OperationResult<PracticeSettingsDto>.Success(await _repository.UpdatePracticeSettingsAsync(
            userId,
            request.ModeSequence,
            cancellationToken));
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
}
