using FluentA.Application.BoundedContexts.Review;
using FluentA.Application.BoundedContexts.Trash;
using FluentA.Application.Common;
using FluentA.Domain.BoundedContexts.Trash.Entities;
using FluentA.Domain.BoundedContexts.Trash.Enums;

namespace FluentA.Application.BoundedContexts.Vocabulary;

public sealed class VocabularyTrashParticipant : ITrashParticipant
{
    private readonly IVocabularyRepository _vocabulary;
    private readonly IVocabularyReviewCleanupPort _reviewCleanup;
    private readonly ITrashRepository? _trash;

    public VocabularyTrashParticipant(IVocabularyRepository vocabulary, IVocabularyReviewCleanupPort reviewCleanup, ITrashRepository? trash = null)
    {
        _vocabulary = vocabulary;
        _reviewCleanup = reviewCleanup;
        _trash = trash;
    }

    public TrashEntityKind EntityKind => TrashEntityKind.Vocabulary;

    public async Task<OperationResult<TrashEntry>> MoveToTrashAsync(Guid userId, Guid entityId, DateTime nowUtc, TimeSpan retention, CancellationToken cancellationToken = default)
    {
        var board = await _vocabulary.GetBoardAsync(userId, entityId, cancellationToken);
        if (board is not null)
        {
            await _vocabulary.SoftDeleteBoardAsync(board, nowUtc, cancellationToken);
            await _vocabulary.SaveChangesAsync(cancellationToken);
            return OperationResult<TrashEntry>.Success(TrashEntry.Create(userId, EntityKind, board.Id, board.Name, "Vocabulary", nowUtc, retention));
        }

        var page = (await _vocabulary.ListBoardsAsync(userId, cancellationToken))
            .SelectMany(boardItem => boardItem.Pages.Where(pageItem => pageItem.DeletedAt is null))
            .SingleOrDefault(pageItem => pageItem.Id == entityId);
        if (page is not null)
        {
            await _vocabulary.SoftDeletePageAsync(page, nowUtc, cancellationToken);
            await _vocabulary.SaveChangesAsync(cancellationToken);
            return OperationResult<TrashEntry>.Success(TrashEntry.Create(userId, EntityKind, page.Id, page.Name, "Vocabulary", nowUtc, retention));
        }

        foreach (var activeBoard in await _vocabulary.ListBoardsAsync(userId, cancellationToken))
        {
            var word = await _vocabulary.GetWordAsync(userId, activeBoard.Id, entityId, cancellationToken);
            if (word is null)
            {
                continue;
            }

            await _vocabulary.SoftDeleteWordAsync(word, nowUtc, cancellationToken);
            await _vocabulary.SaveChangesAsync(cancellationToken);
            return OperationResult<TrashEntry>.Success(TrashEntry.Create(userId, EntityKind, word.Id, word.Word, activeBoard.Name, nowUtc, retention));
        }

        return OperationResult<TrashEntry>.Failure(TrashError.NotFound());
    }

    public async Task<bool> RestoreAsync(TrashEntry entry, DateTime nowUtc, TimeZoneInfo? timeZone, CancellationToken cancellationToken = default)
    {
        var board = await _vocabulary.GetTrashedBoardAsync(entry.UserId, entry.EntityId, entry.TrashedAt, cancellationToken);
        if (board is not null)
        {
            board.RestoreFromTrash(nowUtc);
            foreach (var descendant in board.Pages.Where(pageItem => pageItem.DeletedAt == entry.TrashedAt)) descendant.RestoreFromTrash(nowUtc);
            var descendantWords = await _vocabulary.ListTrashedWordsAsync(board.Pages.Select(pageItem => pageItem.Id).ToArray(), entry.TrashedAt, cancellationToken);
            foreach (var descendantWord in descendantWords) descendantWord.RestoreFromTrash(nowUtc);
            await _vocabulary.UpdateBoardAsync(board, cancellationToken);
            await _vocabulary.SaveChangesAsync(cancellationToken);
            return true;
        }

        var page = await _vocabulary.GetTrashedPageAsync(entry.UserId, entry.EntityId, entry.TrashedAt, cancellationToken);
        if (page is not null)
        {
            page.RestoreFromTrash(nowUtc);
            var descendantWords = await _vocabulary.ListTrashedWordsAsync([page.Id], entry.TrashedAt, cancellationToken);
            foreach (var descendantWord in descendantWords) descendantWord.RestoreFromTrash(nowUtc);
            await _vocabulary.UpdatePageAsync(page, cancellationToken);
            await _vocabulary.SaveChangesAsync(cancellationToken);
            return true;
        }

        var word = await _vocabulary.GetTrashedWordAsync(entry.UserId, entry.EntityId, entry.TrashedAt, cancellationToken);
        if (word is null) return false;
        word.RestoreFromTrash(nowUtc);
        await _vocabulary.UpdateWordAsync(word, cancellationToken);
        await _vocabulary.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> PermanentlyDeleteAsync(TrashEntry entry, DateTime nowUtc, CancellationToken cancellationToken = default)
    {
        var board = await _vocabulary.GetTrashedBoardAsync(entry.UserId, entry.EntityId, entry.TrashedAt, cancellationToken);
        if (board is not null)
        {
            var pageIds = board.Pages.Select(page => page.Id).ToArray();
            var words = await _vocabulary.ListWordsForPagesAsync(pageIds, cancellationToken);
            await _reviewCleanup.RemoveWordProgressAsync(words.Select(word => word.Id), cancellationToken);
            await _vocabulary.RemoveBoardAsync(board, cancellationToken);
            if (_trash is not null)
            {
                await _trash.RemoveActiveByEntityIdsAsync(entry.UserId, EntityKind, pageIds.Concat(words.Select(word => word.Id)).ToArray(), cancellationToken);
            }
            await _vocabulary.SaveChangesAsync(cancellationToken);
            return true;
        }

        var page = await _vocabulary.GetTrashedPageAsync(entry.UserId, entry.EntityId, entry.TrashedAt, cancellationToken);
        if (page is not null)
        {
            var words = await _vocabulary.ListWordsForPagesAsync([page.Id], cancellationToken);
            await _reviewCleanup.RemoveWordProgressAsync(words.Select(word => word.Id), cancellationToken);
            await _vocabulary.RemovePageAsync(page, cancellationToken);
            if (_trash is not null)
            {
                await _trash.RemoveActiveByEntityIdsAsync(entry.UserId, EntityKind, words.Select(word => word.Id).ToArray(), cancellationToken);
            }
            await _vocabulary.SaveChangesAsync(cancellationToken);
            return true;
        }

        var word = await _vocabulary.GetTrashedWordAsync(entry.UserId, entry.EntityId, entry.TrashedAt, cancellationToken);
        if (word is null) return true;
        await _reviewCleanup.RemoveWordProgressAsync([word.Id], cancellationToken);
        await _vocabulary.RemoveWordAsync(word, cancellationToken);
        await _vocabulary.SaveChangesAsync(cancellationToken);
        return true;
    }
}
