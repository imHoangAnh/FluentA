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
            var accuracyScore = await _provider.AssessAsync(target.Word, locale, wavAudio, cancellationToken);
            return OperationResult<PronunciationAssessmentDto>.Success(
                new PronunciationAssessmentDto(accuracyScore >= _options.AccuracyThreshold));
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
}
