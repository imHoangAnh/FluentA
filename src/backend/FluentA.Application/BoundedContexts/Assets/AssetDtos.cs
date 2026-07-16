namespace FluentA.Application.BoundedContexts.Assets;

public sealed record PresignAssetRequest(
    string? AssetType = null,
    string? ContentType = null,
    string? OriginalName = null,
    long? SizeBytes = null);

public sealed record ListAssetsRequest(
    string? AssetType = null);

public sealed record FinalizeAssetRequest(Guid AssetId);

public sealed record AssetDto(
    Guid Id,
    string AssetType,
    string Status,
    string PublicUrl,
    string ContentType,
    long SizeBytes,
    DateTime? ExpiresAtUtc,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc);

public sealed record OwnedAssetDto(
    Guid Id,
    string AssetType,
    string Status,
    string ContentType,
    long SizeBytes,
    DateTime? ExpiresAtUtc,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc,
    bool IsCurrentAvatar,
    string? DownloadUrl = null,
    DateTime? DownloadUrlExpiresAtUtc = null);

public sealed record PresignedAssetUploadDto(
    AssetDto Asset,
    string UploadUrl,
    DateTime ExpiresAtUtc,
    string Method = "PUT");
