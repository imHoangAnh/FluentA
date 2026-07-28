using FluentA.Application.BoundedContexts.Trash;
using FluentA.Application.Common;
using FluentA.Domain.BoundedContexts.Trash.Entities;
using FluentA.Domain.BoundedContexts.Trash.Enums;

namespace FluentA.Application.BoundedContexts.Kanban;

/// <summary>Moves Kanban aggregates into the unified Trash without changing their stored ordering.</summary>
public sealed class KanbanTrashParticipant(IKanbanRepository kanban, ITrashRepository? trash = null) : ITrashParticipant
{
    public TrashEntityKind EntityKind => TrashEntityKind.Kanban;

    public async Task<OperationResult<TrashEntry>> MoveToTrashAsync(Guid userId, Guid entityId, DateTime nowUtc, TimeSpan retention, CancellationToken cancellationToken = default)
    {
        var board = await kanban.GetBoardAsync(userId, entityId, cancellationToken);
        if (board is not null)
        {
            board.SoftDelete(nowUtc);
            await kanban.UpdateBoardAsync(board, cancellationToken);
            return OperationResult<TrashEntry>.Success(TrashEntry.Create(userId, EntityKind, board.Id, board.Name, "Kanban board", nowUtc, retention));
        }

        var card = await kanban.GetCardAsync(userId, entityId, cancellationToken);
        if (card is not null)
        {
            card.SoftDelete(nowUtc);
            await kanban.UpdateCardAsync(card, cancellationToken);
            return OperationResult<TrashEntry>.Success(TrashEntry.Create(userId, EntityKind, card.Id, card.Title, "Kanban card", nowUtc, retention));
        }

        foreach (var activeBoard in await kanban.ListBoardsAsync(userId, cancellationToken))
        {
            var column = activeBoard.Columns.FirstOrDefault(item => item.Id == entityId);
            if (column is null) continue;
            if (column.HasActiveCards()) return OperationResult<TrashEntry>.Failure(KanbanError.ColumnNotEmpty());
            column.SoftDelete(nowUtc);
            await kanban.UpdateColumnAsync(column, cancellationToken);
            return OperationResult<TrashEntry>.Success(TrashEntry.Create(userId, EntityKind, column.Id, column.Name, activeBoard.Name, nowUtc, retention));
        }

        return OperationResult<TrashEntry>.Failure(TrashError.NotFound());
    }

    public async Task<bool> RestoreAsync(TrashEntry entry, DateTime nowUtc, TimeZoneInfo? timeZone, CancellationToken cancellationToken = default)
    {
        var board = await kanban.GetTrashedBoardAsync(entry.UserId, entry.EntityId, entry.TrashedAt, cancellationToken);
        if (board is not null)
        {
            board.RestoreFromTrash(nowUtc);
            await kanban.UpdateBoardAsync(board, cancellationToken);
            return true;
        }

        var column = await kanban.GetTrashedColumnAsync(entry.UserId, entry.EntityId, entry.TrashedAt, cancellationToken);
        if (column is not null)
        {
            column.RestoreFromTrash(nowUtc);
            await kanban.UpdateColumnAsync(column, cancellationToken);
            return true;
        }

        var card = await kanban.GetTrashedCardAsync(entry.UserId, entry.EntityId, entry.TrashedAt, cancellationToken);
        if (card is null) return false;
        card.RestoreFromTrash(nowUtc);
        await kanban.UpdateCardAsync(card, cancellationToken);
        return true;
    }

    public async Task<bool> PermanentlyDeleteAsync(TrashEntry entry, DateTime nowUtc, CancellationToken cancellationToken = default)
    {
        var board = await kanban.GetTrashedBoardAsync(entry.UserId, entry.EntityId, entry.TrashedAt, cancellationToken);
        if (board is not null)
        {
            var descendantIds = board.Columns
                .Select(column => column.Id)
                .Concat(board.Columns.SelectMany(column => column.Cards).Select(card => card.Id))
                .ToArray();
            await kanban.RemoveBoardAsync(board, cancellationToken);
            if (trash is not null)
            {
                await trash.RemoveActiveByEntityIdsAsync(entry.UserId, EntityKind, descendantIds, cancellationToken);
            }
            return true;
        }

        var column = await kanban.GetTrashedColumnAsync(entry.UserId, entry.EntityId, entry.TrashedAt, cancellationToken);
        if (column is not null)
        {
            var cardIds = column.Cards.Select(card => card.Id).ToArray();
            await kanban.RemoveColumnAsync(column, cancellationToken);
            if (trash is not null)
            {
                await trash.RemoveActiveByEntityIdsAsync(entry.UserId, EntityKind, cardIds, cancellationToken);
            }
            return true;
        }

        var card = await kanban.GetTrashedCardAsync(entry.UserId, entry.EntityId, entry.TrashedAt, cancellationToken);
        if (card is not null) await kanban.RemoveCardAsync(card, cancellationToken);
        return true;
    }
}
