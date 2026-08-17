namespace FluentA.Application.BoundedContexts.Flashcards;

public sealed record FlashcardError(string Code, string Message, int StatusCode, object? Details = null) : IApplicationError
{
    public static FlashcardError Validation(object details) =>
        new("VALIDATION_ERROR", "One or more validation errors occurred.", 422, details);

    public static FlashcardError DeckOrCardNotFound() =>
        new("DECK_OR_CARD_NOT_FOUND", "The requested deck or card could not be found.", 404);
}
