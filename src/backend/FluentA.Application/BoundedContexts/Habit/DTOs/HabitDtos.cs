using System.Text.Json.Serialization;

namespace FluentA.Application.BoundedContexts.Habit.DTOs;

public sealed record CreateHabitRequest(
    string Name,
    string? Description = null,
    string Icon = "Default",
    string Frequency = "Daily",
    IReadOnlyList<string>? CustomDays = null,
    bool ReminderEnabled = true,
    string? StartDate = null,
    int? GoalDays = null,
    string ReminderTime = "20:00",
    string? TimeZoneId = null);

public sealed record UpdateHabitRequest
{
    private int? _goalDays;

    public string? Name { get; init; }
    public string? Description { get; init; }
    public string? Icon { get; init; }
    public string? Frequency { get; init; }
    public IReadOnlyList<string>? CustomDays { get; init; }
    public bool? ReminderEnabled { get; init; }
    public string? StartDate { get; init; }
    public int? GoalDays
    {
        get => _goalDays;
        init
        {
            _goalDays = value;
            GoalDaysSpecified = true;
        }
    }
    public string? ReminderTime { get; init; }
    public string? TimeZoneId { get; init; }

    [JsonIgnore]
    public bool GoalDaysSpecified { get; private init; }
}

public sealed record ToggleHabitEntryRequest(string Date, string TimeZoneId);

public sealed record HabitDto(
    Guid Id,
    string Name,
    string? Description,
    string Icon,
    string Frequency,
    IReadOnlyList<string> CustomDays,
    bool ReminderEnabled,
    string StartDate,
    int? GoalDays,
    string ReminderTime,
    int CurrentStreak,
    int LongestStreak,
    int TotalCheckIns,
    bool IsScheduledToday,
    bool IsCheckedToday,
    double MonthlyCompletionRate,
    bool IsGoalCompleted,
    string? GoalCompletedOn,
    int? RemainingGoalDays,
    bool CanEditStartDate,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record HabitEntryDto(Guid HabitId, string Date, bool IsCompleted);

public sealed record HabitEntryToggleDto(
    Guid HabitId,
    string Date,
    bool IsCompleted,
    int TotalCheckIns,
    bool IsGoalCompleted);
