using FluentA.Application.BoundedContexts.Assets;
using FluentA.Application.BoundedContexts.Trash;
using FluentA.Application.Common;
using FluentA.Domain.BoundedContexts.Assets.Enums;
using FluentA.Domain.BoundedContexts.Trash.Entities;
using FluentA.Domain.BoundedContexts.Trash.Enums;

namespace FluentA.Application.BoundedContexts.Note;

public sealed class NoteTrashParticipant : ITrashParticipant
{
    private readonly INoteRepository _notes;
    private readonly IAssetRepository _assets;
    private readonly ITrashRepository? _trash;

    public NoteTrashParticipant(INoteRepository notes, IAssetRepository assets, ITrashRepository? trash = null)
    {
        _notes = notes;
        _assets = assets;
        _trash = trash;
    }

    public TrashEntityKind EntityKind => TrashEntityKind.Note;

    public async Task<OperationResult<TrashEntry>> MoveToTrashAsync(
        Guid userId,
        Guid entityId,
        DateTime nowUtc,
        TimeSpan retention,
        CancellationToken cancellationToken = default)
    {
        var board = await _notes.GetBoardAsync(userId, entityId, cancellationToken);
        if (board is not null)
        {
            await _notes.SoftDeleteBoardAsync(board, nowUtc, cancellationToken);
            await _notes.SaveChangesAsync(cancellationToken);
            return OperationResult<TrashEntry>.Success(TrashEntry.Create(
                userId, EntityKind, board.Id, board.Name, "Notes", nowUtc, retention));
        }

        var page = await _notes.GetPageAsync(userId, entityId, cancellationToken);
        if (page is null)
        {
            return OperationResult<TrashEntry>.Failure(TrashError.NotFound());
        }

        await _notes.SoftDeletePageAsync(page, nowUtc, cancellationToken);
        await _notes.SaveChangesAsync(cancellationToken);
        return OperationResult<TrashEntry>.Success(TrashEntry.Create(
            userId, EntityKind, page.Id, page.Name, "Notes", nowUtc, retention));
    }

    public async Task<bool> RestoreAsync(TrashEntry entry, DateTime nowUtc, TimeZoneInfo? timeZone, CancellationToken cancellationToken = default)
    {
        var board = await _notes.GetTrashedBoardAsync(entry.UserId, entry.EntityId, entry.TrashedAt, cancellationToken);
        if (board is not null)
        {
            board.RestoreFromTrash(nowUtc);
            foreach (var descendant in board.Pages.Where(page => page.DeletedAt == entry.TrashedAt))
            {
                descendant.RestoreFromTrash(nowUtc);
            }

            await _notes.UpdateBoardAsync(board, cancellationToken);
            await _notes.SaveChangesAsync(cancellationToken);
            return true;
        }

        var page = await _notes.GetTrashedPageAsync(entry.UserId, entry.EntityId, entry.TrashedAt, cancellationToken);
        if (page is null)
        {
            return false;
        }

        page.RestoreFromTrash(nowUtc);
        await _notes.UpdatePageAsync(page, cancellationToken);
        await _notes.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> PermanentlyDeleteAsync(TrashEntry entry, DateTime nowUtc, CancellationToken cancellationToken = default)
    {
        var board = await _notes.GetTrashedBoardAsync(entry.UserId, entry.EntityId, entry.TrashedAt, cancellationToken);
        if (board is not null)
        {
            var pageIds = board.Pages
                .Select(page => page.Id)
                .ToArray();
            await ArchiveOwnedAssetsAsync(entry.UserId, await _notes.GetPageAssetIdsAsync(pageIds, cancellationToken), nowUtc, cancellationToken);
            await _notes.RemoveBoardAsync(board, cancellationToken);
            if (_trash is not null)
            {
                await _trash.RemoveActiveByEntityIdsAsync(entry.UserId, EntityKind, pageIds, cancellationToken);
            }
            await _notes.SaveChangesAsync(cancellationToken);
            return true;
        }

        var page = await _notes.GetTrashedPageAsync(entry.UserId, entry.EntityId, entry.TrashedAt, cancellationToken);
        if (page is null)
        {
            return true;
        }

        await ArchiveOwnedAssetsAsync(entry.UserId, await _notes.GetPageAssetIdsAsync(page.Id, cancellationToken), nowUtc, cancellationToken);
        await _notes.RemovePageAsync(page, cancellationToken);
        await _notes.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task ArchiveOwnedAssetsAsync(Guid userId, IReadOnlyCollection<Guid> assetIds, DateTime nowUtc, CancellationToken cancellationToken)
    {
        var assets = await _assets.GetOwnedAsync(userId, assetIds, cancellationToken);
        foreach (var asset in assets.Where(asset => asset.Type == AssetType.NoteImage && asset.Status == AssetStatus.Ready))
        {
            asset.Archive(nowUtc, TimeSpan.FromDays(30));
            await _assets.UpdateAsync(asset, cancellationToken);
        }
    }
}
