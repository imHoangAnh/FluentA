namespace FluentA.Application.BoundedContexts.Countdown;

public sealed record CountdownError(string Code, string Message, int StatusCode, object? Details = null) : IApplicationError
{
    public static CountdownError Validation(object details) =>
        new("VALIDATION_ERROR", "One or more validation errors occurred.", 422, details);

    public static CountdownError NotFound() =>
        new("COUNTDOWN_NOT_FOUND", "The requested countdown could not be found.", 404);

    public static CountdownError CoverAssetInvalid() =>
        new("COUNTDOWN_COVER_ASSET_INVALID", "The selected cover asset must be an owned finalized countdown-cover upload.", 409);
}
