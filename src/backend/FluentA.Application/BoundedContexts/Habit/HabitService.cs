using System.Globalization;
using FluentA.Application.BoundedContexts.Habit.DTOs;
using FluentA.Application.BoundedContexts.Trash;
using FluentA.Application.Common;
using FluentA.Domain.BoundedContexts.Habit.Enums;
using HabitEntity = FluentA.Domain.BoundedContexts.Habit.Entities.Habit;

namespace FluentA.Application.BoundedContexts.Habit;

public sealed partial class HabitService : IHabitService
{
    private const string DateFormat = "yyyy-MM-dd";
    private const string MonthFormat = "yyyy-MM";
    private const string TimeFormat = "HH:mm";
    private readonly IHabitRepository _repository;
    private readonly IHabitSyncNotifier _syncNotifier;
    private readonly ITrashService? _trash;

    public HabitService(IHabitRepository repository, IHabitSyncNotifier? syncNotifier = null, ITrashService? trash = null)
    {
        _repository = repository;
        _syncNotifier = syncNotifier ?? NullHabitSyncNotifier.Instance;
        _trash = trash;
    }

    public async Task<OperationResult<IReadOnlyList<HabitDto>>> ListAsync(
        Guid userId,
        string? timeZoneId,
        string? month = null,
        CancellationToken cancellationToken = default)
    {
        if (!TryFindTimeZone(timeZoneId, out var timeZone))
        {
            return OperationResult<IReadOnlyList<HabitDto>>.Failure(HabitError.Validation(new Dictionary<string, string[]>
            {
                ["timeZoneId"] = ["A valid browser timezone id is required."]
            }));
        }

        var localToday = LocalToday(timeZone!);
        if (!TryParseMonth(month, localToday, out var monthStart))
        {
            return OperationResult<IReadOnlyList<HabitDto>>.Failure(HabitError.Validation(new Dictionary<string, string[]>
            {
                ["month"] = ["month must be in YYYY-MM format."]
            }));
        }

        var habits = await _repository.ListAsync(userId, cancellationToken);
        if (habits.Count == 0)
        {
            return OperationResult<IReadOnlyList<HabitDto>>.Success([]);
        }

        var monthEnd = monthStart.AddMonths(1).AddDays(-1);
        var entryStart = habits.Min(habit => habit.StartDate);
        var entryEnd = monthEnd > localToday ? monthEnd : localToday;
        var entries = await _repository.ListEntriesAsync(
            habits.Select(habit => habit.Id).ToList(),
            entryStart,
            entryEnd,
            cancellationToken);
        var entriesByHabit = entries
            .Where(entry => entry.DeletedAt is null)
            .GroupBy(entry => entry.HabitId)
            .ToDictionary(group => group.Key, group => group.Select(entry => entry.Date.Date).ToHashSet());

        return OperationResult<IReadOnlyList<HabitDto>>.Success(habits
            .Select(habit => ToDto(
                habit,
                localToday,
                entriesByHabit.GetValueOrDefault(habit.Id, []),
                monthStart,
                monthEnd))
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

        var habit = HabitEntity.Create(
            userId,
            request.Name,
            request.Description,
            validation.Icon,
            validation.Frequency,
            validation.CustomDays,
            validation.StartDate,
            request.GoalDays,
            validation.ReminderTime);
        habit.SetReminderEnabled(request.ReminderEnabled);
        await _repository.AddAsync(habit, cancellationToken);

        var localToday = LocalToday(validation.TimeZone!);
        var monthStart = new DateTime(localToday.Year, localToday.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        return OperationResult<HabitDto>.Success(ToDto(habit, localToday, [], monthStart, monthStart.AddMonths(1).AddDays(-1)));
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

        var entryCount = await _repository.CountEntriesAsync(habit.Id, cancellationToken);
        var validation = ValidateUpdate(habit, entryCount, request);
        if (validation.Errors.Count > 0)
        {
            return OperationResult<HabitDto>.Failure(HabitError.Validation(validation.Errors));
        }

        habit.Update(
            validation.Name,
            validation.Description,
            validation.Icon,
            validation.Frequency,
            validation.CustomDays,
            validation.StartDate,
            validation.GoalDays,
            validation.ReminderTime,
            entryCount);
        if (request.ReminderEnabled is not null)
        {
            habit.SetReminderEnabled(request.ReminderEnabled.Value);
        }

        await _repository.UpdateAsync(habit, cancellationToken);

        var timeZone = validation.TimeZone ?? TimeZoneInfo.Utc;
        var localToday = LocalToday(timeZone);
        var monthStart = new DateTime(localToday.Year, localToday.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var entries = entryCount == 0
            ? []
            : await _repository.ListEntriesAsync(habit.Id, habit.StartDate, localToday, cancellationToken);
        var completedDates = entries.Where(entry => entry.DeletedAt is null).Select(entry => entry.Date.Date).ToHashSet();
        return OperationResult<HabitDto>.Success(ToDto(
            habit,
            localToday,
            completedDates,
            monthStart,
            monthStart.AddMonths(1).AddDays(-1)));
    }

    public async Task<OperationResult<TrashEntryDto>> DeleteAsync(Guid userId, Guid habitId, CancellationToken cancellationToken = default)
    {
        if (_trash is not null)
        {
            return await _trash.TrashHabitAsync(userId, habitId, cancellationToken);
        }

        var habit = await _repository.GetAsync(userId, habitId, cancellationToken);
        if (habit is null)
        {
            return OperationResult<TrashEntryDto>.Failure(HabitError.NotFound());
        }

        habit.MoveToTrash(DateTime.UtcNow);
        await _repository.UpdateAsync(habit, cancellationToken);
        return OperationResult<TrashEntryDto>.Success(new TrashEntryDto(Guid.Empty, "Habit", habit.Id, habit.Name, "Habit tracker", DateTime.UtcNow, DateTime.UtcNow));
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
            .Where(entry => entry.DeletedAt is null)
            .OrderBy(entry => entry.Date)
            .Select(entry => new HabitEntryDto(habit.Id, FormatDate(entry.Date), true))
            .ToList());
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

        var localToday = LocalToday(validation.TimeZone!);
        if (validation.Date > localToday)
        {
            return OperationResult<HabitEntryToggleDto>.Failure(HabitError.Validation(new Dictionary<string, string[]>
            {
                ["date"] = ["Future habit dates cannot be toggled."]
            }));
        }

        var mutation = await _repository.ToggleEntryAsync(userId, habitId, validation.Date, cancellationToken);
        var mutationError = MutationError(mutation.Status);
        if (mutationError is not null)
        {
            return OperationResult<HabitEntryToggleDto>.Failure(mutationError);
        }

        var date = FormatDate(validation.Date);
        await _syncNotifier.HabitCheckedAsync(userId, habitId, date, mutation.IsCompleted, cancellationToken);
        return OperationResult<HabitEntryToggleDto>.Success(new HabitEntryToggleDto(
            habitId,
            date,
            mutation.IsCompleted,
            mutation.TotalCheckIns,
            mutation.IsGoalCompleted));
    }

    private static HabitError? MutationError(HabitEntryMutationStatus status)
    {
        return status switch
        {
            HabitEntryMutationStatus.NotFound => HabitError.NotFound(),
            HabitEntryMutationStatus.BeforeStart => HabitError.Validation(new Dictionary<string, string[]>
            {
                ["date"] = ["Habit dates before the start date cannot be toggled."]
            }),
            HabitEntryMutationStatus.Unscheduled => HabitError.Validation(new Dictionary<string, string[]>
            {
                ["date"] = ["This habit is not scheduled for the supplied date."]
            }),
            HabitEntryMutationStatus.GoalReached => HabitError.Validation(new Dictionary<string, string[]>
            {
                ["date"] = ["This habit has already reached its goal."]
            }),
            _ => null
        };
    }

    private static (
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
        if (timeZone is not null && startDate < LocalToday(timeZone))
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

    private static (
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
            && startDate < LocalToday(timeZone))
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

    private static (Dictionary<string, string[]> Errors, DateTime MonthStart, TimeZoneInfo? TimeZone) ValidateMonthAndTimeZone(
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

    private static (Dictionary<string, string[]> Errors, DateTime Date, TimeZoneInfo? TimeZone) ValidateToggle(ToggleHabitEntryRequest request)
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

    private static bool TryParseMonth(string? month, DateTime localToday, out DateTime monthStart)
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

    private static HabitDto ToDto(
        HabitEntity habit,
        DateTime localToday,
        HashSet<DateTime> completedDates,
        DateTime monthStart,
        DateTime monthEnd)
    {
        var totalCheckIns = completedDates.Count;
        var goalCompletedOn = GoalCompletedOn(habit, completedDates);
        var isGoalCompleted = goalCompletedOn.HasValue;
        var streakAsOf = goalCompletedOn.HasValue && goalCompletedOn.Value < localToday
            ? goalCompletedOn.Value
            : localToday;
        var expectedDays = EachDate(monthStart, monthEnd).Count(date => IsSummaryEligible(habit, date, goalCompletedOn));
        var completedExpectedDays = completedDates.Count(date =>
            date >= monthStart
            && date <= monthEnd
            && IsSummaryEligible(habit, date, goalCompletedOn));
        var completionRate = expectedDays == 0
            ? 0
            : Math.Round((double)completedExpectedDays / expectedDays * 100, 2);

        return new HabitDto(
            habit.Id,
            habit.Name,
            habit.Description,
            habit.Icon.ToString(),
            habit.Frequency.ToString(),
            habit.ScheduledCustomDays.Select(day => day.ToString()).ToList(),
            habit.ReminderEnabled,
            FormatDate(habit.StartDate),
            habit.GoalDays,
            habit.ReminderTime.ToString(TimeFormat, CultureInfo.InvariantCulture),
            CurrentStreak(habit, completedDates, streakAsOf),
            LongestStreak(habit, completedDates, streakAsOf),
            totalCheckIns,
            IsSummaryEligible(habit, localToday, goalCompletedOn),
            completedDates.Contains(localToday),
            completionRate,
            isGoalCompleted,
            goalCompletedOn.HasValue ? FormatDate(goalCompletedOn.Value) : null,
            habit.GoalDays.HasValue ? Math.Max(0, habit.GoalDays.Value - totalCheckIns) : null,
            totalCheckIns == 0,
            habit.CreatedAt,
            habit.UpdatedAt);
    }

    private static DateTime? GoalCompletedOn(HabitEntity habit, HashSet<DateTime> completedDates)
    {
        if (!habit.GoalDays.HasValue || completedDates.Count < habit.GoalDays.Value)
        {
            return null;
        }

        return completedDates.OrderBy(date => date).ElementAt(habit.GoalDays.Value - 1);
    }

    private static bool IsSummaryEligible(HabitEntity habit, DateTime date, DateTime? goalCompletedOn)
    {
        return habit.IsEligibleOn(date) && (!goalCompletedOn.HasValue || date <= goalCompletedOn.Value);
    }

    private static int CurrentStreak(HabitEntity habit, HashSet<DateTime> completedDates, DateTime asOfDate)
    {
        if (asOfDate < habit.StartDate)
        {
            return 0;
        }

        var cursor = habit.IsScheduledOn(asOfDate) && completedDates.Contains(asOfDate)
            ? asOfDate
            : asOfDate.AddDays(-1);
        var streak = 0;
        while (cursor >= habit.StartDate)
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

    private static int LongestStreak(HabitEntity habit, HashSet<DateTime> completedDates, DateTime asOfDate)
    {
        if (completedDates.Count == 0 || asOfDate < habit.StartDate)
        {
            return 0;
        }

        var longest = 0;
        var current = 0;
        foreach (var date in EachDate(habit.StartDate, asOfDate))
        {
            if (!habit.IsScheduledOn(date))
            {
                continue;
            }

            if (completedDates.Contains(date))
            {
                current++;
                longest = Math.Max(longest, current);
            }
            else
            {
                current = 0;
            }
        }

        return longest;
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
