using FluentA.Application.BoundedContexts.Habit.DTOs;
using FluentA.Application.Common;
using HabitEntity = FluentA.Domain.BoundedContexts.Habit.Entities.Habit;

namespace FluentA.Application.BoundedContexts.Habit;

public sealed class HabitService : IHabitService
{
    private readonly IHabitRepository _repository;

    public HabitService(IHabitRepository repository)
    {
        _repository = repository;
    }

    public async Task<OperationResult<IReadOnlyList<HabitDto>>> ListAsync(
        Guid userId,
        string? month = null,
        CancellationToken cancellationToken = default)
    {
        var utcToday = HabitStatisticsCalculator.UtcToday();
        if (!HabitRequestValidator.TryParseMonth(month, utcToday, out var monthStart))
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
        var entryEnd = monthEnd > utcToday ? monthEnd : utcToday;
        var entries = await _repository.ListCheckInDatesAsync(
            habits.Select(habit => habit.Id).ToList(),
            entryStart,
            entryEnd,
            cancellationToken);
        var entriesByHabit = entries
            .GroupBy(entry => entry.HabitId)
            .ToDictionary(group => group.Key, group => group.Select(entry => entry.Date.Date).ToHashSet());

        return OperationResult<IReadOnlyList<HabitDto>>.Success(habits
            .Select(habit => HabitStatisticsCalculator.ToDto(
                habit,
                utcToday,
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
            request.GoalDays);
        await _repository.AddAsync(habit, cancellationToken);

        var utcToday = HabitStatisticsCalculator.UtcToday();
        var monthStart = new DateTime(utcToday.Year, utcToday.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        return OperationResult<HabitDto>.Success(HabitStatisticsCalculator.ToDto(habit, utcToday, [], monthStart, monthStart.AddMonths(1).AddDays(-1)));
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
            entryCount);

        await _repository.UpdateAsync(habit, cancellationToken);

        var utcToday = HabitStatisticsCalculator.UtcToday();
        var monthStart = new DateTime(utcToday.Year, utcToday.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var entries = entryCount == 0
            ? []
            : await _repository.ListCheckInDatesAsync([habit.Id], habit.StartDate, utcToday, cancellationToken);
        var completedDates = entries.Select(entry => entry.Date.Date).ToHashSet();
        return OperationResult<HabitDto>.Success(HabitStatisticsCalculator.ToDto(
            habit,
            utcToday,
            completedDates,
            monthStart,
            monthStart.AddMonths(1).AddDays(-1)));
    }

    public async Task<OperationResult<bool>> DeleteAsync(Guid userId, Guid habitId, CancellationToken cancellationToken = default)
    {
        var deleted = await _repository.SoftDeleteAsync(userId, habitId, DateTime.UtcNow, cancellationToken);
        return deleted
            ? OperationResult<bool>.Success(true)
            : OperationResult<bool>.Failure(HabitError.NotFound());
    }

    public async Task<OperationResult<IReadOnlyList<HabitEntryDto>>> ListEntriesAsync(
        Guid userId,
        Guid habitId,
        string? month,
        CancellationToken cancellationToken = default)
    {
        var validation = HabitRequestValidator.ValidateMonth(month);
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

        var utcToday = HabitStatisticsCalculator.UtcToday();
        if (validation.Date > utcToday)
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
}
