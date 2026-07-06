namespace FluentA.Application.BoundedContexts.Assets;

public sealed record AssetObjectMetadata(
    string ObjectKey,
    long SizeBytes,
    string ContentType,
    string? ETag);
