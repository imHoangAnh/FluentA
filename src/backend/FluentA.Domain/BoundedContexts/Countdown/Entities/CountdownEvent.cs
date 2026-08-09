using FluentA.Domain.SeedWork;
using FluentA.Domain.BoundedContexts.Countdown.Enums;
using FluentA.Domain.BoundedContexts.Countdown.Services;

namespace FluentA.Domain.BoundedContexts.Countdown.Entities;

public sealed class CountdownEvent : BaseEntity, IAggregateRoot
{
    private readonly List<CountdownAlert> _alerts = [];

    private CountdownEvent()
    {
        Name = string.Empty;
    }

    private CountdownEvent(Guid userId, string name, DateTime targetDate, Guid? coverAssetId, CountdownRepeatPattern repeatPattern)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User id is required.", nameof(userId));
        }

        UserId = userId;
        Name = CleanName(name);
        TargetDate = NormalizeDate(targetDate);
        CoverAssetId = ValidateCoverAssetId(coverAssetId);
        RepeatPattern = repeatPattern;
    }

    public Guid UserId { get; private set; }
    public string Name { get; private set; }
    public DateTime TargetDate { get; private set; }
    public Guid? CoverAssetId { get; private set; }
    public CountdownRepeatPattern RepeatPattern { get; private set; }
    public DateTime? RestoredAtUtc { get; private set; }
    public IReadOnlyList<CountdownAlert> Alerts => _alerts.AsReadOnly();

    public static CountdownEvent Create(
        Guid userId,
        string name,
        DateTime targetDate,
        Guid? coverAssetId = null,
        CountdownRepeatPattern repeatPattern = CountdownRepeatPattern.None)
    {
        return new CountdownEvent(userId, name, targetDate, coverAssetId, repeatPattern);
    }

    public void AddAlert(string alertDay, string alertTime, DateTime scheduledAtUtc)
    {
        _alerts.Add(CountdownAlert.Create(Id, alertDay, alertTime, scheduledAtUtc));
        Touch();
    }

    public bool IsCompletedAt(DateTime utcNow)
    {
        if (RepeatPattern != CountdownRepeatPattern.None)
        {
            return false;
        }

        var vietnamNow = TimeZoneInfo.ConvertTimeFromUtc(NormalizeUtc(utcNow), CountdownTimeZone.Vietnam());
        return vietnamNow.Date > TargetDate.Date;
    }

    public bool IsVisibleAt(DateTime utcNow)
    {
        return true;
    }

    public bool AdvanceRecurrenceAt(DateTime utcNow)
    {
        if (RepeatPattern == CountdownRepeatPattern.None)
        {
            return false;
        }

        var vietnamToday = TimeZoneInfo.ConvertTimeFromUtc(NormalizeUtc(utcNow), CountdownTimeZone.Vietnam()).Date;
        var nextTargetDate = CountdownSchedule.NextTargetDate(TargetDate, RepeatPattern, vietnamToday);
        if (nextTargetDate == TargetDate)
        {
            return false;
        }

        TargetDate = nextTargetDate;
        foreach (var alert in _alerts.Where(alert => alert.DeletedAt is null))
        {
            alert.Reschedule(CountdownSchedule.BuildAlertScheduledAtUtc(nextTargetDate, alert.AlertDay, alert.AlertTime));
        }

        Touch();
        return true;
    }

    public void SoftDelete(DateTime? nowUtc = null, bool deleteAlerts = true)
    {
        var now = nowUtc ?? DateTime.UtcNow;
        DeletedAt = now;
        UpdatedAt = now;

        if (!deleteAlerts)
        {
            return;
        }

        foreach (var alert in _alerts.Where(alert => alert.DeletedAt is null))
        {
            alert.SoftDelete(now);
        }
    }

    public void DetachCover()
    {
        CoverAssetId = null;
        Touch();
    }

    public void RestoreFromTrash(DateTime nowUtc)
    {
        var now = NormalizeUtc(nowUtc);
        DeletedAt = null;
        var vietnamNow = TimeZoneInfo.ConvertTimeFromUtc(now, CountdownTimeZone.Vietnam()).Date;
        RestoredAtUtc = vietnamNow > TargetDate.Date.AddDays(7) ? now : null;
        UpdatedAt = now;
    }

    private void Touch()
    {
        UpdatedAt = DateTime.UtcNow;
    }

    private static DateTime NormalizeDate(DateTime targetDate)
    {
        return DateTime.SpecifyKind(targetDate.Date, DateTimeKind.Utc);
    }

    private static DateTime NormalizeUtc(DateTime targetDate)
    {
        return targetDate.Kind switch
        {
            DateTimeKind.Utc => targetDate,
            DateTimeKind.Local => targetDate.ToUniversalTime(),
            _ => DateTime.SpecifyKind(targetDate, DateTimeKind.Utc),
        };
    }

    private static string CleanName(string name)
    {
        var cleaned = name.Trim();
        if (cleaned.Length is < 1 or > 180)
        {
            throw new ArgumentException("Countdown name must be between 1 and 180 characters.", nameof(name));
        }

        return cleaned;
    }

    private static Guid? ValidateCoverAssetId(Guid? coverAssetId)
    {
        if (coverAssetId == Guid.Empty)
        {
            throw new ArgumentException("Countdown cover asset id must be a non-empty GUID.", nameof(coverAssetId));
        }

        return coverAssetId;
    }
}
