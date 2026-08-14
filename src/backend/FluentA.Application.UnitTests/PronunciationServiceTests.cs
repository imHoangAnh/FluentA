using System.Buffers.Binary;
using System.Net;
using System.Text;
using FluentA.Application.BoundedContexts.Pronunciation;
using FluentA.Application.BoundedContexts.Pronunciation.DTOs;
using FluentA.Infrastructure.Pronunciation;
using Microsoft.Extensions.Logging.Abstractions;

namespace FluentA.Application.UnitTests;

public sealed class PronunciationServiceTests
{
    [Fact]
    public void AudioValidator_AcceptsRequiredPcmWavAndRejectsWrongChannels()
    {
        var valid = CreatePcmWav(durationMilliseconds: 500);
        var stereo = valid.ToArray();
        BinaryPrimitives.WriteUInt16LittleEndian(stereo.AsSpan(22, 2), 2);

        Assert.True(PronunciationAudioValidator.IsValidPcmWav(valid));
        Assert.False(PronunciationAudioValidator.IsValidPcmWav(stereo));
    }

    [Theory]
    [InlineData(79.99, false)]
    [InlineData(80, true)]
    public async Task Service_ClassifiesOnlyAtConfiguredAccuracyThreshold(double score, bool expectedCorrect)
    {
        var repository = new StubWordRepository(new PronunciationTarget("go", "en"));
        var provider = new StubProvider(new PronunciationAssessment(
            score,
            100,
            [new PronunciationWordAssessment("go", score, "None", [new PronunciationUnitAssessment("go", score)])]));
        var service = new PronunciationService(repository, provider, EnabledOptions());

        var result = await service.AssessAsync(Guid.NewGuid(), Guid.NewGuid(), CreatePcmWav(500));

        Assert.True(result.IsSuccess);
        Assert.Equal(expectedCorrect, result.Value!.Correct);
        Assert.Equal("go", provider.ReferenceText);
        Assert.Equal("en-US", provider.Locale);
    }

    [Theory]
    [InlineData(80, 90, 70, "None", true)]
    [InlineData(79.99, 100, 95, "None", false)]
    [InlineData(86, 89.99, 95, "None", false)]
    [InlineData(86, 100, 69.99, "None", false)]
    [InlineData(86, 100, 95, "Omission", false)]
    [InlineData(86, 100, 95, "Insertion", false)]
    public async Task Service_AppliesPhraseAccuracyCompletenessWordAndMiscueRules(
        double accuracy,
        double completeness,
        double weakWordScore,
        string errorType,
        bool expectedCorrect)
    {
        var words = new[]
        {
            new PronunciationWordAssessment("take", 95, "None", []),
            new PronunciationWordAssessment("care", weakWordScore, errorType, []),
            new PronunciationWordAssessment("of", 95, "None", []),
        };
        var service = new PronunciationService(
            new StubWordRepository(new PronunciationTarget("take care of", "en")),
            new StubProvider(new PronunciationAssessment(accuracy, completeness, words)),
            EnabledOptions());

        var result = await service.AssessAsync(Guid.NewGuid(), Guid.NewGuid(), CreatePcmWav(500));

        Assert.True(result.IsSuccess);
        Assert.Equal(expectedCorrect, result.Value!.Correct);
    }

    [Fact]
    public async Task Service_MapsProviderFailureWithoutExposingScoreOrConsumingClientAttempt()
    {
        var service = new PronunciationService(
            new StubWordRepository(new PronunciationTarget("go", "en")),
            new StubProvider(new PronunciationProviderException("quota")),
            EnabledOptions());

        var result = await service.AssessAsync(Guid.NewGuid(), Guid.NewGuid(), CreatePcmWav(500));

        var error = Assert.IsType<PronunciationError>(result.Error);
        Assert.Equal(503, error.StatusCode);
        Assert.Equal("PRONUNCIATION_UNAVAILABLE", error.Code);
    }

    [Fact]
    public async Task Service_MapsUnrecognizedSpeechToRetryableClientError()
    {
        var service = new PronunciationService(
            new StubWordRepository(new PronunciationTarget("go", "en")),
            new StubProvider(new PronunciationNotRecognizedException(PronunciationNotRecognizedReason.NoMatch)),
            EnabledOptions());

        var result = await service.AssessAsync(Guid.NewGuid(), Guid.NewGuid(), CreatePcmWav(500));

        var error = Assert.IsType<PronunciationError>(result.Error);
        Assert.Equal(422, error.StatusCode);
        Assert.Equal("PRONUNCIATION_NOT_RECOGNIZED", error.Code);
    }

    [Fact]
    public async Task Service_RejectsForeignWordBeforeCallingProvider()
    {
        var provider = new StubProvider(new PronunciationAssessment(100, 100, []));
        var service = new PronunciationService(new StubWordRepository(null), provider, EnabledOptions());

        var result = await service.AssessAsync(Guid.NewGuid(), Guid.NewGuid(), CreatePcmWav(500));

        Assert.Equal(404, Assert.IsType<PronunciationError>(result.Error).StatusCode);
        Assert.Null(provider.ReferenceText);
    }

    [Fact]
    public async Task AzureProvider_SendsServerOwnedAssessmentContractAndReadsFlatRestResponse()
    {
        var handler = new RecordingHandler(
            """
            {"RecognitionStatus":"Success","NBest":[{"AccuracyScore":82.5,"CompletenessScore":100,"Words":[{"Word":"go","AccuracyScore":82.5,"ErrorType":"None","Phonemes":[{"Phoneme":"ɡ","AccuracyScore":90},{"Phoneme":"oʊ","AccuracyScore":80}]}]}]}
            """);
        var provider = new AzurePronunciationAssessmentProvider(
            new HttpClient(handler),
            EnabledOptions(),
            NullLogger<AzurePronunciationAssessmentProvider>.Instance);
        var audio = CreatePcmWav(500);

        var assessment = await provider.AssessAsync("go", "en-US", audio);

        Assert.Equal(82.5, assessment.AccuracyScore);
        Assert.Equal("go", assessment.Words[0].Text);
        Assert.Equal("oʊ", assessment.Words[0].Units[1].Text);
        Assert.Equal("centralus.stt.speech.microsoft.com", handler.Host);
        Assert.Equal("test-key", handler.SubscriptionKey);
        Assert.Equal("application/json", handler.Accept);
        Assert.Equal("audio/wav; codecs=audio/pcm; samplerate=16000", handler.ContentType);
        Assert.Equal(audio, handler.Body);
        Assert.Contains("\"ReferenceText\":\"go\"", handler.AssessmentJson, StringComparison.Ordinal);
        Assert.Contains("\"EnableProsodyAssessment\":false", handler.AssessmentJson, StringComparison.Ordinal);
        Assert.Contains("\"Granularity\":\"Phoneme\"", handler.AssessmentJson, StringComparison.Ordinal);
        Assert.Contains("\"Dimension\":\"Comprehensive\"", handler.AssessmentJson, StringComparison.Ordinal);
        Assert.Contains("\"EnableMiscue\":true", handler.AssessmentJson, StringComparison.Ordinal);
    }

    [Fact]
    public async Task AzureProvider_RetainsNestedAssessmentCompatibility()
    {
        var handler = new RecordingHandler(
            """
            {"RecognitionStatus":0,"NBest":[{"PronunciationAssessment":{"AccuracyScore":82.5,"CompletenessScore":100},"Words":[{"Word":"go","PronunciationAssessment":{"AccuracyScore":82.5,"ErrorType":"None"},"Syllables":[{"Phonemes":[{"Phoneme":"ɡ","PronunciationAssessment":{"AccuracyScore":90}},{"Phoneme":"oʊ","PronunciationAssessment":{"AccuracyScore":80}}]}]}]}]}
            """);
        var provider = new AzurePronunciationAssessmentProvider(
            new HttpClient(handler),
            EnabledOptions(),
            NullLogger<AzurePronunciationAssessmentProvider>.Instance);

        var assessment = await provider.AssessAsync("go", "en-US", CreatePcmWav(500));

        Assert.Equal(82.5, assessment.AccuracyScore);
        Assert.Equal("oʊ", assessment.Words[0].Units[1].Text);
    }

    [Theory]
    [InlineData("NoMatch", PronunciationNotRecognizedReason.NoMatch)]
    [InlineData("InitialSilenceTimeout", PronunciationNotRecognizedReason.InitialSilenceTimeout)]
    [InlineData("BabbleTimeout", PronunciationNotRecognizedReason.BabbleTimeout)]
    public async Task AzureProvider_MapsUnrecognizedSpeechWithoutTreatingItAsProviderFailure(
        string recognitionStatus,
        PronunciationNotRecognizedReason expectedReason)
    {
        var handler = new RecordingHandler($$"""
            {"RecognitionStatus":"{{recognitionStatus}}"}
            """);
        var provider = new AzurePronunciationAssessmentProvider(
            new HttpClient(handler),
            EnabledOptions(),
            NullLogger<AzurePronunciationAssessmentProvider>.Instance);

        var exception = await Assert.ThrowsAsync<PronunciationNotRecognizedException>(
            () => provider.AssessAsync("go", "en-US", CreatePcmWav(500)));

        Assert.Equal(expectedReason, exception.Reason);
    }

    private static PronunciationAssessmentOptions EnabledOptions() =>
        new(true, "centralus", "test-key", 10, 80, 90, 70);

    private static byte[] CreatePcmWav(int durationMilliseconds)
    {
        const int sampleRate = 16_000;
        const short channels = 1;
        const short bitsPerSample = 16;
        var dataLength = sampleRate * channels * (bitsPerSample / 8) * durationMilliseconds / 1000;
        var wav = new byte[44 + dataLength];
        Encoding.ASCII.GetBytes("RIFF").CopyTo(wav, 0);
        BinaryPrimitives.WriteInt32LittleEndian(wav.AsSpan(4, 4), wav.Length - 8);
        Encoding.ASCII.GetBytes("WAVEfmt ").CopyTo(wav, 8);
        BinaryPrimitives.WriteInt32LittleEndian(wav.AsSpan(16, 4), 16);
        BinaryPrimitives.WriteInt16LittleEndian(wav.AsSpan(20, 2), 1);
        BinaryPrimitives.WriteInt16LittleEndian(wav.AsSpan(22, 2), channels);
        BinaryPrimitives.WriteInt32LittleEndian(wav.AsSpan(24, 4), sampleRate);
        BinaryPrimitives.WriteInt32LittleEndian(wav.AsSpan(28, 4), sampleRate * channels * (bitsPerSample / 8));
        BinaryPrimitives.WriteInt16LittleEndian(wav.AsSpan(32, 2), (short)(channels * (bitsPerSample / 8)));
        BinaryPrimitives.WriteInt16LittleEndian(wav.AsSpan(34, 2), bitsPerSample);
        Encoding.ASCII.GetBytes("data").CopyTo(wav, 36);
        BinaryPrimitives.WriteInt32LittleEndian(wav.AsSpan(40, 4), dataLength);
        return wav;
    }

    private sealed class StubWordRepository(PronunciationTarget? target) : IPronunciationWordRepository
    {
        public Task<PronunciationTarget?> FindOwnedWordAsync(Guid userId, Guid wordId, CancellationToken cancellationToken = default) =>
            Task.FromResult(target);
    }

    private sealed class StubProvider : IPronunciationAssessmentProvider
    {
        private readonly PronunciationAssessment? _assessment;
        private readonly Exception? _exception;

        public StubProvider(PronunciationAssessment assessment)
        {
            _assessment = assessment;
        }

        public StubProvider(Exception exception)
        {
            _exception = exception;
        }

        public string? ReferenceText { get; private set; }
        public string? Locale { get; private set; }

        public Task<PronunciationAssessment> AssessAsync(string referenceText, string locale, ReadOnlyMemory<byte> wavAudio, CancellationToken cancellationToken = default)
        {
            ReferenceText = referenceText;
            Locale = locale;
            if (_exception is not null)
            {
                throw _exception;
            }

            return Task.FromResult(_assessment!);
        }
    }

    private sealed class RecordingHandler(string responseJson) : HttpMessageHandler
    {
        public string? Host { get; private set; }
        public string? SubscriptionKey { get; private set; }
        public string? ContentType { get; private set; }
        public string? Accept { get; private set; }
        public byte[]? Body { get; private set; }
        public string? AssessmentJson { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Host = request.RequestUri?.Host;
            SubscriptionKey = request.Headers.GetValues("Ocp-Apim-Subscription-Key").Single();
            ContentType = request.Content?.Headers.GetValues("Content-Type").Single();
            Accept = request.Headers.Accept.Single().MediaType;
            Body = request.Content is null ? null : await request.Content.ReadAsByteArrayAsync(cancellationToken);
            var encodedAssessment = request.Headers.GetValues("Pronunciation-Assessment").Single();
            AssessmentJson = Encoding.UTF8.GetString(Convert.FromBase64String(encodedAssessment));

            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(responseJson, Encoding.UTF8, "application/json"),
            };
        }
    }
}
