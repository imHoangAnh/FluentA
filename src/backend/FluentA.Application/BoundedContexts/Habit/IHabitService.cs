using FluentA.Application.BoundedContexts.Habit.DTOs;
using FluentA.Application.Common;

namespace FluentA.Application.BoundedContexts.Habit;

public interface IHabitService
{
    /// <summary>Lists habits with learner-local summary fields for the authenticated user.</summary>
    Task<OperationResult<IReadOnlyList<HabitDto>>> ListAsync(Guid userId, string? timeZoneId, string? month = null, CancellationToken cancellationToken = default);

    /// <summary>Creates a habit for the authenticated user.</summary>
    Task<OperationResult<HabitDto>> CreateAsync(Guid userId, CreateHabitRequest request, CancellationToken cancellationToken = default);

    /// <summary>Updates supplied fields on an owned habit.</summary>
    Task<OperationResult<HabitDto>> UpdateAsync(Guid userId, Guid habitId, UpdateHabitRequest request, CancellationToken cancellationToken = default);

    /// <summary>Soft-deletes an owned habit.</summary>
    Task<OperationResult<bool>> DeleteAsync(Guid userId, Guid habitId, CancellationToken cancellationToken = default);

    /// <summary>Lists completed entries for one owned habit and calendar month.</summary>
    Task<OperationResult<IReadOnlyList<HabitEntryDto>>> ListEntriesAsync(Guid userId, Guid habitId, string? month, string? timeZoneId, CancellationToken cancellationToken = default);

    /// <summary>Toggles completion for one eligible owned habit date.</summary>
    Task<OperationResult<HabitEntryToggleDto>> ToggleEntryAsync(Guid userId, Guid habitId, ToggleHabitEntryRequest request, CancellationToken cancellationToken = default);
}
