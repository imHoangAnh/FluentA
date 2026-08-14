namespace FluentA.Application.BoundedContexts.Journal;

public sealed record JournalError(string Code, string Message, int StatusCode, object? Details = null) : IApplicationError
{
    public static JournalError Validation(object details) =>
        new("VALIDATION_ERROR", "One or more validation errors occurred.", 422, details);

    public static JournalError NotFound() =>
        new("JOURNAL_NOT_FOUND", "The requested journal entry could not be found.", 404);
}
