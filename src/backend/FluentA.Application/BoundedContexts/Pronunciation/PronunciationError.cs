namespace FluentA.Application.BoundedContexts.Pronunciation;

public sealed record PronunciationError(string Code, string Message, int StatusCode) : IApplicationError
{
    public static PronunciationError InvalidAudio() =>
        new("INVALID_PRONUNCIATION_AUDIO", "The pronunciation audio must be 16-kHz, 16-bit, mono PCM WAV and no longer than 10 seconds.", 400);

    public static PronunciationError WordNotFound() =>
        new("PRONUNCIATION_WORD_NOT_FOUND", "The requested word could not be found.", 404);

    public static PronunciationError NotRecognized() =>
        new("PRONUNCIATION_NOT_RECOGNIZED", "No speech was recognized. Try recording again; this did not use an attempt.", 422);

    public static PronunciationError ProviderUnavailable() =>
        new("PRONUNCIATION_UNAVAILABLE", "Pronunciation assessment is temporarily unavailable. Try again without losing an attempt.", 503);
}
