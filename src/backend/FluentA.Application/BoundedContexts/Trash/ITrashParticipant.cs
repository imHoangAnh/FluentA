using FluentA.Application.Common;
using FluentA.Domain.BoundedContexts.Trash.Entities;
using FluentA.Domain.BoundedContexts.Trash.Enums;

namespace FluentA.Application.BoundedContexts.Trash;

/// <summary>
/// Owns the feature-specific rows that belong to a unified Trash entry.
/// The coordinator owns entry claims and transaction boundaries; participants
/// own feature authorization and aggregate mutation.
/// </summary>
public interface ITrashParticipant
{
    TrashEntityKind EntityKind { get; }

    Task<OperationResult<TrashEntry>> MoveToTrashAsync(
        Guid userId,
        Guid entityId,
        DateTime nowUtc,
        TimeSpan retention,
        CancellationToken cancellationToken = default);

    Task<bool> RestoreAsync(TrashEntry entry, DateTime nowUtc, TimeZoneInfo? timeZone, CancellationToken cancellationToken = default);

    Task<bool> PermanentlyDeleteAsync(TrashEntry entry, DateTime nowUtc, CancellationToken cancellationToken = default);
}
