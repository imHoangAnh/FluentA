namespace FluentA.Application.BoundedContexts.Assets;

public sealed record AssetUploadRequest(
    string ObjectKey,
    string ContentType,
    TimeSpan Lifetime);
