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

    public async Task<double> AssessAsync(
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
            Granularity = "FullText",
            Dimension = "Basic",
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
                || !nBest[0].TryGetProperty("AccuracyScore", out var accuracyScore)
                || !accuracyScore.TryGetDouble(out var score)
                || score is < 0 or > 100)
            {
                _logger.LogWarning(
                    "Azure pronunciation assessment returned an invalid response after {ElapsedMilliseconds} ms.",
                    stopwatch.ElapsedMilliseconds);
                throw new PronunciationProviderException("Azure Speech returned an invalid assessment response.");
            }

            _logger.LogInformation(
                "Azure pronunciation assessment completed after {ElapsedMilliseconds} ms.",
                stopwatch.ElapsedMilliseconds);
            return score;
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
}
