using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Countdown.Entities;

public sealed class CountdownEvent : BaseEntity, IAggregateRoot
{
    private CountdownEvent()
    {
        Name = string.Empty;
    }

    private CountdownEvent(Guid userId, string name, DateTime targetDate, string? color, string? icon)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User id is required.", nameof(userId));
        }

        UserId = userId;
        Name = CleanName(name);
        TargetDate = NormalizeUtc(targetDate);
        Color = CleanOptional(color, 7, nameof(color));
        Icon = CleanOptional(icon, 16, nameof(icon));
    }

    public Guid UserId { get; private set; }
    public string Name { get; private set; }
    public DateTime TargetDate { get; private set; }
    public string? Color { get; private set; }
    public string? Icon { get; private set; }
    public DateTime? AlertedAt { get; private set; }
    public bool IsCompleted => IsCompletedAt(DateTime.UtcNow);

    public static CountdownEvent Create(Guid userId, string name, DateTime targetDate, string? color = null, string? icon = null)
    {
        return new CountdownEvent(userId, name, targetDate, color, icon);
    }

    public void Rename(string name)
    {
        Name = CleanName(name);
        Touch();
    }

    public void Reschedule(DateTime targetDate)
    {
        TargetDate = NormalizeUtc(targetDate);
        Touch();
    }

    public void UpdateColor(string? color)
    {
        Color = CleanOptional(color, 7, nameof(color));
        Touch();
    }

    public void UpdateIcon(string? icon)
    {
        Icon = CleanOptional(icon, 16, nameof(icon));
        Touch();
    }

    public bool IsCompletedAt(DateTime utcNow)
    {
        return DateTime.SpecifyKind(utcNow, DateTimeKind.Utc) >= TargetDate;
    }

    public void MarkAlerted(DateTime utcNow)
    {
        AlertedAt ??= NormalizeUtc(utcNow);
        Touch();
    }

    public void SoftDelete()
    {
        DeletedAt = DateTime.UtcNow;
        UpdatedAt = DeletedAt.Value;
    }

    private void Touch()
    {
        UpdatedAt = DateTime.UtcNow;
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

    private static string? CleanOptional(string? value, int maxLength, string paramName)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var cleaned = value.Trim();
        if (cleaned.Length > maxLength)
        {
            throw new ArgumentException($"Countdown {paramName} must be at most {maxLength} characters.", paramName);
        }

        return cleaned;
    }
}
