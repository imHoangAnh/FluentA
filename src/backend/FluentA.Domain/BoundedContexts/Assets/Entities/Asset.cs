using FluentA.Domain.BoundedContexts.Assets.Enums;
using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Assets.Entities;

public sealed class Asset : BaseEntity, IAggregateRoot
{
    private Asset()
    {
        ObjectKey = string.Empty;
        PublicUrl = string.Empty;
        ContentType = string.Empty;
    }

    private Asset(
        Guid? assetId,
        Guid userId,
        AssetType type,
        AssetStatus status,
        string objectKey,
        string publicUrl,
        string contentType,
        long sizeBytes,
        DateTime? expiresAtUtc,
        string? bucket,
        string? originalName)
    {
        if (assetId.HasValue && assetId.Value != Guid.Empty)
        {
            Id = assetId.Value;
        }

        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User id is required.", nameof(userId));
        }

        if (status == AssetStatus.PendingUpload && (!expiresAtUtc.HasValue || expiresAtUtc.Value == default))
        {
            throw new ArgumentException("Pending assets must have an expiry.", nameof(expiresAtUtc));
        }

        UserId = userId;
        Type = type;
        Status = status;
        ObjectKey = CleanObjectKey(objectKey);
        PublicUrl = CleanPublicUrl(publicUrl);
        ContentType = CleanContentType(contentType);
        SizeBytes = ValidateSizeBytes(sizeBytes);
        ExpiresAt = expiresAtUtc;
        Bucket = CleanOptionalBucket(bucket);
        OriginalName = CleanOptionalOriginalName(originalName);
    }

    public Guid UserId { get; private set; }
    public AssetType Type { get; private set; }
    public AssetStatus Status { get; private set; }
    public string ObjectKey { get; private set; }
    public string PublicUrl { get; private set; }
    public string ContentType { get; private set; }
    public long SizeBytes { get; private set; }
    public DateTime? ExpiresAt { get; private set; }
    public string? Bucket { get; private set; }
    public string? OriginalName { get; private set; }
    public DateTime? ArchivedAt { get; private set; }
    public DateTime? PurgeAfterAt { get; private set; }

    public static Asset CreatePending(
        Guid assetId,
        Guid userId,
        AssetType type,
        string objectKey,
        string publicUrl,
        string contentType,
        long sizeBytes,
        DateTime expiresAtUtc,
        string? bucket = null,
        string? originalName = null)
    {
        return new Asset(
            assetId,
            userId,
            type,
            AssetStatus.PendingUpload,
            objectKey,
            publicUrl,
            contentType,
            sizeBytes,
            expiresAtUtc,
            bucket,
            originalName);
    }

    public void FinalizeUpload(string publicUrl, string contentType, long sizeBytes)
    {
        if (Status != AssetStatus.PendingUpload)
        {
            throw new InvalidOperationException("Only pending assets can be finalized.");
        }

        PublicUrl = CleanPublicUrl(publicUrl);
        ContentType = CleanContentType(contentType);
        SizeBytes = ValidateSizeBytes(sizeBytes);
        Status = AssetStatus.Ready;
        ExpiresAt = null;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkExpired(DateTime nowUtc)
    {
        if (Status != AssetStatus.PendingUpload)
        {
            throw new InvalidOperationException("Only pending assets can expire.");
        }

        Status = AssetStatus.Failed;
        UpdatedAt = nowUtc;
    }

    public void MarkDeleted(DateTime nowUtc)
    {
        if (Status == AssetStatus.Deleted && DeletedAt is not null)
        {
            return;
        }

        Status = AssetStatus.Deleted;
        DeletedAt = nowUtc;
        UpdatedAt = nowUtc;
    }

    public void Archive(DateTime nowUtc, TimeSpan retention)
    {
        if (Status != AssetStatus.Ready)
        {
            throw new InvalidOperationException("Only ready assets can be archived.");
        }

        if (retention <= TimeSpan.Zero)
        {
            throw new ArgumentOutOfRangeException(nameof(retention));
        }

        Status = AssetStatus.Archived;
        ArchivedAt = nowUtc;
        PurgeAfterAt = nowUtc.Add(retention);
        UpdatedAt = nowUtc;
    }

    public void ClaimPurge(DateTime nowUtc)
    {
        if (Status != AssetStatus.Archived || !PurgeAfterAt.HasValue || PurgeAfterAt.Value > nowUtc)
        {
            throw new InvalidOperationException("Only due archived assets can be claimed for purge.");
        }

        Status = AssetStatus.PendingDeletion;
        UpdatedAt = nowUtc;
    }

    public void RequeuePurge(DateTime nowUtc)
    {
        if (Status != AssetStatus.PendingDeletion)
        {
            throw new InvalidOperationException("Only claimed assets can be requeued.");
        }

        Status = AssetStatus.Archived;
        UpdatedAt = nowUtc;
    }

    private static string CleanObjectKey(string objectKey)
    {
        var cleaned = objectKey.Trim();
        if (cleaned.Length is < 1 or > 1024)
        {
            throw new ArgumentException("Object key must be between 1 and 1024 characters.", nameof(objectKey));
        }

        return cleaned;
    }

    private static string CleanPublicUrl(string publicUrl)
    {
        var cleaned = publicUrl.Trim();
        if (cleaned.Length is < 1 or > 2048 || !Uri.TryCreate(cleaned, UriKind.Absolute, out _))
        {
            throw new ArgumentException("Public URL must be a valid absolute URL.", nameof(publicUrl));
        }

        return cleaned;
    }

    private static string CleanContentType(string contentType)
    {
        var cleaned = contentType.Trim();
        if (cleaned.Length is < 1 or > 255)
        {
            throw new ArgumentException("Content type must be between 1 and 255 characters.", nameof(contentType));
        }

        return cleaned;
    }

    private static string? CleanOptionalBucket(string? bucket)
    {
        if (string.IsNullOrWhiteSpace(bucket))
        {
            return null;
        }

        var cleaned = bucket.Trim();
        if (cleaned.Length > 255)
        {
            throw new ArgumentException("Bucket must be 255 characters or fewer.", nameof(bucket));
        }

        return cleaned;
    }

    private static string? CleanOptionalOriginalName(string? originalName)
    {
        if (string.IsNullOrWhiteSpace(originalName))
        {
            return null;
        }

        var fileName = Path.GetFileName(originalName.Trim().Replace('\\', '/'));
        if (fileName.Length is < 1 or > 255 || fileName.Contains('\0'))
        {
            throw new ArgumentException("Original name must be a safe file name of 255 characters or fewer.", nameof(originalName));
        }

        return fileName;
    }

    private static long ValidateSizeBytes(long sizeBytes)
    {
        return sizeBytes < 0
            ? throw new ArgumentOutOfRangeException(nameof(sizeBytes), "Size bytes must be zero or greater.")
            : sizeBytes;
    }
}
