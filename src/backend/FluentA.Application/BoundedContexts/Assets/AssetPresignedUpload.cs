namespace FluentA.Application.BoundedContexts.Assets;

public sealed record AssetPresignedUpload(
    string Url,
    DateTime ExpiresAtUtc);
