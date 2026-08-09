using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Countdown.Entities;

public sealed class CountdownAlert : BaseEntity
{
    private CountdownAlert()
    {
        AlertDay = string.Empty;
        AlertTime = string.Empty;
    }

    private CountdownAlert(Guid countdownId, string alertDay, string alertTime, DateTime scheduledAtUtc)
    {
        if (countdownId == Guid.Empty)
        {
            throw new ArgumentException("Countdown id is required.", nameof(countdownId));
        }

        CountdownId = countdownId;
        AlertDay = CleanAlertDay(alertDay);
        AlertTime = CleanAlertTime(alertTime);
        ScheduledAtUtc = NormalizeUtc(scheduledAtUtc);
    }

    public Guid CountdownId { get; private set; }
    public string AlertDay { get; private set; }
    public string AlertTime { get; private set; }
    public DateTime ScheduledAtUtc { get; private set; }
    public DateTime? FiredAtUtc { get; private set; }

    public static CountdownAlert Create(Guid countdownId, string alertDay, string alertTime, DateTime scheduledAtUtc)
    {
        return new CountdownAlert(countdownId, alertDay, alertTime, scheduledAtUtc);
    }

    public void MarkFired(DateTime firedAtUtc)
    {
        FiredAtUtc ??= NormalizeUtc(firedAtUtc);
        UpdatedAt = DateTime.UtcNow;
    }

    public void Reschedule(DateTime scheduledAtUtc)
    {
        ScheduledAtUtc = NormalizeUtc(scheduledAtUtc);
        FiredAtUtc = null;
        Touch();
    }

    public void SoftDelete(DateTime? nowUtc = null)
    {
        var now = nowUtc ?? DateTime.UtcNow;
        DeletedAt = now;
        UpdatedAt = now;
    }

    private void Touch()
    {
        UpdatedAt = DateTime.UtcNow;
    }

    private static string CleanAlertDay(string alertDay)
    {
        var cleaned = alertDay.Trim();
        if (cleaned is not ("OnTargetDay" or "1DayBefore" or "3DaysBefore" or "7DaysBefore"))
        {
            throw new ArgumentException("Countdown alert day is invalid.", nameof(alertDay));
        }

        return cleaned;
    }

    private static string CleanAlertTime(string alertTime)
    {
        var cleaned = alertTime.Trim();
        if (!TimeOnly.TryParseExact(cleaned, "HH:mm", out _))
        {
            throw new ArgumentException("Countdown alert time must be HH:mm.", nameof(alertTime));
        }

        return cleaned;
    }

    private static DateTime NormalizeUtc(DateTime value)
    {
        return value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc),
        };
    }
}
