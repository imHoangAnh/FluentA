using FluentA.Application.BoundedContexts.Trash;
using FluentA.Application.Common;
using FluentA.Domain.BoundedContexts.Trash.Entities;
using FluentA.Domain.BoundedContexts.Trash.Enums;

namespace FluentA.Application.BoundedContexts.Project;

/// <summary>Moves Project aggregates into the unified Trash without changing their stored ordering.</summary>
public sealed class ProjectTrashParticipant(IProjectRepository project, ITrashRepository? trash = null) : ITrashParticipant
{
    public TrashEntityKind EntityKind => TrashEntityKind.Project;

    public async Task<OperationResult<TrashEntry>> MoveToTrashAsync(Guid userId, Guid entityId, DateTime nowUtc, TimeSpan retention, CancellationToken cancellationToken = default)
    {
        var board = await project.GetBoardAsync(userId, entityId, cancellationToken);
        if (board is not null)
        {
            board.SoftDelete(nowUtc);
            await project.UpdateBoardAsync(board, cancellationToken);
            return OperationResult<TrashEntry>.Success(TrashEntry.Create(userId, EntityKind, board.Id, board.Name, "Project board", nowUtc, retention));
        }

        var card = await project.GetCardAsync(userId, entityId, cancellationToken);
        if (card is not null)
        {
            card.SoftDelete(nowUtc);
            await project.UpdateCardAsync(card, cancellationToken);
            return OperationResult<TrashEntry>.Success(TrashEntry.Create(userId, EntityKind, card.Id, card.Title, "Project card", nowUtc, retention));
        }

        foreach (var activeBoard in await project.ListBoardsAsync(userId, cancellationToken))
        {
            var column = activeBoard.Columns.FirstOrDefault(item => item.Id == entityId);
            if (column is null) continue;
            if (column.HasActiveCards()) return OperationResult<TrashEntry>.Failure(ProjectError.ColumnNotEmpty());
            column.SoftDelete(nowUtc);
            await project.UpdateColumnAsync(column, cancellationToken);
            return OperationResult<TrashEntry>.Success(TrashEntry.Create(userId, EntityKind, column.Id, column.Name, activeBoard.Name, nowUtc, retention));
        }

        return OperationResult<TrashEntry>.Failure(TrashError.NotFound());
    }

    public async Task<bool> RestoreAsync(TrashEntry entry, DateTime nowUtc, TimeZoneInfo? timeZone, CancellationToken cancellationToken = default)
    {
        var board = await project.GetTrashedBoardAsync(entry.UserId, entry.EntityId, entry.TrashedAt, cancellationToken);
        if (board is not null)
        {
            board.RestoreFromTrash(nowUtc);
            await project.UpdateBoardAsync(board, cancellationToken);
            return true;
        }

        var column = await project.GetTrashedColumnAsync(entry.UserId, entry.EntityId, entry.TrashedAt, cancellationToken);
        if (column is not null)
        {
            column.RestoreFromTrash(nowUtc);
            await project.UpdateColumnAsync(column, cancellationToken);
            return true;
        }

        var card = await project.GetTrashedCardAsync(entry.UserId, entry.EntityId, entry.TrashedAt, cancellationToken);
        if (card is null) return false;
        card.RestoreFromTrash(nowUtc);
        await project.UpdateCardAsync(card, cancellationToken);
        return true;
    }

    public async Task<bool> PermanentlyDeleteAsync(TrashEntry entry, DateTime nowUtc, CancellationToken cancellationToken = default)
    {
        var board = await project.GetTrashedBoardAsync(entry.UserId, entry.EntityId, entry.TrashedAt, cancellationToken);
        if (board is not null)
        {
            var descendantIds = board.Columns
                .Select(column => column.Id)
                .Concat(board.Columns.SelectMany(column => column.Cards).Select(card => card.Id))
                .ToArray();
            await project.RemoveBoardAsync(board, cancellationToken);
            if (trash is not null)
            {
                await trash.RemoveActiveByEntityIdsAsync(entry.UserId, EntityKind, descendantIds, cancellationToken);
            }
            return true;
        }

        var column = await project.GetTrashedColumnAsync(entry.UserId, entry.EntityId, entry.TrashedAt, cancellationToken);
        if (column is not null)
        {
            var cardIds = column.Cards.Select(card => card.Id).ToArray();
            await project.RemoveColumnAsync(column, cancellationToken);
            if (trash is not null)
            {
                await trash.RemoveActiveByEntityIdsAsync(entry.UserId, EntityKind, cardIds, cancellationToken);
            }
            return true;
        }

        var card = await project.GetTrashedCardAsync(entry.UserId, entry.EntityId, entry.TrashedAt, cancellationToken);
        if (card is not null) await project.RemoveCardAsync(card, cancellationToken);
        return true;
    }
}
