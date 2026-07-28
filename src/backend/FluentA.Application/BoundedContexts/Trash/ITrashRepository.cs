using FluentA.Domain.BoundedContexts.Trash.Entities;
using FluentA.Domain.BoundedContexts.Trash.Enums;

namespace FluentA.Application.BoundedContexts.Trash;

public interface ITrashRepository
{
    Task AddAsync(TrashEntry entry, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<TrashEntry>> ListActiveAsync(Guid userId, TrashEntityKind? kind, string? search, int limit, CancellationToken cancellationToken = default);
    Task<TrashEntry?> ClaimOwnedAsync(Guid userId, Guid entryId, TrashEntryState claimState, DateTime nowUtc, CancellationToken cancellationToken = default);
    Task<TrashEntry?> ClaimDueAsync(Guid entryId, DateTime nowUtc, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Guid>> ListDueEntryIdsAsync(DateTime nowUtc, int limit, CancellationToken cancellationToken = default);
    Task UpdateAsync(TrashEntry entry, CancellationToken cancellationToken = default);
    Task RemoveAsync(TrashEntry entry, CancellationToken cancellationToken = default);

    /// <summary>
    /// Removes still-active registry entries for descendants that are physically
    /// removed as part of a parent aggregate purge. The parent claim is not
    /// active, so it remains owned by the coordinator until its normal removal.
    /// </summary>
    Task RemoveActiveByEntityIdsAsync(Guid userId, TrashEntityKind kind, IReadOnlyCollection<Guid> entityIds, CancellationToken cancellationToken = default)
        => Task.CompletedTask;
}
