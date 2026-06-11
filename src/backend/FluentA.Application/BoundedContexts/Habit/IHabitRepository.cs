using FluentA.Domain.BoundedContexts.Habit.Entities;

namespace FluentA.Application.BoundedContexts.Habit;

public interface IHabitRepository
{
    Task<IReadOnlyList<Domain.BoundedContexts.Habit.Entities.Habit>> ListAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<Domain.BoundedContexts.Habit.Entities.Habit?> GetAsync(Guid userId, Guid habitId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<HabitEntry>> ListEntriesAsync(Guid habitId, DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<HabitEntry>> ListEntriesAsync(IReadOnlyCollection<Guid> habitIds, DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default);
    Task AddAsync(Domain.BoundedContexts.Habit.Entities.Habit habit, CancellationToken cancellationToken = default);
    Task UpdateAsync(Domain.BoundedContexts.Habit.Entities.Habit habit, CancellationToken cancellationToken = default);
    Task<bool> ToggleEntryAsync(Guid habitId, DateTime date, CancellationToken cancellationToken = default);
}
