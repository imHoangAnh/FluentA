using FluentA.Application.Common;

namespace FluentA.Application.BoundedContexts.Review;

public sealed record ReviewError(string Code, string Message, int StatusCode, object? Details = null) : IApplicationError
{
    public static ReviewError Validation(object details) =>
        new("VALIDATION_ERROR", "One or more validation errors occurred.", 422, details);

    public static ReviewError SessionNotFound() =>
        new("REVIEW_SESSION_NOT_FOUND", "The review session could not be found.", 404);

    public static ReviewError ItemNotFound() =>
        new("REVIEW_ITEM_NOT_FOUND", "The review item is not available in this session.", 404);

    public static ReviewError InvalidMode() =>
        new("REVIEW_MODE_MISMATCH", "This answer type does not match the assigned review mode.", 409);
}
