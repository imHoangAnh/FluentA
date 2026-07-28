using FluentA.Domain.BoundedContexts.Habit.Enums;
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
        HabitIcon icon,
        HabitFrequency frequency,
        IReadOnlyCollection<DayOfWeek>? customDays,
        DateTime startDate,
        int? goalDays,
        TimeOnly reminderTime)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User id is required.", nameof(userId));
        }

        UserId = userId;
        StartDate = NormalizeDate(startDate);
        GoalDays = ValidateGoalDays(goalDays);
        ReminderTime = reminderTime;
        ApplyDetails(name, description, icon, frequency, customDays);
    }

    public Guid UserId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public HabitIcon Icon { get; private set; }
    public HabitFrequency Frequency { get; private set; }
    public string? CustomDays { get; private set; }
    public DateTime StartDate { get; private set; }
    public int? GoalDays { get; private set; }
    public bool ReminderEnabled { get; private set; } = true;
    public TimeOnly ReminderTime { get; private set; } = new(20, 0);
    public DateTime? LastReminderSentOn { get; private set; }

    public IReadOnlyList<DayOfWeek> ScheduledCustomDays => ParseCustomDays(CustomDays);

    public static Habit Create(
        Guid userId,
        string name,
        string? description,
        HabitIcon icon,
        HabitFrequency frequency,
        IReadOnlyCollection<DayOfWeek>? customDays,
        DateTime? startDate = null,
        int? goalDays = null,
        TimeOnly? reminderTime = null)
    {
        return new Habit(
            userId,
            name,
            description,
            icon,
            frequency,
            customDays,
            startDate ?? DateTime.UtcNow.Date,
            goalDays,
            reminderTime ?? new TimeOnly(20, 0));
    }

    public void Update(
        string name,
        string? description,
        HabitIcon icon,
        HabitFrequency frequency,
        IReadOnlyCollection<DayOfWeek>? customDays,
        DateTime startDate,
        int? goalDays,
        TimeOnly reminderTime,
        int entryCount)
    {
        if (entryCount < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(entryCount));
        }

        var normalizedStartDate = NormalizeDate(startDate);
        if (entryCount > 0 && normalizedStartDate != StartDate)
        {
            throw new InvalidOperationException("Start date cannot change after the first check-in.");
        }

        var validatedGoalDays = ValidateGoalDays(goalDays);
        if (validatedGoalDays != GoalDays && validatedGoalDays.HasValue && validatedGoalDays.Value <= entryCount)
        {
            throw new ArgumentException("A changed finite goal must be greater than the current check-in count.", nameof(goalDays));
        }

        ApplyDetails(name, description, icon, frequency, customDays);
        StartDate = normalizedStartDate;
        GoalDays = validatedGoalDays;
        ReminderTime = reminderTime;
        Touch();
    }

    public bool IsScheduledOn(DateTime localDate)
    {
        return Frequency == HabitFrequency.Daily || ScheduledCustomDays.Contains(localDate.Date.DayOfWeek);
    }

    public bool IsStartedOn(DateTime localDate)
    {
        return NormalizeDate(localDate) >= StartDate;
    }

    public bool IsEligibleOn(DateTime localDate)
    {
        return IsStartedOn(localDate) && IsScheduledOn(localDate);
    }

    public void MarkReminderSent(DateTime date)
    {
        LastReminderSentOn = DateTime.SpecifyKind(date.Date, DateTimeKind.Utc);
        Touch();
    }

    public void SetReminderEnabled(bool enabled)
    {
        ReminderEnabled = enabled;
        Touch();
    }

    public void MoveToTrash(DateTime nowUtc)
    {
        DeletedAt = nowUtc;
        ReminderEnabled = false;
        LastReminderSentOn = null;
        UpdatedAt = nowUtc;
    }

    public void RestoreFromTrash(DateTime nowUtc)
    {
        DeletedAt = null;
        // Reminder settings deliberately stay disabled after Restore.
        ReminderEnabled = false;
        LastReminderSentOn = null;
        UpdatedAt = nowUtc;
    }

    private void ApplyDetails(
        string name,
        string? description,
        HabitIcon icon,
        HabitFrequency frequency,
        IReadOnlyCollection<DayOfWeek>? customDays)
    {
        Name = CleanName(name);
        Description = CleanOptional(description, 2000, nameof(description));
        Icon = icon;
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

    private static int? ValidateGoalDays(int? goalDays)
    {
        if (goalDays is <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(goalDays), "Goal days must be positive when supplied.");
        }

        return goalDays;
    }

    private static DateTime NormalizeDate(DateTime date)
    {
        return DateTime.SpecifyKind(date.Date, DateTimeKind.Utc);
    }
}
