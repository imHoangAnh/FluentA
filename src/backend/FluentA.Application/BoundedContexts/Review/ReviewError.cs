namespace FluentA.Application.BoundedContexts.Review;

public sealed record ReviewError(string Code, string Message, int StatusCode, object? Details = null)
{
    public static ReviewError Validation(object details) =>
        new("VALIDATION_ERROR", "One or more validation errors occurred.", 422, details);

    public static ReviewError DeckOrCardNotFound() =>
        new("DECK_OR_CARD_NOT_FOUND", "The requested deck or card could not be found.", 404);
}
