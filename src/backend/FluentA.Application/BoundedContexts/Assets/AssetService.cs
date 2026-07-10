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
        return OperationResult<IReadOnlyList<OwnedAssetDto>>.Success(assets
            .Where(asset => asset.Type == requestedType)
            .Select(asset => ToOwnedDto(asset, currentAvatarAssetId))
            .ToList());
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
        var objectKey = BuildObjectKey(userId, type, assetId);
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
            upload.ExpiresAtUtc);
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

        if (asset.Status != AssetStatus.Pending)
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
        try
        {
            metadata = await _storage.GetObjectMetadataAsync(asset.ObjectKey, cancellationToken);
        }
        catch (AssetStorageUnavailableException)
        {
            return OperationResult<AssetDto>.Failure(AssetError.StorageUnavailable());
        }

        if (metadata is null)
        {
            return OperationResult<AssetDto>.Failure(AssetError.InvalidUploadedObject("The uploaded object could not be found."));
        }

        var metadataError = ValidateUploadedObject(asset, metadata);
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
        asset.MarkDeleted(DateTime.UtcNow);

        if (wasCurrentAvatar)
        {
            user.UpdateProfile(user.FullName, user.Bio, null, null);
            await _users.UpdateAsync(user, cancellationToken);
        }
        else
        {
            await _assets.UpdateAsync(asset, cancellationToken);
        }

        await TryDeleteUploadedObjectAsync(asset.ObjectKey, cancellationToken);

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

            if (asset.Status == AssetStatus.Pending)
            {
                asset.MarkExpired(nowUtc);
            }

            asset.MarkDeleted(nowUtc);
            await _assets.UpdateAsync(asset, cancellationToken);
            cleaned++;
        }

        return cleaned;
    }

    private static Dictionary<string, string[]> ValidatePresignRequest(PresignAssetRequest request)
    {
        var errors = new Dictionary<string, string[]>();

        Merge(errors, ValidateAssetTypeRequest(request.AssetType));

        if (string.IsNullOrWhiteSpace(request.ContentType) || !AllowedImageMimeTypes.Contains(request.ContentType.Trim()))
        {
            errors["contentType"] = ["Uploads must be JPG, PNG, or WebP."];
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

    private static string BuildObjectKey(Guid userId, AssetType type, Guid assetId)
    {
        return $"users/{userId:N}/{ToAssetTypeValue(type)}/{assetId:N}";
    }

    private static AssetError? ValidateUploadedObject(Asset asset, AssetObjectMetadata metadata)
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

        return null;
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
            asset.Status.ToString().ToLowerInvariant(),
            asset.PublicUrl,
            asset.ContentType,
            asset.SizeBytes,
            asset.ExpiresAt,
            asset.CreatedAt,
            asset.UpdatedAt);
    }

    private static OwnedAssetDto ToOwnedDto(Asset asset, Guid? currentAvatarAssetId)
    {
        return new OwnedAssetDto(
            asset.Id,
            ToAssetTypeValue(asset.Type),
            asset.Status.ToString().ToLowerInvariant(),
            asset.PublicUrl,
            asset.ContentType,
            asset.SizeBytes,
            asset.ExpiresAt,
            asset.CreatedAt,
            asset.UpdatedAt,
            currentAvatarAssetId == asset.Id);
    }

    private static void Merge(Dictionary<string, string[]> target, Dictionary<string, string[]> source)
    {
        foreach (var (key, value) in source)
        {
            target[key] = value;
        }
    }
}
