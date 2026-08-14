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
        if (!HabitRequestValidator.TryFindTimeZone(timeZoneId, out var timeZone))
        {
            return OperationResult<IReadOnlyList<HabitDto>>.Failure(HabitError.Validation(new Dictionary<string, string[]>
            {
                ["timeZoneId"] = ["A valid browser timezone id is required."]
            }));
        }

        var localToday = HabitStatisticsCalculator.LocalToday(timeZone!);
        if (!HabitRequestValidator.TryParseMonth(month, localToday, out var monthStart))
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
            .Select(habit => HabitStatisticsCalculator.ToDto(
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
        var validation = HabitRequestValidator.ValidateCreate(request);
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

        var localToday = HabitStatisticsCalculator.LocalToday(validation.TimeZone!);
        var monthStart = new DateTime(localToday.Year, localToday.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        return OperationResult<HabitDto>.Success(HabitStatisticsCalculator.ToDto(habit, localToday, [], monthStart, monthStart.AddMonths(1).AddDays(-1)));
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
        var validation = HabitRequestValidator.ValidateUpdate(habit, entryCount, request);
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
        var localToday = HabitStatisticsCalculator.LocalToday(timeZone);
        var monthStart = new DateTime(localToday.Year, localToday.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var entries = entryCount == 0
            ? []
            : await _repository.ListEntriesAsync(habit.Id, habit.StartDate, localToday, cancellationToken);
        var completedDates = entries.Where(entry => entry.DeletedAt is null).Select(entry => entry.Date.Date).ToHashSet();
        return OperationResult<HabitDto>.Success(HabitStatisticsCalculator.ToDto(
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
        var validation = HabitRequestValidator.ValidateMonthAndTimeZone(month, timeZoneId);
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
            .Select(entry => new HabitEntryDto(habit.Id, HabitStatisticsCalculator.FormatDate(entry.Date), true))
            .ToList());
    }

    public async Task<OperationResult<HabitEntryToggleDto>> ToggleEntryAsync(
        Guid userId,
        Guid habitId,
        ToggleHabitEntryRequest request,
        CancellationToken cancellationToken = default)
    {
        var validation = HabitRequestValidator.ValidateToggle(request);
        if (validation.Errors.Count > 0)
        {
            return OperationResult<HabitEntryToggleDto>.Failure(HabitError.Validation(validation.Errors));
        }

        var localToday = HabitStatisticsCalculator.LocalToday(validation.TimeZone!);
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

        var date = HabitStatisticsCalculator.FormatDate(validation.Date);
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

    private static void Merge(Dictionary<string, string[]> target, Dictionary<string, string[]> source)
    {
        foreach (var (key, value) in source)
        {
            target[key] = value;
        }
    }
}
