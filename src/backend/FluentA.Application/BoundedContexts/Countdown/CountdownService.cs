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
            .Where(countdown => countdown.DeletedAt is null && countdown.IsVisibleAt(nowUtc))
            .OrderBy(countdown => countdown.IsCompletedAt(nowUtc))
            .ThenBy(countdown => countdown.TargetDate)
            .ThenBy(countdown => countdown.CreatedAt)
            .ToList();

        var visible = new List<CountdownEventDto>(visibleEvents.Count);
        foreach (var countdown in visibleEvents)
        {
            string? coverUrl = null;
            if (countdown.CoverAssetId.HasValue && _assets is not null)
            {
                var asset = await _assets.GetByIdAsync(countdown.CoverAssetId.Value, cancellationToken);
                coverUrl = asset?.DeletedAt is null ? asset?.PublicUrl : null;
            }

            visible.Add(ToDto(countdown, coverUrl));
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
        foreach (var alert in validation.Alerts)
        {
            countdown.AddAlert(alert.AlertDay, alert.AlertTime, alert.ScheduledAtUtc);
        }

        await _repository.AddAsync(countdown, cancellationToken);
        return OperationResult<CountdownEventDto>.Success(ToDto(countdown, validation.CoverUrl));
    }

    public async Task<OperationResult<bool>> DeleteAsync(Guid userId, Guid countdownId, CancellationToken cancellationToken = default)
    {
        var countdown = await _repository.GetAsync(userId, countdownId, cancellationToken);
        if (countdown is null)
        {
            return OperationResult<bool>.Failure(CountdownError.NotFound());
        }

        countdown.SoftDelete();
        await _repository.UpdateAsync(countdown, cancellationToken);

        if (countdown.CoverAssetId.HasValue && _assets is not null)
        {
            var asset = await _assets.GetOwnedAsync(userId, countdown.CoverAssetId.Value, cancellationToken);
            if (asset is not null && asset.DeletedAt is null)
            {
                asset.MarkDeleted(DateTime.UtcNow);
                await _assets.UpdateAsync(asset, cancellationToken);

                if (_assetStorage is not null)
                {
                    try
                    {
                        await _assetStorage.DeleteIfExistsAsync(asset.ObjectKey, cancellationToken);
                    }
                    catch (AssetStorageUnavailableException)
                    {
                    }
                }
            }
        }

        return OperationResult<bool>.Success(true);
    }

    private async Task<(Dictionary<string, string[]> Errors, DateTime TargetDate, List<ValidatedAlert> Alerts, string? CoverUrl)> ValidateCreateAsync(
        Guid userId,
        CreateCountdownEventRequest request,
        CancellationToken cancellationToken)
    {
        var errors = ValidateName(request.Name);
        var targetDate = ParseTargetDate(request.TargetDate, errors);
        var alerts = ValidateAlerts(request.Alerts, targetDate, errors);
        var coverUrl = await ValidateCoverAssetAsync(userId, request.CoverAssetId, errors, cancellationToken);
        return (errors, targetDate, alerts, coverUrl);
    }

    private static Dictionary<string, string[]> ValidateName(string name)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(name))
        {
            errors["name"] = ["Name is required."];
        }
        else if (name.Trim().Length > 180)
        {
            errors["name"] = ["Name must be at most 180 characters."];
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
        Dictionary<string, string[]> errors)
    {
        var validated = new List<ValidatedAlert>();
        if (alerts is null || alerts.Count is < 1 or > 5)
        {
            errors["alerts"] = ["Create requires between 1 and 5 alerts."];
            return validated;
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

            var scheduledAtUtc = BuildScheduledAtUtc(targetDate, alert.AlertDay, localTime);
            if (scheduledAtUtc <= DateTime.UtcNow)
            {
                errors["alerts"] = ["Alerts that are already in the past cannot be created."];
                continue;
            }

            validated.Add(new ValidatedAlert(alert.AlertDay, alert.AlertTime, scheduledAtUtc));
        }

        return validated;
    }

    private async Task<string?> ValidateCoverAssetAsync(
        Guid userId,
        Guid? coverAssetId,
        Dictionary<string, string[]> errors,
        CancellationToken cancellationToken)
    {
        if (!coverAssetId.HasValue)
        {
            return null;
        }

        if (_assets is null)
        {
            errors["coverAssetId"] = ["Cover assets are unavailable in the current runtime."];
            return null;
        }

        var asset = await _assets.GetOwnedAsync(userId, coverAssetId.Value, cancellationToken);
        if (asset is null || asset.Type != AssetType.CountdownCover || asset.Status != AssetStatus.Ready)
        {
            errors["coverAssetId"] = ["Cover asset must be an owned finalized countdown-cover asset."];
            return null;
        }

        return asset.PublicUrl;
    }

    private static DateTime BuildScheduledAtUtc(DateTime targetDate, string alertDay, TimeOnly localTime)
    {
        var localDate = alertDay switch
        {
            "OnTargetDay" => targetDate.Date,
            "1DayBefore" => targetDate.Date.AddDays(-1),
            "3DaysBefore" => targetDate.Date.AddDays(-3),
            "7DaysBefore" => targetDate.Date.AddDays(-7),
            _ => throw new InvalidOperationException("Unsupported alert day."),
        };

        var unspecificLocal = localDate.Add(localTime.ToTimeSpan());
        var local = DateTime.SpecifyKind(unspecificLocal, DateTimeKind.Unspecified);
        return TimeZoneInfo.ConvertTimeToUtc(local, CountdownTimeZone.Vietnam());
    }

    private static CountdownEventDto ToDto(CountdownEventEntity countdownEvent, string? coverUrlOverride = null)
    {
        return new CountdownEventDto(
            countdownEvent.Id,
            countdownEvent.Name,
            countdownEvent.TargetDate.ToString(DateFormat, CultureInfo.InvariantCulture),
            countdownEvent.CoverAssetId,
            coverUrlOverride,
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
