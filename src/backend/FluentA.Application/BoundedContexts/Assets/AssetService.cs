using FluentA.Application.Common;
using FluentA.Domain.BoundedContexts.Assets.Entities;
using FluentA.Domain.BoundedContexts.Assets.Enums;
using FluentA.Application.BoundedContexts.Auth;

namespace FluentA.Application.BoundedContexts.Assets;

public sealed class AssetService : IAssetService
{
    private static readonly TimeSpan PendingLifetime = TimeSpan.FromHours(1);
    private static readonly HashSet<string> AllowedImageMimeTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg",
        "image/png",
        "image/webp"
    };

    private readonly IAssetRepository _assets;
    private readonly IAssetObjectStorage _storage;
    private readonly IUserRepository _users;

    public AssetService(IAssetRepository assets, IAssetObjectStorage storage, IUserRepository users)
    {
        _assets = assets;
        _storage = storage;
        _users = users;
    }

    public async Task<OperationResult<IReadOnlyList<OwnedAssetDto>>> ListAsync(Guid userId, ListAssetsRequest request, CancellationToken cancellationToken = default)
    {
        var errors = ValidateAssetTypeRequest(request.AssetType);
        if (errors.Count > 0)
        {
            return OperationResult<IReadOnlyList<OwnedAssetDto>>.Failure(AssetError.Validation(errors));
        }

        var assets = await _assets.ListOwnedAsync(userId, cancellationToken);
        var user = await _users.GetByIdAsync(userId, cancellationToken);
        var currentAvatarAssetId = user?.CurrentAvatarAssetId;

        var requestedType = ParseAssetType(request.AssetType ?? "avatar");
        var result = new List<OwnedAssetDto>();
        foreach (var asset in assets.Where(asset => asset.Type == requestedType))
        {
            AssetPresignedDownload? download = null;
            if (asset.Type == AssetType.Avatar && asset.Status == AssetStatus.Ready)
            {
                try
                {
                    download = _storage.CreatePresignedDownload(new AssetDownloadRequest(asset.ObjectKey, TimeSpan.FromMinutes(5)));
                }
                catch (AssetStorageUnavailableException)
                {
                    // A missing storage provider must not leak a durable URL.
                }
            }

            result.Add(ToOwnedDto(asset, currentAvatarAssetId, download));
        }

        return OperationResult<IReadOnlyList<OwnedAssetDto>>.Success(result);
    }

    public async Task<OperationResult<PresignedAssetUploadDto>> PresignAsync(Guid userId, PresignAssetRequest request, CancellationToken cancellationToken = default)
    {
        var errors = ValidatePresignRequest(request);
        if (errors.Count > 0)
        {
            return OperationResult<PresignedAssetUploadDto>.Failure(AssetError.Validation(errors));
        }

        var assetId = Guid.NewGuid();
        var type = ParseAssetType(request.AssetType!);
        var objectKey = BuildObjectKey(userId, type, assetId, request.ContentType!);
        var uploadRequest = new AssetUploadRequest(objectKey, request.ContentType!, PendingLifetime);

        AssetPresignedUpload upload;
        try
        {
            upload = _storage.CreatePresignedUpload(uploadRequest);
        }
        catch (AssetStorageUnavailableException)
        {
            return OperationResult<PresignedAssetUploadDto>.Failure(AssetError.StorageUnavailable());
        }

        var asset = Asset.CreatePending(
            assetId,
            userId,
            type,
            objectKey,
            _storage.GetPublicUrl(objectKey),
            request.ContentType!,
            0,
            upload.ExpiresAtUtc,
            upload.Bucket,
            request.OriginalName);
        await _assets.AddAsync(asset, cancellationToken);

        return OperationResult<PresignedAssetUploadDto>.Success(new PresignedAssetUploadDto(
            ToDto(asset),
            upload.Url,
            upload.ExpiresAtUtc));
    }

    public async Task<OperationResult<AssetDto>> FinalizeAsync(Guid userId, FinalizeAssetRequest request, CancellationToken cancellationToken = default)
    {
        if (request.AssetId == Guid.Empty)
        {
            return OperationResult<AssetDto>.Failure(AssetError.Validation(new Dictionary<string, string[]>
            {
                ["assetId"] = ["Asset id is required."]
            }));
        }

        var asset = await _assets.GetOwnedAsync(userId, request.AssetId, cancellationToken);
        if (asset is null)
        {
            return OperationResult<AssetDto>.Failure(AssetError.NotFound());
        }

        if (asset.Status != AssetStatus.PendingUpload)
        {
            return OperationResult<AssetDto>.Failure(AssetError.InvalidUploadedObject("Only pending assets can be finalized."));
        }

        if (asset.ExpiresAt.HasValue && asset.ExpiresAt.Value <= DateTime.UtcNow)
        {
            asset.MarkExpired(DateTime.UtcNow);
            await _assets.UpdateAsync(asset, cancellationToken);
            return OperationResult<AssetDto>.Failure(AssetError.PendingExpired());
        }

        AssetObjectMetadata? metadata;
        byte[]? objectPrefix;
        try
        {
            metadata = await _storage.GetObjectMetadataAsync(asset.ObjectKey, cancellationToken);
            objectPrefix = metadata is null
                ? null
                : await _storage.GetObjectPrefixAsync(asset.ObjectKey, 32, cancellationToken);
        }
        catch (AssetStorageUnavailableException)
        {
            return OperationResult<AssetDto>.Failure(AssetError.StorageUnavailable());
        }

        if (metadata is null)
        {
            return OperationResult<AssetDto>.Failure(AssetError.InvalidUploadedObject("The uploaded object could not be found."));
        }

        var metadataError = ValidateUploadedObject(asset, metadata, objectPrefix);
        if (metadataError is not null)
        {
            return OperationResult<AssetDto>.Failure(metadataError);
        }

        try
        {
            asset.FinalizeUpload(_storage.GetPublicUrl(asset.ObjectKey), metadata.ContentType, metadata.SizeBytes);
            await _assets.UpdateAsync(asset, cancellationToken);
        }
        catch
        {
            await TryDeleteUploadedObjectAsync(asset.ObjectKey, cancellationToken);
            throw;
        }

        return OperationResult<AssetDto>.Success(ToDto(asset));
    }

    public async Task<OperationResult<bool>> DeleteAsync(Guid userId, Guid assetId, CancellationToken cancellationToken = default)
    {
        if (assetId == Guid.Empty)
        {
            return OperationResult<bool>.Failure(AssetError.Validation(new Dictionary<string, string[]>
            {
                ["assetId"] = ["Asset id is required."]
            }));
        }

        var asset = await _assets.GetOwnedAsync(userId, assetId, cancellationToken);
        if (asset is null)
        {
            return OperationResult<bool>.Failure(AssetError.NotFound());
        }

        var user = await _users.GetByIdAsync(userId, cancellationToken);
        if (user is null)
        {
            return OperationResult<bool>.Failure(AssetError.NotFound());
        }

        var wasCurrentAvatar = user.CurrentAvatarAssetId == asset.Id;
        asset.Archive(DateTime.UtcNow, TimeSpan.FromDays(30));

        if (wasCurrentAvatar)
        {
            user.UpdateProfile(user.FullName, user.Bio, null, null);
            await _users.UpdateAsync(user, cancellationToken);
        }
        else
        {
            await _assets.UpdateAsync(asset, cancellationToken);
        }

        return OperationResult<bool>.Success(true);
    }

    public async Task<int> CleanupExpiredPendingAsync(CancellationToken cancellationToken = default)
    {
        var nowUtc = DateTime.UtcNow;
        var assets = await _assets.ListPendingCleanupCandidatesAsync(nowUtc, cancellationToken);
        var cleaned = 0;

        foreach (var asset in assets)
        {
            await TryDeleteUploadedObjectAsync(asset.ObjectKey, cancellationToken);

            if (asset.Status == AssetStatus.PendingUpload)
            {
                asset.MarkExpired(nowUtc);
            }

            asset.MarkDeleted(nowUtc);
            await _assets.UpdateAsync(asset, cancellationToken);
            cleaned++;
        }

        return cleaned;
    }

    public async Task<AssetPurgeResult> PurgeExpiredArchivedAsync(CancellationToken cancellationToken = default)
    {
        var nowUtc = DateTime.UtcNow;
        var claimed = await _assets.ClaimDueArchivedAsync(nowUtc, 100, cancellationToken);
        var deleted = 0;
        var failed = 0;
        foreach (var asset in claimed)
        {
            try
            {
                await _storage.DeleteIfExistsAsync(asset.ObjectKey, cancellationToken);
                asset.MarkDeleted(DateTime.UtcNow);
                await _assets.UpdateAsync(asset, cancellationToken);
                deleted++;
            }
            catch (AssetStorageUnavailableException)
            {
                asset.RequeuePurge(DateTime.UtcNow);
                await _assets.UpdateAsync(asset, cancellationToken);
                failed++;
            }
        }

        return new AssetPurgeResult(claimed.Count, deleted, failed);
    }

    private static Dictionary<string, string[]> ValidatePresignRequest(PresignAssetRequest request)
    {
        var errors = new Dictionary<string, string[]>();

        Merge(errors, ValidateAssetTypeRequest(request.AssetType));

        if (string.IsNullOrWhiteSpace(request.ContentType) || !AllowedImageMimeTypes.Contains(request.ContentType.Trim()))
        {
            errors["contentType"] = ["Uploads must be JPG, PNG, or WebP."];
        }

        if (string.IsNullOrWhiteSpace(request.OriginalName) || request.OriginalName.Trim().Length > 255)
        {
            errors["originalName"] = ["Original file name is required and must be 255 characters or fewer."];
        }

        if (!request.SizeBytes.HasValue || request.SizeBytes.Value is < 1 or > 2 * 1024 * 1024)
        {
            errors["sizeBytes"] = ["Claimed upload size must be between 1 byte and 2MB."];
        }

        return errors;
    }

    private static Dictionary<string, string[]> ValidateAssetTypeRequest(string? assetType)
    {
        var errors = new Dictionary<string, string[]>();
        var value = assetType?.Trim() ?? "avatar";
        if (!string.Equals(value, "avatar", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(value, "countdown-cover", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(value, "note-image", StringComparison.OrdinalIgnoreCase))
        {
            errors["assetType"] = ["Supported asset types are avatar, countdown-cover, and note-image."];
        }

        return errors;
    }

    private static AssetType ParseAssetType(string assetType)
    {
        return NormalizeAssetType(assetType) switch
        {
            "avatar" => AssetType.Avatar,
            "countdown-cover" => AssetType.CountdownCover,
            "note-image" => AssetType.NoteImage,
            _ => throw new InvalidOperationException("Unsupported asset type."),
        };
    }

    private static string BuildObjectKey(Guid userId, AssetType type, Guid assetId, string contentType)
    {
        var extension = contentType.ToLowerInvariant() switch
        {
            "image/jpeg" => "jpg",
            "image/png" => "png",
            "image/webp" => "webp",
            _ => throw new InvalidOperationException("Unsupported asset content type.")
        };

        return type switch
        {
            AssetType.Avatar => $"avatars/users/{userId:N}/avatar-{assetId:N}.{extension}",
            AssetType.NoteImage => $"note-images/users/{userId:N}/image-{assetId:N}.{extension}",
            AssetType.CountdownCover => $"countdown-covers/users/{userId:N}/cover-{assetId:N}.{extension}",
            _ => throw new InvalidOperationException("Unsupported asset type.")
        };
    }

    private static AssetError? ValidateUploadedObject(Asset asset, AssetObjectMetadata metadata, byte[]? objectPrefix)
    {
        if (!string.Equals(metadata.ObjectKey, asset.ObjectKey, StringComparison.Ordinal))
        {
            return AssetError.InvalidUploadedObject("The uploaded object key does not match the pending asset.");
        }

        if (!AllowedImageMimeTypes.Contains(metadata.ContentType))
        {
            return AssetError.InvalidUploadedObject("The uploaded object must be JPG, PNG, or WebP.");
        }

        if (!string.Equals(metadata.ContentType, asset.ContentType, StringComparison.OrdinalIgnoreCase))
        {
            return AssetError.InvalidUploadedObject("The uploaded object content type does not match the presigned request.");
        }

        if (metadata.SizeBytes <= 0)
        {
            return AssetError.InvalidUploadedObject("The uploaded object cannot be empty.");
        }

        if (metadata.SizeBytes > 2 * 1024 * 1024)
        {
            return AssetError.InvalidUploadedObject("The uploaded object must be 2MB or smaller.");
        }

        if (!HasExpectedImageSignature(metadata.ContentType, objectPrefix))
        {
            return AssetError.InvalidUploadedObject("The uploaded object bytes do not match its image content type.");
        }

        return null;
    }

    private static bool HasExpectedImageSignature(string contentType, byte[]? bytes)
    {
        if (bytes is null)
        {
            return false;
        }

        return contentType.ToLowerInvariant() switch
        {
            "image/png" => bytes.Length >= 8
                && bytes.AsSpan(0, 8).SequenceEqual(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }),
            "image/jpeg" => bytes.Length >= 3
                && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF,
            "image/webp" => bytes.Length >= 12
                && bytes.AsSpan(0, 4).SequenceEqual("RIFF"u8)
                && bytes.AsSpan(8, 4).SequenceEqual("WEBP"u8),
            _ => false
        };
    }

    private static string NormalizeAssetType(string? assetType)
    {
        return assetType?.Trim().ToLowerInvariant() ?? "avatar";
    }

    private static string ToAssetTypeValue(AssetType type)
    {
        return type switch
        {
            AssetType.Avatar => "avatar",
            AssetType.CountdownCover => "countdown-cover",
            AssetType.NoteImage => "note-image",
            _ => throw new InvalidOperationException("Unsupported asset type."),
        };
    }

    private static string ToAssetStatusValue(AssetStatus status)
    {
        return status switch
        {
            AssetStatus.PendingUpload => "pending-upload",
            AssetStatus.Ready => "ready",
            AssetStatus.Failed => "failed",
            AssetStatus.Archived => "archived",
            AssetStatus.PendingDeletion => "pending-deletion",
            AssetStatus.Deleted => "deleted",
            _ => throw new InvalidOperationException("Unsupported asset status.")
        };
    }

    private async Task TryDeleteUploadedObjectAsync(string objectKey, CancellationToken cancellationToken)
    {
        try
        {
            await _storage.DeleteIfExistsAsync(objectKey, cancellationToken);
        }
        catch (AssetStorageUnavailableException)
        {
        }
    }

    private static AssetDto ToDto(Asset asset)
    {
        return new AssetDto(
            asset.Id,
            ToAssetTypeValue(asset.Type),
            ToAssetStatusValue(asset.Status),
            asset.PublicUrl,
            asset.ContentType,
            asset.SizeBytes,
            asset.ExpiresAt,
            asset.CreatedAt,
            asset.UpdatedAt);
    }

    private static OwnedAssetDto ToOwnedDto(Asset asset, Guid? currentAvatarAssetId, AssetPresignedDownload? download = null)
    {
        return new OwnedAssetDto(
            asset.Id,
            ToAssetTypeValue(asset.Type),
            ToAssetStatusValue(asset.Status),
            asset.ContentType,
            asset.SizeBytes,
            asset.ExpiresAt,
            asset.CreatedAt,
            asset.UpdatedAt,
            currentAvatarAssetId == asset.Id,
            download?.Url,
            download?.ExpiresAtUtc);
    }

    private static void Merge(Dictionary<string, string[]> target, Dictionary<string, string[]> source)
    {
        foreach (var (key, value) in source)
        {
            target[key] = value;
        }
    }
}
