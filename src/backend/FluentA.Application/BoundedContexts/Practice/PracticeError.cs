namespace FluentA.Application.BoundedContexts.Practice;

public sealed record PracticeError(string Code, string Message, int StatusCode, object? Details = null) : IApplicationError
{
    public static PracticeError Validation(object details) =>
        new("VALIDATION_ERROR", "One or more validation errors occurred.", 422, details);

    public static PracticeError DeckOrCardNotFound() =>
        new("DECK_OR_CARD_NOT_FOUND", "The requested deck or card could not be found.", 404);

    public static PracticeError EmptyDeck() =>
        new("PRACTICE_DECK_EMPTY", "This deck has no active words to practice.", 422);

    public static PracticeError Conflict() =>
        new("PRACTICE_SESSION_CONFLICT", "The practice session is not at the requested item or step.", 409);

    public static PracticeError PronunciationUnavailable() =>
        new("PRONUNCIATION_UNAVAILABLE", "Pronunciation assessment is temporarily unavailable.", 503);
}
