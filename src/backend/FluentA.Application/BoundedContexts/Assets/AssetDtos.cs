namespace FluentA.Application.BoundedContexts.Assets;

public sealed record PresignAssetRequest(
    string? AssetType = null,
    string? ContentType = null,
    string? OriginalName = null,
    long? SizeBytes = null);

public sealed record FinalizeAssetRequest(Guid AssetId);

public sealed record AssetPurgeResult(int Claimed, int Deleted, int Failed);

public sealed record AssetDto(
    Guid Id,
    string AssetType,
    string Status,
    string ContentType,
    long SizeBytes,
    DateTime? ExpiresAtUtc,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc);

public sealed record PresignedAssetUploadDto(
    AssetDto Asset,
    string UploadUrl,
    DateTime ExpiresAtUtc,
    string Method = "PUT");
