namespace FluentA.Application.BoundedContexts.Assets;

public sealed record AssetError(string Code, string Message, int StatusCode, object? Details = null) : IApplicationError
{
    public static AssetError Validation(object details) =>
        new("VALIDATION_ERROR", "One or more validation errors occurred.", 422, details);

    public static AssetError NotFound() =>
        new("ASSET_NOT_FOUND", "The requested asset could not be found.", 404);

    public static AssetError PendingExpired() =>
        new("ASSET_UPLOAD_EXPIRED", "The pending asset upload has expired. Request a new upload URL.", 409);

    public static AssetError InvalidUploadedObject(string message) =>
        new("ASSET_UPLOAD_INVALID", message, 422);

    public static AssetError StorageUnavailable() =>
        new("ASSET_STORAGE_UNAVAILABLE", "Asset storage is unavailable.", 503);
}
