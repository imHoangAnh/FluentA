using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Habit.Entities;

public sealed class Habit : BaseEntity, IAggregateRoot
{
    private Habit()
    {
        Name = string.Empty;
    }

    private Habit(
        Guid userId,
        string name,
        string? description,
        string? color,
        string? icon,
        HabitFrequency frequency,
        IReadOnlyCollection<DayOfWeek>? customDays)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User id is required.", nameof(userId));
        }

        UserId = userId;
        ApplyDetails(name, description, color, icon, frequency, customDays);
    }

    public Guid UserId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public string? Color { get; private set; }
    public string? Icon { get; private set; }
    public HabitFrequency Frequency { get; private set; }
    public string? CustomDays { get; private set; }

    public IReadOnlyList<DayOfWeek> ScheduledCustomDays => ParseCustomDays(CustomDays);

    public static Habit Create(
        Guid userId,
        string name,
        string? description,
        string? color,
        string? icon,
        HabitFrequency frequency,
        IReadOnlyCollection<DayOfWeek>? customDays)
    {
        return new Habit(userId, name, description, color, icon, frequency, customDays);
    }

    public void Update(
        string name,
        string? description,
        string? color,
        string? icon,
        HabitFrequency frequency,
        IReadOnlyCollection<DayOfWeek>? customDays)
    {
        ApplyDetails(name, description, color, icon, frequency, customDays);
        Touch();
    }

    public bool IsScheduledOn(DateTime localDate)
    {
        return Frequency == HabitFrequency.Daily || ScheduledCustomDays.Contains(localDate.Date.DayOfWeek);
    }

    public void SoftDelete()
    {
        DeletedAt = DateTime.UtcNow;
        UpdatedAt = DeletedAt.Value;
    }

    private void ApplyDetails(
        string name,
        string? description,
        string? color,
        string? icon,
        HabitFrequency frequency,
        IReadOnlyCollection<DayOfWeek>? customDays)
    {
        Name = CleanName(name);
        Description = CleanOptional(description, 2000, nameof(description));
        Color = CleanColor(color);
        Icon = CleanOptional(icon, 16, nameof(icon));
        Frequency = frequency;
        CustomDays = SerializeCustomDays(frequency, customDays);
    }

    private void Touch()
    {
        UpdatedAt = DateTime.UtcNow;
    }

    private static string CleanName(string name)
    {
        var cleaned = name.Trim();
        if (cleaned.Length is < 1 or > 180)
        {
            throw new ArgumentException("Habit name must be between 1 and 180 characters.", nameof(name));
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
            throw new ArgumentException($"Habit {paramName} must be at most {maxLength} characters.", paramName);
        }

        return cleaned;
    }

    private static string? CleanColor(string? color)
    {
        if (string.IsNullOrWhiteSpace(color))
        {
            return null;
        }

        var cleaned = color.Trim();
        if (cleaned.Length != 7 || cleaned[0] != '#' || cleaned.Skip(1).Any(character => !Uri.IsHexDigit(character)))
        {
            throw new ArgumentException("Habit color must be a hex value like #22C55E.", nameof(color));
        }

        return cleaned;
    }

    private static string? SerializeCustomDays(HabitFrequency frequency, IReadOnlyCollection<DayOfWeek>? customDays)
    {
        if (frequency == HabitFrequency.Daily)
        {
            return null;
        }

        var days = customDays?
            .Distinct()
            .OrderBy(day => (int)day)
            .ToList() ?? [];

        if (days.Count == 0)
        {
            throw new ArgumentException("Custom habits require at least one scheduled day.", nameof(customDays));
        }

        return string.Join(",", days.Select(day => day.ToString()));
    }

    private static IReadOnlyList<DayOfWeek> ParseCustomDays(string? customDays)
    {
        if (string.IsNullOrWhiteSpace(customDays))
        {
            return [];
        }

        return customDays
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(value => Enum.Parse<DayOfWeek>(value))
            .ToList();
    }
}
