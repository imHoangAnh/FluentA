namespace FluentA.Application.BoundedContexts.Pronunciation;

public interface IPronunciationAssessmentProvider
{
    Task<double> AssessAsync(
        string referenceText,
        string locale,
        ReadOnlyMemory<byte> wavAudio,
        CancellationToken cancellationToken = default);
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
