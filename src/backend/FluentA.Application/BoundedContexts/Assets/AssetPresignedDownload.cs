namespace FluentA.Application.BoundedContexts.Assets;

public sealed record AssetPresignedDownload(string Url, DateTime ExpiresAtUtc);
