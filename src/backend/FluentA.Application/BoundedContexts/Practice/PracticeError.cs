namespace FluentA.Application.BoundedContexts.Practice;

public sealed record PracticeError(string Code, string Message, int StatusCode, object? Details = null)
{
    public static PracticeError Validation(object details) =>
        new("VALIDATION_ERROR", "One or more validation errors occurred.", 422, details);

    public static PracticeError DeckOrCardNotFound() =>
        new("DECK_OR_CARD_NOT_FOUND", "The requested deck or card could not be found.", 404);
}
