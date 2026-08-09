using System.Globalization;
using FluentA.Application.BoundedContexts.Assets;
using FluentA.Application.Common;
using FluentA.Domain.BoundedContexts.Assets.Enums;
using FluentA.Domain.BoundedContexts.Countdown.Entities;
using FluentA.Domain.BoundedContexts.Countdown.Enums;
using FluentA.Domain.BoundedContexts.Countdown.Services;
using FluentA.Application.BoundedContexts.Countdown.DTOs;
using FluentA.Application.BoundedContexts.Trash;
using CountdownEventEntity = FluentA.Domain.BoundedContexts.Countdown.Entities.CountdownEvent;

namespace FluentA.Application.BoundedContexts.Countdown;

public sealed class CountdownService : ICountdownService
{
    private const string DateFormat = "yyyy-MM-dd";
    private readonly ICountdownRepository _repository;
    private readonly IAssetRepository? _assets;
    private readonly IAssetObjectStorage? _assetStorage;
    private readonly ITrashService? _trash;

    public CountdownService(
        ICountdownRepository repository,
        IAssetRepository? assets = null,
        IAssetObjectStorage? assetStorage = null,
        ITrashService? trash = null)
    {
        _repository = repository;
        _assets = assets;
        _assetStorage = assetStorage;
        _trash = trash;
    }

    public async Task<OperationResult<IReadOnlyList<CountdownEventDto>>> ListAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var nowUtc = DateTime.UtcNow;
        var events = await _repository.ListAsync(userId, cancellationToken);
        var visibleEvents = events
            .Where(countdown => countdown.DeletedAt is null && countdown.IsVisibleAt(nowUtc))
            .OrderBy(countdown => countdown.IsCompletedAt(nowUtc))
            .ThenBy(countdown => countdown.IsCompletedAt(nowUtc) ? -countdown.TargetDate.Ticks : countdown.TargetDate.Ticks)
            .ThenBy(countdown => countdown.CreatedAt)
            .ToList();

        var visible = new List<CountdownEventDto>(visibleEvents.Count);
        foreach (var countdown in visibleEvents)
        {
            visible.Add(await ToDtoAsync(userId, countdown, cancellationToken));
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

        var countdown = CountdownEventEntity.Create(userId, request.Name, validation.TargetDate, request.CoverAssetId, validation.RepeatPattern);
        foreach (var alert in validation.Alerts)
        {
            countdown.AddAlert(alert.AlertDay, alert.AlertTime, alert.ScheduledAtUtc);
        }

        await _repository.AddAsync(countdown, cancellationToken);
        return OperationResult<CountdownEventDto>.Success(await ToDtoAsync(userId, countdown, cancellationToken));
    }

    public async Task<OperationResult<TrashEntryDto>> DeleteAsync(Guid userId, Guid countdownId, CancellationToken cancellationToken = default)
    {
        if (_trash is not null)
        {
            return await _trash.TrashCountdownAsync(userId, countdownId, cancellationToken);
        }

        var countdown = await _repository.GetAsync(userId, countdownId, cancellationToken);
        if (countdown is null)
        {
            return OperationResult<TrashEntryDto>.Failure(CountdownError.NotFound());
        }

        if (countdown.CoverAssetId.HasValue && _assets is not null)
        {
            var cover = await _assets.GetOwnedAsync(userId, countdown.CoverAssetId.Value, cancellationToken);
            if (cover is not null && cover.Type == AssetType.CountdownCover && cover.Status == AssetStatus.Ready)
            {
                cover.Archive(DateTime.UtcNow, TimeSpan.FromDays(30));
            }
        }

        countdown.DetachCover();
        countdown.SoftDelete();
        await _repository.UpdateAsync(countdown, cancellationToken);

        return OperationResult<TrashEntryDto>.Success(new TrashEntryDto(Guid.Empty, "Countdown", countdown.Id, countdown.Name, "Countdown", DateTime.UtcNow, DateTime.UtcNow));
    }

    private async Task<(Dictionary<string, string[]> Errors, DateTime TargetDate, List<ValidatedAlert> Alerts, CountdownRepeatPattern RepeatPattern)> ValidateCreateAsync(
        Guid userId,
        CreateCountdownEventRequest request,
        CancellationToken cancellationToken)
    {
        var errors = ValidateName(request.Name);
        var targetDate = ParseTargetDate(request.TargetDate, errors);
        var repeatPattern = ParseRepeatPattern(request.RepeatPattern, errors);
        var alerts = ValidateAlerts(request.Alerts, targetDate, repeatPattern, errors);
        await ValidateCoverAssetAsync(userId, request.CoverAssetId, errors, cancellationToken);
        return (errors, targetDate, alerts, repeatPattern);
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

    private static List<ValidatedAlert> ValidateAlerts(
        IReadOnlyList<CreateCountdownAlertRequest>? alerts,
        DateTime targetDate,
        CountdownRepeatPattern repeatPattern,
        Dictionary<string, string[]> errors)
    {
        var validated = new List<ValidatedAlert>();
        if (alerts is null || alerts.Count is < 1 or > 5)
        {
            errors["alerts"] = ["Create requires between 1 and 5 alerts."];
            return validated;
        }

        if (targetDate == DateTime.MinValue)
        {
            return validated;
        }

        if (repeatPattern != CountdownRepeatPattern.None
            && !alerts.Any(alert => alert.AlertDay == "OnTargetDay"))
        {
            errors["alerts"] = ["Repeating countdowns require an OnTargetDay alert."];
        }

        var seen = new HashSet<string>(StringComparer.Ordinal);
        foreach (var alert in alerts)
        {
            if (!TimeOnly.TryParseExact(alert.AlertTime, "HH:mm", out var localTime))
            {
                errors["alerts"] = ["Alert times must use HH:mm format."];
                continue;
            }

            if (alert.AlertDay is not ("OnTargetDay" or "1DayBefore" or "3DaysBefore" or "7DaysBefore"))
            {
                errors["alerts"] = ["Alert day must be OnTargetDay, 1DayBefore, 3DaysBefore, or 7DaysBefore."];
                continue;
            }

            var key = $"{alert.AlertDay}|{alert.AlertTime}";
            if (!seen.Add(key))
            {
                errors["alerts"] = ["Duplicate alerts with the same alert day and alert time are not allowed."];
                continue;
            }

            var scheduledAtUtc = CountdownSchedule.BuildAlertScheduledAtUtc(targetDate, alert.AlertDay, alert.AlertTime);
            if (scheduledAtUtc <= DateTime.UtcNow)
            {
                errors["alerts"] = ["Alerts that are already in the past cannot be created."];
                continue;
            }

            validated.Add(new ValidatedAlert(alert.AlertDay, alert.AlertTime, scheduledAtUtc));
        }

        return validated;
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

    private static CountdownRepeatPattern ParseRepeatPattern(string? value, Dictionary<string, string[]> errors)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return CountdownRepeatPattern.None;
        }

        if (Enum.TryParse<CountdownRepeatPattern>(value, ignoreCase: false, out var pattern)
            && pattern is CountdownRepeatPattern.None or CountdownRepeatPattern.Weekly or CountdownRepeatPattern.Monthly or CountdownRepeatPattern.Yearly)
        {
            return pattern;
        }

        errors["repeatPattern"] = ["Repeat pattern must be None, Weekly, Monthly, or Yearly."];
        return CountdownRepeatPattern.None;
    }

    private async Task<CountdownEventDto> ToDtoAsync(Guid userId, CountdownEventEntity countdownEvent, CancellationToken cancellationToken)
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
            countdownEvent.RepeatPattern.ToString(),
            countdownEvent.IsCompletedAt(DateTime.UtcNow),
            countdownEvent.Alerts
                .Where(alert => alert.DeletedAt is null)
                .OrderBy(alert => alert.ScheduledAtUtc)
                .Select(alert => new CountdownAlertDto(alert.Id, alert.AlertDay, alert.AlertTime, alert.ScheduledAtUtc, alert.FiredAtUtc))
                .ToList(),
            countdownEvent.CreatedAt,
            countdownEvent.UpdatedAt);
    }

    private sealed record ValidatedAlert(string AlertDay, string AlertTime, DateTime ScheduledAtUtc);
}
