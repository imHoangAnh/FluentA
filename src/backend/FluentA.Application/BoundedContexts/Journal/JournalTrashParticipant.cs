using FluentA.Application.BoundedContexts.Trash;
using FluentA.Application.Common;
using FluentA.Domain.BoundedContexts.Trash.Entities;
using FluentA.Domain.BoundedContexts.Trash.Enums;

namespace FluentA.Application.BoundedContexts.Journal;

public sealed class JournalTrashParticipant(IJournalRepository journals) : ITrashParticipant
{
    public TrashEntityKind EntityKind => TrashEntityKind.Journal;

    public async Task<OperationResult<TrashEntry>> MoveToTrashAsync(Guid userId, Guid entityId, DateTime nowUtc, TimeSpan retention, CancellationToken cancellationToken = default)
    {
        var entry = await journals.GetAsync(userId, entityId, cancellationToken);
        if (entry is null) return OperationResult<TrashEntry>.Failure(TrashError.NotFound());
        entry.SoftDelete(nowUtc);
        await journals.UpdateAsync(entry, cancellationToken);
        return OperationResult<TrashEntry>.Success(TrashEntry.Create(userId, EntityKind, entry.Id, entry.Title, entry.Date.ToString("yyyy-MM-dd"), nowUtc, retention));
    }

    public async Task<bool> RestoreAsync(TrashEntry entry, DateTime nowUtc, TimeZoneInfo? timeZone, CancellationToken cancellationToken = default)
    {
        var journal = await journals.GetTrashedAsync(entry.UserId, entry.EntityId, entry.TrashedAt, cancellationToken);
        if (journal is null) return false;
        journal.RestoreFromTrash(nowUtc);
        await journals.UpdateAsync(journal, cancellationToken);
        return true;
    }

    public async Task<bool> PermanentlyDeleteAsync(TrashEntry entry, DateTime nowUtc, CancellationToken cancellationToken = default)
    {
        var journal = await journals.GetTrashedAsync(entry.UserId, entry.EntityId, entry.TrashedAt, cancellationToken);
        if (journal is not null) await journals.RemoveAsync(journal, cancellationToken);
        return true;
    }
}
