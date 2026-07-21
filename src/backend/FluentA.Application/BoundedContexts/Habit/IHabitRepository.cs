using FluentA.Domain.BoundedContexts.Habit.Entities;

namespace FluentA.Application.BoundedContexts.Habit;

public interface IHabitRepository
{
    Task<IReadOnlyList<Domain.BoundedContexts.Habit.Entities.Habit>> ListAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<Domain.BoundedContexts.Habit.Entities.Habit?> GetAsync(Guid userId, Guid habitId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<HabitEntry>> ListEntriesAsync(Guid habitId, DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<HabitEntry>> ListEntriesAsync(IReadOnlyCollection<Guid> habitIds, DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default);
    Task<int> CountEntriesAsync(Guid habitId, CancellationToken cancellationToken = default);
    Task AddAsync(Domain.BoundedContexts.Habit.Entities.Habit habit, CancellationToken cancellationToken = default);
    Task UpdateAsync(Domain.BoundedContexts.Habit.Entities.Habit habit, CancellationToken cancellationToken = default);
    Task<HabitEntryMutationResult> ToggleEntryAsync(Guid userId, Guid habitId, DateTime date, CancellationToken cancellationToken = default);
}

public enum HabitEntryMutationStatus
{
    Checked,
    Unchecked,
    NotFound,
    BeforeStart,
    Unscheduled,
    GoalReached
}

public sealed record HabitEntryMutationResult(
    HabitEntryMutationStatus Status,
    int TotalCheckIns,
    int? GoalDays)
{
    public bool IsCompleted => Status == HabitEntryMutationStatus.Checked;
    public bool IsGoalCompleted => GoalDays.HasValue && TotalCheckIns >= GoalDays.Value;
}
