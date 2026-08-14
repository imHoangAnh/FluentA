using System.Globalization;
using FluentA.Application.BoundedContexts.Habit.DTOs;
using FluentA.Domain.BoundedContexts.Habit.Enums;
using HabitEntity = FluentA.Domain.BoundedContexts.Habit.Entities.Habit;

namespace FluentA.Application.BoundedContexts.Habit;

internal static class HabitRequestValidator
{
    private const string DateFormat = "yyyy-MM-dd";
    private const string MonthFormat = "yyyy-MM";
    private const string TimeFormat = "HH:mm";
    public static (
        Dictionary<string, string[]> Errors,
        HabitIcon Icon,
        HabitFrequency Frequency,
        IReadOnlyList<DayOfWeek> CustomDays,
        DateTime StartDate,
        TimeOnly ReminderTime,
        TimeZoneInfo? TimeZone) ValidateCreate(CreateHabitRequest request)
    {
        var errors = ValidateNameAndDescription(request.Name, request.Description);
        var icon = ValidateIcon(request.Icon, errors, HabitIcon.Default);
        var schedule = ValidateSchedule(request.Frequency, request.CustomDays);
        Merge(errors, schedule.Errors);

        var timeZone = ValidateTimeZone(request.TimeZoneId, errors, required: true);
        var startDate = ValidateDate(request.StartDate, "startDate", errors);
        if (timeZone is not null && startDate < HabitStatisticsCalculator.LocalToday(timeZone))
        {
            errors["startDate"] = ["Start date must be today or a future date."];
        }

        if (request.GoalDays is <= 0)
        {
            errors["goalDays"] = ["Goal days must be a positive whole number or null for Forever."];
        }

        var reminderTime = ValidateTime(request.ReminderTime, errors, required: true);
        return (errors, icon, schedule.Frequency, schedule.CustomDays, startDate, reminderTime, timeZone);
    }

    public static (
        Dictionary<string, string[]> Errors,
        string Name,
        string? Description,
        HabitIcon Icon,
        HabitFrequency Frequency,
        IReadOnlyList<DayOfWeek> CustomDays,
        DateTime StartDate,
        int? GoalDays,
        TimeOnly ReminderTime,
        TimeZoneInfo? TimeZone) ValidateUpdate(HabitEntity habit, int entryCount, UpdateHabitRequest request)
    {
        var name = request.Name ?? habit.Name;
        var description = request.Description ?? habit.Description;
        var frequency = request.Frequency ?? habit.Frequency.ToString();
        var customDays = request.CustomDays ?? habit.ScheduledCustomDays.Select(day => day.ToString()).ToList();
        var errors = ValidateNameAndDescription(name, description);
        var icon = request.Icon is null ? habit.Icon : ValidateIcon(request.Icon, errors, habit.Icon);
        var schedule = ValidateSchedule(frequency, customDays);
        Merge(errors, schedule.Errors);

        var timeZone = ValidateTimeZone(request.TimeZoneId, errors, required: request.StartDate is not null);
        var startDate = request.StartDate is null
            ? habit.StartDate
            : ValidateDate(request.StartDate, "startDate", errors);
        if (request.StartDate is not null
            && startDate != habit.StartDate
            && timeZone is not null
            && startDate < HabitStatisticsCalculator.LocalToday(timeZone))
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

        var reminderTime = request.ReminderTime is null
            ? habit.ReminderTime
            : ValidateTime(request.ReminderTime, errors, required: true);

        return (
            errors,
            name,
            description,
            icon,
            schedule.Frequency,
            schedule.CustomDays,
            startDate,
            goalDays,
            reminderTime,
            timeZone);
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

    public static (Dictionary<string, string[]> Errors, DateTime MonthStart, TimeZoneInfo? TimeZone) ValidateMonthAndTimeZone(
        string? month,
        string? timeZoneId)
    {
        var errors = new Dictionary<string, string[]>();
        if (!DateTime.TryParseExact(month, MonthFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedMonth))
        {
            errors["month"] = ["month must be in YYYY-MM format."];
        }

        var timeZone = ValidateTimeZone(timeZoneId, errors, required: true);
        return (
            errors,
            DateTime.SpecifyKind(new DateTime(parsedMonth.Year, parsedMonth.Month, 1), DateTimeKind.Utc),
            timeZone);
    }

    public static (Dictionary<string, string[]> Errors, DateTime Date, TimeZoneInfo? TimeZone) ValidateToggle(ToggleHabitEntryRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        var parsedDate = ValidateDate(request.Date, "date", errors);
        var timeZone = ValidateTimeZone(request.TimeZoneId, errors, required: true);
        return (errors, parsedDate, timeZone);
    }

    private static TimeZoneInfo? ValidateTimeZone(
        string? timeZoneId,
        Dictionary<string, string[]> errors,
        bool required)
    {
        if (string.IsNullOrWhiteSpace(timeZoneId) && !required)
        {
            return null;
        }

        if (TryFindTimeZone(timeZoneId, out var timeZone))
        {
            return timeZone;
        }

        errors["timeZoneId"] = ["A valid browser timezone id is required."];
        return null;
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

    private static TimeOnly ValidateTime(string? value, Dictionary<string, string[]> errors, bool required)
    {
        if (!string.IsNullOrWhiteSpace(value)
            && TimeOnly.TryParseExact(value, TimeFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out var time))
        {
            return time;
        }

        if (required)
        {
            errors["reminderTime"] = ["Reminder time must be in 24-hour HH:mm format."];
        }

        return new TimeOnly(20, 0);
    }

    public static bool TryFindTimeZone(string? timeZoneId, out TimeZoneInfo? timeZone)
    {
        timeZone = null;
        if (string.IsNullOrWhiteSpace(timeZoneId))
        {
            return false;
        }

        try
        {
            timeZone = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId.Trim());
            return true;
        }
        catch (TimeZoneNotFoundException)
        {
            return false;
        }
        catch (InvalidTimeZoneException)
        {
            return false;
        }
    }

    public static bool TryParseMonth(string? month, DateTime localToday, out DateTime monthStart)
    {
        if (string.IsNullOrWhiteSpace(month))
        {
            monthStart = new DateTime(localToday.Year, localToday.Month, 1, 0, 0, 0, DateTimeKind.Utc);
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
