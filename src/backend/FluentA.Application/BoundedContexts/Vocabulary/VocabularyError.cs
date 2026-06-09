namespace FluentA.Application.BoundedContexts.Vocabulary;

public sealed record VocabularyError(string Code, string Message, int StatusCode, object? Details = null)
{
    public static VocabularyError Validation(object details) =>
        new("VALIDATION_ERROR", "One or more validation errors occurred.", 422, details);

    public static VocabularyError NotFound() =>
        new("VOCAB_NOT_FOUND", "The requested board or page could not be found.", 404);
}
