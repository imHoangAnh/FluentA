using System.Globalization;
using FluentA.Application.BoundedContexts.Habit.DTOs;
using FluentA.Application.Common;
using FluentA.Domain.BoundedContexts.Habit.Enums;
using HabitEntity = FluentA.Domain.BoundedContexts.Habit.Entities.Habit;

namespace FluentA.Application.BoundedContexts.Habit;

public sealed partial class HabitService : IHabitService
{
    private const string DateFormat = "yyyy-MM-dd";
    private const string MonthFormat = "yyyy-MM";
    private readonly IHabitRepository _repository;
    private readonly IHabitSyncNotifier _syncNotifier;

    public HabitService(IHabitRepository repository, IHabitSyncNotifier? syncNotifier = null)
    {
        _repository = repository;
        _syncNotifier = syncNotifier ?? NullHabitSyncNotifier.Instance;
    }

    public async Task<OperationResult<IReadOnlyList<HabitDto>>> ListAsync(
        Guid userId,
        string? timeZoneId,
        CancellationToken cancellationToken = default)
    {
        if (!TryFindTimeZone(timeZoneId, out var timeZone))
        {
            return OperationResult<IReadOnlyList<HabitDto>>.Failure(HabitError.Validation(new Dictionary<string, string[]>
            {
                ["timeZoneId"] = ["A valid browser timezone id is required."]
            }));
        }

        var habits = await _repository.ListAsync(userId, cancellationToken);
        var localToday = LocalToday(timeZone!);
        var monthStart = new DateTime(localToday.Year, localToday.Month, 1);
        var monthEnd = monthStart.AddMonths(1).AddDays(-1);
        var streakStart = localToday.AddYears(-5);
        var entries = habits.Count == 0
            ? []
            : await _repository.ListEntriesAsync(habits.Select(habit => habit.Id).ToList(), streakStart, monthEnd, cancellationToken);
        var entriesByHabit = entries.GroupBy(entry => entry.HabitId).ToDictionary(group => group.Key, group => group.Select(entry => entry.Date.Date).ToHashSet());

        return OperationResult<IReadOnlyList<HabitDto>>.Success(habits
            .Select(habit => ToDto(habit, localToday, entriesByHabit.GetValueOrDefault(habit.Id, []), monthStart, monthEnd))
            .ToList());
    }

    public async Task<OperationResult<HabitDto>> CreateAsync(
        Guid userId,
        CreateHabitRequest request,
        CancellationToken cancellationToken = default)
    {
        var validation = ValidateCreate(request);
        if (validation.Errors.Count > 0)
        {
            return OperationResult<HabitDto>.Failure(HabitError.Validation(validation.Errors));
        }

        var habit = HabitEntity.Create(userId, request.Name, request.Description, validation.Icon, validation.Frequency, validation.CustomDays);
        habit.SetReminderEnabled(request.ReminderEnabled);
        await _repository.AddAsync(habit, cancellationToken);
        return OperationResult<HabitDto>.Success(ToDto(habit, DateTime.UtcNow.Date, [], DateTime.UtcNow.Date, DateTime.UtcNow.Date));
    }

    public async Task<OperationResult<HabitDto>> UpdateAsync(
        Guid userId,
        Guid habitId,
        UpdateHabitRequest request,
        CancellationToken cancellationToken = default)
    {
        var habit = await _repository.GetAsync(userId, habitId, cancellationToken);
        if (habit is null)
        {
            return OperationResult<HabitDto>.Failure(HabitError.NotFound());
        }

        var validation = ValidateUpdate(habit, request);
        if (validation.Errors.Count > 0)
        {
            return OperationResult<HabitDto>.Failure(HabitError.Validation(validation.Errors));
        }

        habit.Update(
            validation.Name,
            validation.Description,
            validation.Icon,
            validation.Frequency,
            validation.CustomDays);
        if (request.ReminderEnabled is not null)
        {
            habit.SetReminderEnabled(request.ReminderEnabled.Value);
        }

        await _repository.UpdateAsync(habit, cancellationToken);
        return OperationResult<HabitDto>.Success(ToDto(habit, DateTime.UtcNow.Date, [], DateTime.UtcNow.Date, DateTime.UtcNow.Date));
    }

    public async Task<OperationResult<bool>> DeleteAsync(Guid userId, Guid habitId, CancellationToken cancellationToken = default)
    {
        var habit = await _repository.GetAsync(userId, habitId, cancellationToken);
        if (habit is null)
        {
            return OperationResult<bool>.Failure(HabitError.NotFound());
        }

        habit.SoftDelete();
        await _repository.UpdateAsync(habit, cancellationToken);
        return OperationResult<bool>.Success(true);
    }

    public async Task<OperationResult<IReadOnlyList<HabitEntryDto>>> ListEntriesAsync(
        Guid userId,
        Guid habitId,
        string? month,
        string? timeZoneId,
        CancellationToken cancellationToken = default)
    {
        var validation = ValidateMonthAndTimeZone(month, timeZoneId);
        if (validation.Errors.Count > 0)
        {
            return OperationResult<IReadOnlyList<HabitEntryDto>>.Failure(HabitError.Validation(validation.Errors));
        }

        var habit = await _repository.GetAsync(userId, habitId, cancellationToken);
        if (habit is null)
        {
            return OperationResult<IReadOnlyList<HabitEntryDto>>.Failure(HabitError.NotFound());
        }

        var monthStart = validation.MonthStart;
        var monthEnd = monthStart.AddMonths(1).AddDays(-1);
        var entries = await _repository.ListEntriesAsync(habit.Id, monthStart, monthEnd, cancellationToken);
        return OperationResult<IReadOnlyList<HabitEntryDto>>.Success(entries
            .OrderBy(entry => entry.Date)
            .Select(entry => new HabitEntryDto(habit.Id, FormatDate(entry.Date), true))
            .ToList());
    }

    public async Task<OperationResult<HabitStatsDto>> GetStatsAsync(
        Guid userId,
        Guid habitId,
        string? timeZoneId,
        CancellationToken cancellationToken = default)
    {
        if (!TryFindTimeZone(timeZoneId, out var timeZone))
        {
            return OperationResult<HabitStatsDto>.Failure(HabitError.Validation(new Dictionary<string, string[]>
            {
                ["timeZoneId"] = ["A valid browser timezone id is required."]
            }));
        }

        var habit = await _repository.GetAsync(userId, habitId, cancellationToken);
        if (habit is null)
        {
            return OperationResult<HabitStatsDto>.Failure(HabitError.NotFound());
        }

        var localToday = LocalToday(timeZone!);
        var historyStart = localToday.AddYears(-10);
        var entries = await _repository.ListEntriesAsync(habit.Id, historyStart, localToday, cancellationToken);
        var completedDates = entries.Select(entry => entry.Date.Date).ToHashSet();

        return OperationResult<HabitStatsDto>.Success(ToStatsDto(habit, localToday, completedDates));
    }

    public async Task<OperationResult<HabitEntryToggleDto>> ToggleEntryAsync(
        Guid userId,
        Guid habitId,
        ToggleHabitEntryRequest request,
        CancellationToken cancellationToken = default)
    {
        var validation = ValidateToggle(request);
        if (validation.Errors.Count > 0)
        {
            return OperationResult<HabitEntryToggleDto>.Failure(HabitError.Validation(validation.Errors));
        }

        var habit = await _repository.GetAsync(userId, habitId, cancellationToken);
        if (habit is null)
        {
            return OperationResult<HabitEntryToggleDto>.Failure(HabitError.NotFound());
        }

        var localToday = LocalToday(validation.TimeZone!);
        if (validation.Date > localToday)
        {
            return OperationResult<HabitEntryToggleDto>.Failure(HabitError.Validation(new Dictionary<string, string[]>
            {
                ["date"] = ["Future habit dates cannot be toggled."]
            }));
        }

        if (!habit.IsScheduledOn(validation.Date))
        {
            return OperationResult<HabitEntryToggleDto>.Failure(HabitError.Validation(new Dictionary<string, string[]>
            {
                ["date"] = ["This habit is not scheduled for the supplied date."]
            }));
        }

        var isCompleted = await _repository.ToggleEntryAsync(habit.Id, validation.Date, cancellationToken);
        var date = FormatDate(validation.Date);
        await _syncNotifier.HabitCheckedAsync(userId, habit.Id, date, isCompleted, cancellationToken);
        return OperationResult<HabitEntryToggleDto>.Success(new HabitEntryToggleDto(habit.Id, date, isCompleted));
    }

    private static (Dictionary<string, string[]> Errors, HabitIcon Icon, HabitFrequency Frequency, IReadOnlyList<DayOfWeek> CustomDays) ValidateCreate(CreateHabitRequest request)
    {
        var errors = ValidateNameAndDescription(request.Name, request.Description);
        var icon = ValidateIcon(request.Icon, errors, HabitIcon.Default);
        var schedule = ValidateSchedule(request.Frequency, request.CustomDays);
        Merge(errors, schedule.Errors);
        return (errors, icon, schedule.Frequency, schedule.CustomDays);
    }

    private static (Dictionary<string, string[]> Errors, string Name, string? Description, HabitIcon Icon, HabitFrequency Frequency, IReadOnlyList<DayOfWeek> CustomDays) ValidateUpdate(HabitEntity habit, UpdateHabitRequest request)
    {
        var name = request.Name ?? habit.Name;
        var description = request.Description ?? habit.Description;
        var frequency = request.Frequency ?? habit.Frequency.ToString();
        var customDays = request.CustomDays ?? habit.ScheduledCustomDays.Select(day => day.ToString()).ToList();
        var errors = ValidateNameAndDescription(name, description);
        var icon = request.Icon is null ? habit.Icon : ValidateIcon(request.Icon, errors, habit.Icon);
        var schedule = ValidateSchedule(frequency, customDays);
        Merge(errors, schedule.Errors);
        return (errors, name, description, icon, schedule.Frequency, schedule.CustomDays);
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

    private static (Dictionary<string, string[]> Errors, HabitFrequency Frequency, IReadOnlyList<DayOfWeek> CustomDays) ValidateSchedule(string? frequency, IReadOnlyList<string>? customDays)
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

    private static (Dictionary<string, string[]> Errors, DateTime MonthStart, TimeZoneInfo? TimeZone) ValidateMonthAndTimeZone(string? month, string? timeZoneId)
    {
        var errors = new Dictionary<string, string[]>();
        if (!DateTime.TryParseExact(month, MonthFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedMonth))
        {
            errors["month"] = ["month must be in YYYY-MM format."];
        }

        if (!TryFindTimeZone(timeZoneId, out var timeZone))
        {
            errors["timeZoneId"] = ["A valid browser timezone id is required."];
        }

        return (errors, DateTime.SpecifyKind(new DateTime(parsedMonth.Year, parsedMonth.Month, 1), DateTimeKind.Utc), timeZone);
    }

    private static (Dictionary<string, string[]> Errors, DateTime Date, TimeZoneInfo? TimeZone) ValidateToggle(ToggleHabitEntryRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        if (!DateTime.TryParseExact(request.Date, DateFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedDate))
        {
            errors["date"] = ["date must be a date in YYYY-MM-DD format."];
        }

        if (!TryFindTimeZone(request.TimeZoneId, out var timeZone))
        {
            errors["timeZoneId"] = ["A valid browser timezone id is required."];
        }

        return (errors, DateTime.SpecifyKind(parsedDate.Date, DateTimeKind.Utc), timeZone);
    }

    private static bool TryFindTimeZone(string? timeZoneId, out TimeZoneInfo? timeZone)
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

    private static HabitDto ToDto(HabitEntity habit, DateTime localToday, HashSet<DateTime> completedDates, DateTime monthStart, DateTime monthEnd)
    {
        var isScheduledToday = habit.IsScheduledOn(localToday);
        var expectedDays = EachDate(monthStart, monthEnd).Count(habit.IsScheduledOn);
        var completedExpectedDays = completedDates.Count(date => date >= monthStart && date <= monthEnd && habit.IsScheduledOn(date));
        var completionRate = expectedDays == 0 ? 0 : Math.Round((double)completedExpectedDays / expectedDays * 100, 2);
        return new HabitDto(
            habit.Id,
            habit.Name,
            habit.Description,
            habit.Icon.ToString(),
            habit.Frequency.ToString(),
            habit.ScheduledCustomDays.Select(day => day.ToString()).ToList(),
            habit.ReminderEnabled,
            CurrentStreak(habit, completedDates, localToday),
            isScheduledToday,
            completedDates.Contains(localToday),
            completionRate,
            habit.CreatedAt,
            habit.UpdatedAt);
    }

    private static HabitStatsDto ToStatsDto(HabitEntity habit, DateTime localToday, HashSet<DateTime> completedDates)
    {
        var sevenDayWindow = CompletionWindow(habit, completedDates, localToday.AddDays(-6), localToday);
        var thirtyDayWindow = CompletionWindow(habit, completedDates, localToday.AddDays(-29), localToday);
        return new HabitStatsDto(
            habit.Id,
            habit.Name,
            habit.Description,
            habit.Icon.ToString(),
            habit.Frequency.ToString(),
            habit.ScheduledCustomDays.Select(day => day.ToString()).ToList(),
            CurrentStreak(habit, completedDates, localToday),
            LongestStreak(habit, completedDates, localToday),
            sevenDayWindow.CompletionRate,
            sevenDayWindow.Completed,
            sevenDayWindow.Scheduled,
            thirtyDayWindow.CompletionRate,
            thirtyDayWindow.Completed,
            thirtyDayWindow.Scheduled,
            FormatDate(localToday));
    }

    private static int CurrentStreak(HabitEntity habit, HashSet<DateTime> completedDates, DateTime localToday)
    {
        var cursor = habit.IsScheduledOn(localToday) && completedDates.Contains(localToday)
            ? localToday
            : localToday.AddDays(-1);
        var streak = 0;
        while (cursor >= localToday.AddYears(-5))
        {
            if (!habit.IsScheduledOn(cursor))
            {
                cursor = cursor.AddDays(-1);
                continue;
            }

            if (!completedDates.Contains(cursor))
            {
                break;
            }

            streak++;
            cursor = cursor.AddDays(-1);
        }

        return streak;
    }

    private static int LongestStreak(HabitEntity habit, HashSet<DateTime> completedDates, DateTime localToday)
    {
        if (completedDates.Count == 0)
        {
            return 0;
        }

        var start = completedDates.Min();
        var longest = 0;
        var current = 0;

        foreach (var date in EachDate(start, localToday))
        {
            if (!habit.IsScheduledOn(date))
            {
                continue;
            }

            if (completedDates.Contains(date))
            {
                current++;
                longest = Math.Max(longest, current);
                continue;
            }

            current = 0;
        }

        return longest;
    }

    private static (int Completed, int Scheduled, double CompletionRate) CompletionWindow(
        HabitEntity habit,
        HashSet<DateTime> completedDates,
        DateTime start,
        DateTime end)
    {
        var scheduled = EachDate(start, end).Where(habit.IsScheduledOn).ToList();
        var completed = scheduled.Count(completedDates.Contains);
        var rate = scheduled.Count == 0 ? 0 : Math.Round((double)completed / scheduled.Count * 100, 2);
        return (completed, scheduled.Count, rate);
    }

    private static IEnumerable<DateTime> EachDate(DateTime start, DateTime end)
    {
        for (var date = start.Date; date <= end.Date; date = date.AddDays(1))
        {
            yield return date;
        }
    }

    private static DateTime LocalToday(TimeZoneInfo timeZone)
    {
        return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, timeZone).Date;
    }

    private static string FormatDate(DateTime date)
    {
        return date.ToString(DateFormat, CultureInfo.InvariantCulture);
    }

    private static void Merge(Dictionary<string, string[]> target, Dictionary<string, string[]> source)
    {
        foreach (var (key, value) in source)
        {
            target[key] = value;
        }
    }

}
