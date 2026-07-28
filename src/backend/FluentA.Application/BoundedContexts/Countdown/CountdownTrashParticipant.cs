using FluentA.Application.BoundedContexts.Assets;
using FluentA.Application.BoundedContexts.Trash;
using FluentA.Application.Common;
using FluentA.Domain.BoundedContexts.Assets.Enums;
using FluentA.Domain.BoundedContexts.Countdown.Entities;
using FluentA.Domain.BoundedContexts.Trash.Entities;
using FluentA.Domain.BoundedContexts.Trash.Enums;

namespace FluentA.Application.BoundedContexts.Countdown;

public sealed class CountdownTrashParticipant : ITrashParticipant
{
    private readonly ICountdownRepository _countdowns;
    private readonly IAssetRepository _assets;

    public CountdownTrashParticipant(ICountdownRepository countdowns, IAssetRepository assets)
    {
        _countdowns = countdowns;
        _assets = assets;
    }

    public TrashEntityKind EntityKind => TrashEntityKind.Countdown;

    public async Task<OperationResult<TrashEntry>> MoveToTrashAsync(Guid userId, Guid entityId, DateTime nowUtc, TimeSpan retention, CancellationToken cancellationToken = default)
    {
        var countdown = await _countdowns.GetAsync(userId, entityId, cancellationToken);
        if (countdown is null)
        {
            return OperationResult<TrashEntry>.Failure(TrashError.NotFound());
        }

        // Keep the cover relationship and Ready asset through the retention window.
        // Alerts are soft-deleted and therefore never restore.
        countdown.SoftDelete(nowUtc, deleteAlerts: true);
        await _countdowns.UpdateAsync(countdown, cancellationToken);
        return OperationResult<TrashEntry>.Success(TrashEntry.Create(
            userId, EntityKind, countdown.Id, countdown.Name, "Countdown", nowUtc, retention));
    }

    public async Task<bool> RestoreAsync(TrashEntry entry, DateTime nowUtc, TimeZoneInfo? timeZone, CancellationToken cancellationToken = default)
    {
        var countdown = await _countdowns.GetTrashedAsync(entry.UserId, entry.EntityId, entry.TrashedAt, cancellationToken);
        if (countdown is null)
        {
            return false;
        }

        countdown.RestoreFromTrash(nowUtc);
        await _countdowns.UpdateAsync(countdown, cancellationToken);
        return true;
    }

    public async Task<bool> PermanentlyDeleteAsync(TrashEntry entry, DateTime nowUtc, CancellationToken cancellationToken = default)
    {
        var countdown = await _countdowns.GetTrashedAsync(entry.UserId, entry.EntityId, entry.TrashedAt, cancellationToken);
        if (countdown is null)
        {
            return true;
        }

        if (countdown.CoverAssetId.HasValue)
        {
            var cover = await _assets.GetOwnedAsync(entry.UserId, countdown.CoverAssetId.Value, cancellationToken);
            if (cover is not null && cover.Type == AssetType.CountdownCover && cover.Status == AssetStatus.Ready)
            {
                cover.Archive(nowUtc, TimeSpan.Zero);
                await _assets.UpdateAsync(cover, cancellationToken);
            }
        }

        countdown.DetachCover();
        await _countdowns.RemoveAsync(countdown, cancellationToken);
        return true;
    }
}
