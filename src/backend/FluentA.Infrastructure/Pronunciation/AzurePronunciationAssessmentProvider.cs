using System.Diagnostics;
using System.Globalization;
using System.Text;
using System.Text.Json;
using FluentA.Application.BoundedContexts.Pronunciation;
using Microsoft.Extensions.Logging;

namespace FluentA.Infrastructure.Pronunciation;

public sealed class AzurePronunciationAssessmentProvider : IPronunciationAssessmentProvider
{
    private readonly HttpClient _httpClient;
    private readonly PronunciationAssessmentOptions _options;
    private readonly ILogger<AzurePronunciationAssessmentProvider> _logger;

    public AzurePronunciationAssessmentProvider(
        HttpClient httpClient,
        PronunciationAssessmentOptions options,
        ILogger<AzurePronunciationAssessmentProvider> logger)
    {
        _httpClient = httpClient;
        _options = options;
        _logger = logger;
    }

    public async Task<PronunciationAssessment> AssessAsync(
        string referenceText,
        string locale,
        ReadOnlyMemory<byte> wavAudio,
        CancellationToken cancellationToken = default)
    {
        if (!_options.IsConfigured)
        {
            throw new PronunciationProviderException("Azure Speech is not configured.");
        }

        var region = _options.Region.Trim().ToLowerInvariant();
        var endpoint = new Uri(
            $"https://{region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language={Uri.EscapeDataString(locale)}&format=detailed",
            UriKind.Absolute);
        var assessmentSettings = JsonSerializer.Serialize(new
        {
            ReferenceText = referenceText,
            GradingSystem = "HundredMark",
            Granularity = "Phoneme",
            Dimension = "Comprehensive",
            EnableMiscue = true,
            PhonemeAlphabet = "IPA",
            EnableProsodyAssessment = false,
        });

        using var request = new HttpRequestMessage(HttpMethod.Post, endpoint);
        request.Headers.TryAddWithoutValidation("Ocp-Apim-Subscription-Key", _options.SubscriptionKey);
        request.Headers.TryAddWithoutValidation(
            "Pronunciation-Assessment",
            Convert.ToBase64String(Encoding.UTF8.GetBytes(assessmentSettings)));
        request.Content = new ReadOnlyMemoryContent(wavAudio);
        request.Content.Headers.TryAddWithoutValidation(
            "Content-Type",
            "audio/wav; codecs=audio/pcm; samplerate=16000");

        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(_options.TimeoutSeconds));
        var stopwatch = Stopwatch.StartNew();

        try
        {
            using var response = await _httpClient.SendAsync(
                request,
                HttpCompletionOption.ResponseHeadersRead,
                timeout.Token);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Azure pronunciation assessment returned status {StatusCode} after {ElapsedMilliseconds} ms.",
                    (int)response.StatusCode,
                    stopwatch.ElapsedMilliseconds);
                throw new PronunciationProviderException(
                    $"Azure Speech returned HTTP {((int)response.StatusCode).ToString(CultureInfo.InvariantCulture)}.");
            }

            await using var responseStream = await response.Content.ReadAsStreamAsync(timeout.Token);
            using var payload = await JsonDocument.ParseAsync(responseStream, cancellationToken: timeout.Token);
            if (!payload.RootElement.TryGetProperty("NBest", out var nBest)
                || nBest.ValueKind != JsonValueKind.Array
                || nBest.GetArrayLength() == 0
                || !nBest[0].TryGetProperty("PronunciationAssessment", out var pronunciationAssessment)
                || !TryReadScore(pronunciationAssessment, "AccuracyScore", out var accuracyScore))
            {
                _logger.LogWarning(
                    "Azure pronunciation assessment returned an invalid response after {ElapsedMilliseconds} ms.",
                    stopwatch.ElapsedMilliseconds);
                throw new PronunciationProviderException("Azure Speech returned an invalid assessment response.");
            }

            _logger.LogInformation(
                "Azure pronunciation assessment completed after {ElapsedMilliseconds} ms.",
                stopwatch.ElapsedMilliseconds);
            double? completenessScore = null;
            if (TryReadScore(pronunciationAssessment, "CompletenessScore", out var parsedCompleteness))
            {
                completenessScore = parsedCompleteness;
            }

            if (!nBest[0].TryGetProperty("Words", out var wordsElement)
                || wordsElement.ValueKind != JsonValueKind.Array
                || wordsElement.GetArrayLength() == 0)
            {
                throw new PronunciationProviderException("Azure Speech returned no word assessment details.");
            }

            var words = new List<PronunciationWordAssessment>();
            foreach (var wordElement in wordsElement.EnumerateArray())
            {
                if (!wordElement.TryGetProperty("Word", out var wordText)
                    || wordText.ValueKind != JsonValueKind.String
                    || string.IsNullOrWhiteSpace(wordText.GetString())
                    || !wordElement.TryGetProperty("PronunciationAssessment", out var wordAssessment)
                    || !TryReadScore(wordAssessment, "AccuracyScore", out var wordScore))
                {
                    throw new PronunciationProviderException("Azure Speech returned invalid word assessment details.");
                }

                var errorType = wordAssessment.TryGetProperty("ErrorType", out var errorElement)
                    && errorElement.ValueKind == JsonValueKind.String
                    ? errorElement.GetString()
                    : null;
                var units = new List<PronunciationUnitAssessment>();
                if (wordElement.TryGetProperty("Syllables", out var syllables)
                    && syllables.ValueKind == JsonValueKind.Array)
                {
                    foreach (var syllable in syllables.EnumerateArray())
                    {
                        if (!syllable.TryGetProperty("Phonemes", out var phonemes)
                            || phonemes.ValueKind != JsonValueKind.Array) continue;
                        foreach (var phoneme in phonemes.EnumerateArray())
                        {
                            if (!TryReadUnit(phoneme, out var unit))
                            {
                                throw new PronunciationProviderException("Azure Speech returned invalid phoneme assessment details.");
                            }
                            units.Add(unit);
                        }
                    }
                }
                if (units.Count == 0 && wordElement.TryGetProperty("Phonemes", out var directPhonemes)
                    && directPhonemes.ValueKind == JsonValueKind.Array)
                {
                    foreach (var phoneme in directPhonemes.EnumerateArray())
                    {
                        if (!TryReadUnit(phoneme, out var unit))
                        {
                            throw new PronunciationProviderException("Azure Speech returned invalid phoneme assessment details.");
                        }
                        units.Add(unit);
                    }
                }

                words.Add(new PronunciationWordAssessment(wordText.GetString()!, wordScore, errorType, units));
            }

            return new PronunciationAssessment(accuracyScore, completenessScore, words);
        }
        catch (OperationCanceledException exception) when (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogWarning("Azure pronunciation assessment timed out after {ElapsedMilliseconds} ms.", stopwatch.ElapsedMilliseconds);
            throw new PronunciationProviderException("Azure Speech assessment timed out.", exception);
        }
        catch (HttpRequestException exception)
        {
            _logger.LogWarning("Azure pronunciation assessment transport failed after {ElapsedMilliseconds} ms.", stopwatch.ElapsedMilliseconds);
            throw new PronunciationProviderException("Azure Speech assessment failed.", exception);
        }
        catch (JsonException exception)
        {
            _logger.LogWarning("Azure pronunciation assessment JSON was invalid after {ElapsedMilliseconds} ms.", stopwatch.ElapsedMilliseconds);
            throw new PronunciationProviderException("Azure Speech returned an invalid assessment response.", exception);
        }
    }

    private static bool TryReadUnit(JsonElement element, out PronunciationUnitAssessment unit)
    {
        unit = default!;
        if (!element.TryGetProperty("Phoneme", out var phonemeText)
            || phonemeText.ValueKind != JsonValueKind.String
            || string.IsNullOrWhiteSpace(phonemeText.GetString())
            || !element.TryGetProperty("PronunciationAssessment", out var assessment)
            || !TryReadScore(assessment, "AccuracyScore", out var score))
        {
            return false;
        }
        unit = new PronunciationUnitAssessment(phonemeText.GetString()!, score);
        return true;
    }

    private static bool TryReadScore(JsonElement parent, string propertyName, out double score)
    {
        score = 0;
        return parent.TryGetProperty(propertyName, out var property)
            && property.TryGetDouble(out score)
            && double.IsFinite(score)
            && score is >= 0 and <= 100;
    }
}
