using System.Diagnostics;
using System.Globalization;
using System.Net.Http.Headers;
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

        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(_options.TimeoutSeconds));
        var stopwatch = Stopwatch.StartNew();

        try
        {
            for (var providerAttempt = 1; providerAttempt <= 2; providerAttempt++)
            {
                try
                {
                    return await AssessOnceAsync(
                        endpoint,
                        assessmentSettings,
                        wavAudio,
                        stopwatch,
                        timeout.Token);
                }
                catch (InvalidAssessmentResponseException exception) when (providerAttempt == 1)
                {
                    _logger.LogWarning(
                        "Azure pronunciation assessment returned an incomplete successful response on provider attempt {ProviderAttempt}; retrying once. Reason: {Reason}",
                        providerAttempt,
                        exception.Message);
                }
                catch (InvalidAssessmentResponseException exception)
                {
                    throw new PronunciationProviderException(
                        "Azure Speech returned an invalid assessment response after retry.",
                        exception);
                }
            }

            throw new PronunciationProviderException("Azure Speech assessment did not complete.");
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

    private async Task<PronunciationAssessment> AssessOnceAsync(
        Uri endpoint,
        string assessmentSettings,
        ReadOnlyMemory<byte> wavAudio,
        Stopwatch stopwatch,
        CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, endpoint);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        request.Headers.TryAddWithoutValidation("Ocp-Apim-Subscription-Key", _options.SubscriptionKey);
        request.Headers.TryAddWithoutValidation(
            "Pronunciation-Assessment",
            Convert.ToBase64String(Encoding.UTF8.GetBytes(assessmentSettings)));
        request.Content = new ReadOnlyMemoryContent(wavAudio);
        request.Content.Headers.TryAddWithoutValidation(
            "Content-Type",
            "audio/wav; codecs=audio/pcm; samplerate=16000");

        using var response = await _httpClient.SendAsync(
            request,
            HttpCompletionOption.ResponseHeadersRead,
            cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning(
                "Azure pronunciation assessment returned status {StatusCode} after {ElapsedMilliseconds} ms.",
                (int)response.StatusCode,
                stopwatch.ElapsedMilliseconds);
            throw new PronunciationProviderException(
                $"Azure Speech returned HTTP {((int)response.StatusCode).ToString(CultureInfo.InvariantCulture)}.");
        }

        await using var responseStream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var payload = await JsonDocument.ParseAsync(responseStream, cancellationToken: cancellationToken);
        EnsureRecognitionSucceeded(payload.RootElement, stopwatch.ElapsedMilliseconds);
        if (!payload.RootElement.TryGetProperty("NBest", out var nBest)
            || nBest.ValueKind != JsonValueKind.Array
            || nBest.GetArrayLength() == 0)
        {
            throw new InvalidAssessmentResponseException(
                $"NBest was missing or empty; root keys: {GetPropertyNames(payload.RootElement)}.");
        }

        var candidate = nBest[0];
        var pronunciationAssessment = GetAssessmentElement(candidate);
        if (!TryReadScore(pronunciationAssessment, "AccuracyScore", out var accuracyScore))
        {
            throw new InvalidAssessmentResponseException(
                $"full-text AccuracyScore was missing; candidate keys: {GetPropertyNames(candidate)}; assessment keys: {GetPropertyNames(pronunciationAssessment)}; NBest count: {nBest.GetArrayLength().ToString(CultureInfo.InvariantCulture)}.");
        }

        double? completenessScore = null;
        if (TryReadScore(pronunciationAssessment, "CompletenessScore", out var parsedCompleteness))
        {
            completenessScore = parsedCompleteness;
        }

        if (!candidate.TryGetProperty("Words", out var wordsElement)
            || wordsElement.ValueKind != JsonValueKind.Array
            || wordsElement.GetArrayLength() == 0)
        {
            throw new InvalidAssessmentResponseException("word assessment details were missing.");
        }

        var words = new List<PronunciationWordAssessment>();
        foreach (var wordElement in wordsElement.EnumerateArray())
        {
            if (!wordElement.TryGetProperty("Word", out var wordText)
                || wordText.ValueKind != JsonValueKind.String
                || string.IsNullOrWhiteSpace(wordText.GetString()))
            {
                throw new InvalidAssessmentResponseException("a word assessment had no word text.");
            }

            var wordAssessment = GetAssessmentElement(wordElement);
            if (!TryReadScore(wordAssessment, "AccuracyScore", out var wordScore))
            {
                throw new InvalidAssessmentResponseException("a word assessment had no AccuracyScore.");
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
                            throw new InvalidAssessmentResponseException("a phoneme assessment was invalid.");
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
                        throw new InvalidAssessmentResponseException("a phoneme assessment was invalid.");
                    }
                    units.Add(unit);
                }
            }

            words.Add(new PronunciationWordAssessment(wordText.GetString()!, wordScore, errorType, units));
        }

        _logger.LogInformation(
            "Azure pronunciation assessment completed after {ElapsedMilliseconds} ms.",
            stopwatch.ElapsedMilliseconds);
        return new PronunciationAssessment(accuracyScore, completenessScore, words);
    }

    private static bool TryReadUnit(JsonElement element, out PronunciationUnitAssessment unit)
    {
        unit = default!;
        if (!element.TryGetProperty("Phoneme", out var phonemeText)
            || phonemeText.ValueKind != JsonValueKind.String
            || string.IsNullOrWhiteSpace(phonemeText.GetString()))
        {
            return false;
        }

        var assessment = GetAssessmentElement(element);
        if (!TryReadScore(assessment, "AccuracyScore", out var score))
        {
            return false;
        }

        unit = new PronunciationUnitAssessment(phonemeText.GetString()!, score);
        return true;
    }

    private void EnsureRecognitionSucceeded(JsonElement root, long elapsedMilliseconds)
    {
        if (!root.TryGetProperty("RecognitionStatus", out var statusElement))
        {
            throw new PronunciationProviderException("Azure Speech returned no recognition status.");
        }

        if (statusElement.ValueKind == JsonValueKind.Number
            && statusElement.TryGetInt32(out var numericStatus)
            && numericStatus == 0)
        {
            return;
        }

        if (statusElement.ValueKind != JsonValueKind.String)
        {
            throw new PronunciationProviderException("Azure Speech returned an invalid recognition status.");
        }

        var status = statusElement.GetString();
        if (string.Equals(status, "Success", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        if (Enum.TryParse<PronunciationNotRecognizedReason>(status, ignoreCase: true, out var reason))
        {
            _logger.LogInformation(
                "Azure pronunciation assessment did not recognize assessable speech ({RecognitionStatus}) after {ElapsedMilliseconds} ms.",
                reason,
                elapsedMilliseconds);
            throw new PronunciationNotRecognizedException(reason);
        }

        throw new PronunciationProviderException("Azure Speech returned an unsuccessful recognition status.");
    }

    private static JsonElement GetAssessmentElement(JsonElement element) =>
        element.TryGetProperty("PronunciationAssessment", out var nested)
        && nested.ValueKind == JsonValueKind.Object
            ? nested
            : element;

    private static string GetPropertyNames(JsonElement element) =>
        element.ValueKind == JsonValueKind.Object
            ? string.Join(',', element.EnumerateObject().Select(property => property.Name))
            : $"<{element.ValueKind}>";

    private static bool TryReadScore(JsonElement parent, string propertyName, out double score)
    {
        score = 0;
        return parent.TryGetProperty(propertyName, out var property)
            && property.TryGetDouble(out score)
            && double.IsFinite(score)
            && score is >= 0 and <= 100;
    }

    private sealed class InvalidAssessmentResponseException : Exception
    {
        public InvalidAssessmentResponseException(string message)
            : base(message)
        {
        }
    }
}
