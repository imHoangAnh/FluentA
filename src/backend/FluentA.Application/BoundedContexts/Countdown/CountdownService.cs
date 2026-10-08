using System.Globalization;
using FluentA.Application.BoundedContexts.Assets;
using FluentA.Application.Common;
using FluentA.Domain.BoundedContexts.Assets.Enums;
using FluentA.Domain.BoundedContexts.Countdown.Entities;
using FluentA.Application.BoundedContexts.Countdown.DTOs;
using CountdownEventEntity = FluentA.Domain.BoundedContexts.Countdown.Entities.CountdownEvent;

namespace FluentA.Application.BoundedContexts.Countdown;

public sealed class CountdownService : ICountdownService
{
    private const string DateFormat = "yyyy-MM-dd";
    private readonly ICountdownRepository _repository;
    private readonly IAssetRepository? _assets;
    private readonly IAssetObjectStorage? _assetStorage;

    public CountdownService(
        ICountdownRepository repository,
        IAssetRepository? assets = null,
        IAssetObjectStorage? assetStorage = null)
    {
        _repository = repository;
        _assets = assets;
        _assetStorage = assetStorage;
    }

    public async Task<OperationResult<IReadOnlyList<CountdownEventDto>>> ListAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var nowUtc = DateTime.UtcNow;
        var events = await _repository.ListAsync(userId, cancellationToken);
        var visibleEvents = events
            .OrderBy(countdown => countdown.IsCompletedAt(nowUtc))
            .ThenBy(countdown => countdown.IsCompletedAt(nowUtc) ? -countdown.TargetDate.Ticks : countdown.TargetDate.Ticks)
            .ThenBy(countdown => countdown.CreatedAt)
            .ToList();

        var visible = new List<CountdownEventDto>(visibleEvents.Count);
        foreach (var countdown in visibleEvents)
        {
            visible.Add(await ToDtoAsync(userId, countdown, cancellationToken, nowUtc));
        }

        return OperationResult<IReadOnlyList<CountdownEventDto>>.Success(visible);
    }

    public async Task<OperationResult<CountdownEventDto>> CreateAsync(
        Guid userId,
        CreateCountdownEventRequest request,
        CancellationToken cancellationToken = default)
    {
        var validation = await ValidateCreateAsync(userId, request, cancellationToken);
        if (validation.Errors.Count > 0)
        {
            return OperationResult<CountdownEventDto>.Failure(CountdownError.Validation(validation.Errors));
        }

        var countdown = CountdownEventEntity.Create(userId, request.Name, validation.TargetDate, request.CoverAssetId);
        await _repository.AddAsync(countdown, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);
        return OperationResult<CountdownEventDto>.Success(await ToDtoAsync(userId, countdown, cancellationToken));
    }

    public async Task<OperationResult<bool>> DeleteAsync(Guid userId, Guid countdownId, CancellationToken cancellationToken = default)
    {
        var countdown = await _repository.GetAsync(userId, countdownId, cancellationToken);
        if (countdown is null)
        {
            return OperationResult<bool>.Failure(CountdownError.NotFound());
        }

        countdown.SoftDelete();
        await _repository.SaveChangesAsync(cancellationToken);
        return OperationResult<bool>.Success(true);
    }

    private async Task<(Dictionary<string, string[]> Errors, DateTime TargetDate)> ValidateCreateAsync(
        Guid userId,
        CreateCountdownEventRequest request,
        CancellationToken cancellationToken)
    {
        var errors = ValidateName(request.Name);
        var targetDate = ParseTargetDate(request.TargetDate, errors);
        await ValidateCoverAssetAsync(userId, request.CoverAssetId, errors, cancellationToken);
        return (errors, targetDate);
    }

    private static Dictionary<string, string[]> ValidateName(string name)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(name))
        {
            errors["name"] = ["Name is required."];
        }
        else if (name.Trim().Length > 50)
        {
            errors["name"] = ["Name must be at most 50 characters."];
        }

        return errors;
    }

    private static DateTime ParseTargetDate(string? value, Dictionary<string, string[]> errors)
    {
        if (string.IsNullOrWhiteSpace(value)
            || !DateTime.TryParseExact(value, DateFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
        {
            errors["targetDate"] = ["Target date must be in YYYY-MM-DD format."];
            return DateTime.MinValue;
        }

        var targetDate = DateTime.SpecifyKind(parsed.Date, DateTimeKind.Utc);
        var vietnamToday = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, CountdownTimeZone.Vietnam()).Date;
        if (targetDate.Date < vietnamToday)
        {
            errors["targetDate"] = ["Target date cannot be in the past."];
        }

        return targetDate;
    }

    private async Task ValidateCoverAssetAsync(
        Guid userId,
        Guid? coverAssetId,
        Dictionary<string, string[]> errors,
        CancellationToken cancellationToken)
    {
        if (!coverAssetId.HasValue)
        {
            return;
        }

        if (_assets is null)
        {
            errors["coverAssetId"] = ["Cover assets are unavailable in the current runtime."];
            return;
        }

        var asset = await _assets.GetOwnedAsync(userId, coverAssetId.Value, cancellationToken);
        if (asset is null || asset.Type != AssetType.CountdownCover || asset.Status != AssetStatus.Ready)
        {
            errors["coverAssetId"] = ["Cover asset must be an owned finalized countdown-cover asset."];
            return;
        }

        if (await _repository.IsCoverAssetAttachedAsync(asset.Id, cancellationToken))
        {
            errors["coverAssetId"] = ["Cover asset is already attached to another countdown."];
        }
    }

    private async Task<CountdownEventDto> ToDtoAsync(
        Guid userId,
        CountdownEventEntity countdownEvent,
        CancellationToken cancellationToken,
        DateTime? nowUtc = null)
    {
        AssetPresignedDownload? coverDownload = null;
        if (countdownEvent.CoverAssetId.HasValue && _assets is not null && _assetStorage is not null)
        {
            var asset = await _assets.GetOwnedAsync(userId, countdownEvent.CoverAssetId.Value, cancellationToken);
            if (asset is not null && asset.Type == AssetType.CountdownCover && asset.Status == AssetStatus.Ready)
            {
                try
                {
                    coverDownload = _assetStorage.CreatePresignedDownload(new AssetDownloadRequest(asset.ObjectKey, TimeSpan.FromMinutes(5)));
                }
                catch (AssetStorageUnavailableException)
                {
                    // Fail closed: a missing storage provider must not expose a durable URL.
                }
            }
        }

        return new CountdownEventDto(
            countdownEvent.Id,
            countdownEvent.Name,
            countdownEvent.TargetDate.ToString(DateFormat, CultureInfo.InvariantCulture),
            countdownEvent.CoverAssetId,
            coverDownload?.Url,
            coverDownload?.ExpiresAtUtc,
            countdownEvent.IsCompletedAt(nowUtc ?? DateTime.UtcNow),
            countdownEvent.CreatedAt,
            countdownEvent.UpdatedAt);
    }
}
