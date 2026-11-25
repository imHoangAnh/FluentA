using System.Globalization;
using FluentA.Application.BoundedContexts.Habit.DTOs;
using FluentA.Domain.BoundedContexts.Habit.Enums;
using HabitEntity = FluentA.Domain.BoundedContexts.Habit.Entities.Habit;

namespace FluentA.Application.BoundedContexts.Habit;

internal static class HabitRequestValidator
{
    private const string DateFormat = "yyyy-MM-dd";
    private const string MonthFormat = "yyyy-MM";

    public static (
        Dictionary<string, string[]> Errors,
        HabitIcon Icon,
        HabitFrequency Frequency,
        IReadOnlyList<DayOfWeek> CustomDays,
        DateTime StartDate) ValidateCreate(CreateHabitRequest request)
    {
        var errors = ValidateNameAndDescription(request.Name, request.Description);
        var icon = ValidateIcon(request.Icon, errors, HabitIcon.Default);
        var schedule = ValidateSchedule(request.Frequency, request.CustomDays);
        Merge(errors, schedule.Errors);

        var startDate = ValidateDate(request.StartDate, "startDate", errors);
        if (startDate < HabitStatisticsCalculator.UtcToday())
        {
            errors["startDate"] = ["Start date must be today or a future date."];
        }

        if (request.GoalDays is <= 0)
        {
            errors["goalDays"] = ["Goal days must be a positive whole number or null for Forever."];
        }

        return (errors, icon, schedule.Frequency, schedule.CustomDays, startDate);
    }

    public static (
        Dictionary<string, string[]> Errors,
        string Name,
        string? Description,
        HabitIcon Icon,
        HabitFrequency Frequency,
        IReadOnlyList<DayOfWeek> CustomDays,
        DateTime StartDate,
        int? GoalDays) ValidateUpdate(HabitEntity habit, int entryCount, UpdateHabitRequest request)
    {
        var name = request.Name ?? habit.Name;
        var description = request.Description ?? habit.Description;
        var frequency = request.Frequency ?? habit.Frequency.ToString();
        var customDays = request.CustomDays ?? habit.ScheduledCustomDays.Select(day => day.ToString()).ToList();
        var errors = ValidateNameAndDescription(name, description);
        var icon = request.Icon is null ? habit.Icon : ValidateIcon(request.Icon, errors, habit.Icon);
        var schedule = ValidateSchedule(frequency, customDays);
        Merge(errors, schedule.Errors);

        var startDate = request.StartDate is null
            ? habit.StartDate
            : ValidateDate(request.StartDate, "startDate", errors);
        if (request.StartDate is not null
            && startDate != habit.StartDate
            && startDate < HabitStatisticsCalculator.UtcToday())
        {
            errors["startDate"] = ["Start date must be today or a future date."];
        }

        if (entryCount > 0 && startDate != habit.StartDate)
        {
            errors["startDate"] = ["Start date cannot change after the first check-in."];
        }

        var goalDays = request.GoalDaysSpecified ? request.GoalDays : habit.GoalDays;
        if (goalDays is <= 0)
        {
            errors["goalDays"] = ["Goal days must be a positive whole number or null for Forever."];
        }
        else if (goalDays != habit.GoalDays && goalDays.HasValue && goalDays.Value <= entryCount)
        {
            errors["goalDays"] = ["A changed finite goal must be greater than the current check-in count."];
        }

        return (
            errors,
            name,
            description,
            icon,
            schedule.Frequency,
            schedule.CustomDays,
            startDate,
            goalDays);
    }

    private static Dictionary<string, string[]> ValidateNameAndDescription(string name, string? description)
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

        if (!string.IsNullOrWhiteSpace(description) && description.Trim().Length > 2000)
        {
            errors["description"] = ["Description must be at most 2000 characters."];
        }

        return errors;
    }

    private static HabitIcon ValidateIcon(string? icon, Dictionary<string, string[]> errors, HabitIcon fallback)
    {
        if (!string.IsNullOrWhiteSpace(icon) && Enum.TryParse<HabitIcon>(icon.Trim(), ignoreCase: false, out var parsedIcon))
        {
            return parsedIcon;
        }

        errors["icon"] = ["Icon must be Default, Book, Exercise, Water, Meditation, Study, Work, or Health."];
        return fallback;
    }

    private static (Dictionary<string, string[]> Errors, HabitFrequency Frequency, IReadOnlyList<DayOfWeek> CustomDays) ValidateSchedule(
        string? frequency,
        IReadOnlyList<string>? customDays)
    {
        var errors = new Dictionary<string, string[]>();
        if (!Enum.TryParse<HabitFrequency>(frequency, ignoreCase: true, out var parsedFrequency))
        {
            errors["frequency"] = ["Frequency must be Daily or Custom."];
            return (errors, HabitFrequency.Daily, []);
        }

        if (parsedFrequency == HabitFrequency.Daily)
        {
            return (errors, parsedFrequency, []);
        }

        var days = new List<DayOfWeek>();
        foreach (var day in customDays ?? [])
        {
            if (Enum.TryParse<DayOfWeek>(day, ignoreCase: true, out var parsedDay))
            {
                days.Add(parsedDay);
            }
            else
            {
                errors["customDays"] = ["Custom days must be valid weekday names."];
                return (errors, parsedFrequency, []);
            }
        }

        var uniqueDays = days.Distinct().OrderBy(day => (int)day).ToList();
        if (uniqueDays.Count == 0)
        {
            errors["customDays"] = ["Custom habits require at least one scheduled day."];
        }

        return (errors, parsedFrequency, uniqueDays);
    }

    public static (Dictionary<string, string[]> Errors, DateTime MonthStart) ValidateMonth(string? month)
    {
        var errors = new Dictionary<string, string[]>();
        if (!DateTime.TryParseExact(month, MonthFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedMonth))
        {
            errors["month"] = ["month must be in YYYY-MM format."];
        }

        return (
            errors,
            DateTime.SpecifyKind(new DateTime(parsedMonth.Year, parsedMonth.Month, 1), DateTimeKind.Utc));
    }

    public static (Dictionary<string, string[]> Errors, DateTime Date) ValidateToggle(ToggleHabitEntryRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        var parsedDate = ValidateDate(request.Date, "date", errors);
        return (errors, parsedDate);
    }

    private static DateTime ValidateDate(string? value, string field, Dictionary<string, string[]> errors)
    {
        if (DateTime.TryParseExact(value, DateFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
        {
            return DateTime.SpecifyKind(date.Date, DateTimeKind.Utc);
        }

        errors[field] = [$"{field} must be a date in YYYY-MM-DD format."];
        return DateTime.SpecifyKind(DateTime.MinValue.Date, DateTimeKind.Utc);
    }

    public static bool TryParseMonth(string? month, DateTime utcToday, out DateTime monthStart)
    {
        if (string.IsNullOrWhiteSpace(month))
        {
            monthStart = new DateTime(utcToday.Year, utcToday.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            return true;
        }

        if (DateTime.TryParseExact(month, MonthFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
        {
            monthStart = DateTime.SpecifyKind(new DateTime(parsed.Year, parsed.Month, 1), DateTimeKind.Utc);
            return true;
        }

        monthStart = default;
        return false;
    }

    private static void Merge(Dictionary<string, string[]> target, Dictionary<string, string[]> source)
    {
        foreach (var (key, value) in source)
        {
            target[key] = value;
        }
    }
}
