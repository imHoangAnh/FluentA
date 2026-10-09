namespace FluentA.Application.BoundedContexts.Pronunciation;

public interface IPronunciationAssessmentProvider
{
    Task<PronunciationAssessment> AssessAsync(
        string referenceText,
        string locale,
        ReadOnlyMemory<byte> wavAudio,
        CancellationToken cancellationToken = default);
}

public sealed record PronunciationAssessment(
    double AccuracyScore,
    double? CompletenessScore,
    IReadOnlyList<PronunciationWordAssessment> Words);

public sealed record PronunciationWordAssessment(
    string Text,
    double AccuracyScore,
    string? ErrorType,
    IReadOnlyList<PronunciationUnitAssessment> Units,
    IReadOnlyList<PronunciationSyllableAssessment>? Syllables = null);

public sealed record PronunciationSyllableAssessment(
    string Text,
    double AccuracyScore,
    IReadOnlyList<PronunciationUnitAssessment> Phonemes);

public sealed record PronunciationUnitAssessment(
    string Text,
    double AccuracyScore,
    long? Offset = null,
    long? Duration = null);

public enum PronunciationNotRecognizedReason
{
    NoMatch,
    InitialSilenceTimeout,
    BabbleTimeout,
}

public sealed class PronunciationNotRecognizedException : Exception
{
    public PronunciationNotRecognizedException(PronunciationNotRecognizedReason reason)
        : base($"Azure Speech did not recognize assessable speech: {reason}.")
    {
        Reason = reason;
    }

    public PronunciationNotRecognizedReason Reason { get; }
}

public sealed class PronunciationProviderException : Exception
{
    public PronunciationProviderException(string message)
        : base(message)
    {
    }

    public PronunciationProviderException(string message, Exception innerException)
        : base(message, innerException)
    {
    }
}
