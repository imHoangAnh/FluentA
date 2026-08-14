namespace FluentA.Application.BoundedContexts.Trash;

public sealed record TrashError(string Code, string Message, int StatusCode) : IApplicationError
{
    public static TrashError NotFound() => new("TRASH_ENTRY_NOT_FOUND", "Trash item was not found.", 404);
    public static TrashError Validation() => new("TRASH_VALIDATION_FAILED", "The trash request is invalid.", 422);
}
