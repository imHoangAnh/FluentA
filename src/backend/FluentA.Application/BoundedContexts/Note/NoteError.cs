namespace FluentA.Application.BoundedContexts.Note;

public sealed record NoteError(string Code, string Message, int StatusCode, object? Details = null) : IApplicationError
{
    public static NoteError Validation(object details) =>
        new("VALIDATION_ERROR", "The request did not pass validation.", 422, details);

    public static NoteError BoardNotFound() =>
        new("NOTE_BOARD_NOT_FOUND", "The requested note board could not be found.", 404);

    public static NoteError PageNotFound() =>
        new("NOTE_PAGE_NOT_FOUND", "The requested note page could not be found.", 404);
}
