namespace FluentA.Application.BoundedContexts.Habit.DTOs;

public sealed record CreateHabitRequest(
    string Name,
    string? Description = null,
    string? Color = null,
    string? Icon = null,
    string Frequency = "Daily",
    IReadOnlyList<string>? CustomDays = null);

public sealed record UpdateHabitRequest(
    string? Name = null,
    string? Description = null,
    string? Color = null,
    string? Icon = null,
    string? Frequency = null,
    IReadOnlyList<string>? CustomDays = null);

public sealed record ToggleHabitEntryRequest(string Date, string TimeZoneId);

public sealed record HabitDto(
    Guid Id,
    string Name,
    string? Description,
    string? Color,
    string? Icon,
    string Frequency,
    IReadOnlyList<string> CustomDays,
    int CurrentStreak,
    bool IsScheduledToday,
    bool IsCheckedToday,
    double MonthlyCompletionRate,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record HabitEntryDto(Guid HabitId, string Date, bool IsCompleted);

public sealed record HabitEntryToggleDto(Guid HabitId, string Date, bool IsCompleted);

public sealed record HabitStatsDto(
    Guid HabitId,
    string Name,
    string? Description,
    string? Color,
    string? Icon,
    string Frequency,
    IReadOnlyList<string> CustomDays,
    int CurrentStreak,
    int LongestStreak,
    double Last7DaysCompletionRate,
    int CompletedLast7Days,
    int ScheduledLast7Days,
    double Last30DaysCompletionRate,
    int CompletedLast30Days,
    int ScheduledLast30Days,
    string AsOfDate);
