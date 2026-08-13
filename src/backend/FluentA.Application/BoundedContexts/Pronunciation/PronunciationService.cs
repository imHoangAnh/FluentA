using FluentA.Application.BoundedContexts.Pronunciation.DTOs;
using FluentA.Application.Common;

namespace FluentA.Application.BoundedContexts.Pronunciation;

public sealed class PronunciationService : IPronunciationService
{
    private static readonly IReadOnlyDictionary<string, string> Locales = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
    {
        ["en"] = "en-US",
        ["zh"] = "zh-CN",
        ["ja"] = "ja-JP",
        ["ko"] = "ko-KR",
        ["fr"] = "fr-FR",
    };

    private readonly IPronunciationWordRepository _words;
    private readonly IPronunciationAssessmentProvider _provider;
    private readonly PronunciationAssessmentOptions _options;

    public PronunciationService(
        IPronunciationWordRepository words,
        IPronunciationAssessmentProvider provider,
        PronunciationAssessmentOptions options)
    {
        _words = words;
        _provider = provider;
        _options = options;
    }

    public async Task<OperationResult<PronunciationAssessmentDto>> AssessAsync(
        Guid userId,
        Guid wordId,
        ReadOnlyMemory<byte> wavAudio,
        CancellationToken cancellationToken = default)
    {
        if (userId == Guid.Empty || wordId == Guid.Empty || !PronunciationAudioValidator.IsValidPcmWav(wavAudio.Span))
        {
            return OperationResult<PronunciationAssessmentDto>.Failure(PronunciationError.InvalidAudio());
        }

        var target = await _words.FindOwnedWordAsync(userId, wordId, cancellationToken);
        if (target is null)
        {
            return OperationResult<PronunciationAssessmentDto>.Failure(PronunciationError.WordNotFound());
        }

        if (!_options.IsConfigured || !Locales.TryGetValue(target.Language, out var locale))
        {
            return OperationResult<PronunciationAssessmentDto>.Failure(PronunciationError.ProviderUnavailable());
        }

        try
        {
            var assessment = await _provider.AssessAsync(target.Word, locale, wavAudio, cancellationToken);
            var expectedWordCount = target.Word.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Length;
            var isPhrase = expectedWordCount > 1;
            var hasCompletePhrase = !isPhrase
                || assessment.CompletenessScore is not null
                && assessment.CompletenessScore >= _options.CompletenessThreshold
                && assessment.Words.Count >= expectedWordCount
                && assessment.Words.All(word => word.AccuracyScore >= _options.WordAccuracyThreshold)
                && assessment.Words.All(word => !IsMiscue(word.ErrorType));
            var correct = assessment.AccuracyScore >= _options.AccuracyThreshold && hasCompletePhrase;
            var feedbackMode = string.Equals(target.Language, "en", StringComparison.OrdinalIgnoreCase)
                && assessment.Words.All(word => word.Units.Count > 0)
                ? "phoneme"
                : "word";
            var words = assessment.Words
                .Select(word => new PronunciationWordFeedbackDto(
                    word.Text,
                    word.AccuracyScore,
                    word.ErrorType,
                    feedbackMode == "phoneme"
                        ? word.Units.Select(unit => new PronunciationUnitFeedbackDto(unit.Text, unit.AccuracyScore >= _options.WordAccuracyThreshold)).ToArray()
                        : new[] { new PronunciationUnitFeedbackDto(word.Text, word.AccuracyScore >= _options.WordAccuracyThreshold && !IsMiscue(word.ErrorType)) }))
                .ToArray();
            return OperationResult<PronunciationAssessmentDto>.Success(
                new PronunciationAssessmentDto(
                    correct,
                    assessment.AccuracyScore,
                    assessment.CompletenessScore,
                    feedbackMode,
                    words));
        }
        catch (PronunciationProviderException)
        {
            return OperationResult<PronunciationAssessmentDto>.Failure(PronunciationError.ProviderUnavailable());
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return OperationResult<PronunciationAssessmentDto>.Failure(PronunciationError.ProviderUnavailable());
        }
    }

    private static bool IsMiscue(string? errorType) =>
        !string.IsNullOrWhiteSpace(errorType)
        && !string.Equals(errorType, "None", StringComparison.OrdinalIgnoreCase);
}
