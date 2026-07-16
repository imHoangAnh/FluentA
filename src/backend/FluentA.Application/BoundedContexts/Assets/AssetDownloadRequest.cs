namespace FluentA.Application.BoundedContexts.Assets;

public sealed record AssetDownloadRequest(string ObjectKey, TimeSpan Lifetime);
