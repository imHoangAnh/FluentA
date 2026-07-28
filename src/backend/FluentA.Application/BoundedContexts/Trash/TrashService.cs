using FluentA.Application.Common;
using FluentA.Application.BoundedContexts.Review;
using FluentA.Domain.BoundedContexts.Trash.Entities;
using FluentA.Domain.BoundedContexts.Trash.Enums;

namespace FluentA.Application.BoundedContexts.Trash;

public sealed class TrashService : ITrashService
{
    private static readonly TimeSpan Retention = TimeSpan.FromDays(30);
    private readonly IReadOnlyDictionary<TrashEntityKind, ITrashParticipant> _participants;
    private readonly ITrashRepository _trash;
    private readonly ITrashTransaction _transaction;

    public TrashService(IEnumerable<ITrashParticipant> participants, ITrashRepository trash, ITrashTransaction transaction)
    {
        _participants = participants.ToDictionary(participant => participant.EntityKind);
        _trash = trash;
        _transaction = transaction;
    }

    public Task<OperationResult<TrashEntryDto>> TrashTodoAsync(Guid userId, Guid todoId, CancellationToken cancellationToken = default)
    {
        return MoveToTrashAsync(userId, TrashEntityKind.Todo, todoId, cancellationToken);
    }

    public Task<OperationResult<TrashEntryDto>> TrashNoteBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default) =>
        MoveToTrashAsync(userId, TrashEntityKind.Note, boardId, cancellationToken);

    public Task<OperationResult<TrashEntryDto>> TrashNotePageAsync(Guid userId, Guid pageId, CancellationToken cancellationToken = default) =>
        MoveToTrashAsync(userId, TrashEntityKind.Note, pageId, cancellationToken);

    public Task<OperationResult<TrashEntryDto>> TrashVocabularyAsync(Guid userId, Guid entityId, CancellationToken cancellationToken = default) =>
        MoveToTrashAsync(userId, TrashEntityKind.Vocabulary, entityId, cancellationToken);

    public Task<OperationResult<TrashEntryDto>> TrashLevelFiveAsync(Guid userId, Guid wordId, CancellationToken cancellationToken = default) =>
        MoveToTrashAsync(userId, TrashEntityKind.LevelFive, wordId, cancellationToken);

    public async Task<OperationResult<IReadOnlyList<TrashEntryDto>>> TrashLevelFiveBatchAsync(
        Guid userId,
        IReadOnlyList<Guid> wordIds,
        CancellationToken cancellationToken = default)
    {
        var ids = wordIds.Distinct().ToArray();
        if (ids.Length == 0 || ids.Length > 100 || ids.Any(id => id == Guid.Empty))
        {
            return OperationResult<IReadOnlyList<TrashEntryDto>>.Failure(TrashError.Validation());
        }

        var participant = FindParticipant(TrashEntityKind.LevelFive);
        if (participant is null)
        {
            return OperationResult<IReadOnlyList<TrashEntryDto>>.Failure(TrashError.NotFound());
        }

        return await _transaction.ExecuteAsync(async token =>
        {
            var entries = new List<TrashEntryDto>(ids.Length);
            foreach (var wordId in ids)
            {
                var result = await participant.MoveToTrashAsync(userId, wordId, DateTime.UtcNow, Retention, token);
                if (!result.IsSuccess)
                {
                    return OperationResult<IReadOnlyList<TrashEntryDto>>.Failure(result.Error!);
                }

                await _trash.AddAsync(result.Value!, token);
                entries.Add(ToDto(result.Value!));
            }

            return OperationResult<IReadOnlyList<TrashEntryDto>>.Success(entries);
        }, cancellationToken);
    }

    public Task<OperationResult<TrashEntryDto>> TrashCountdownAsync(Guid userId, Guid countdownId, CancellationToken cancellationToken = default) =>
        MoveToTrashAsync(userId, TrashEntityKind.Countdown, countdownId, cancellationToken);

    public Task<OperationResult<TrashEntryDto>> TrashHabitAsync(Guid userId, Guid habitId, CancellationToken cancellationToken = default) =>
        MoveToTrashAsync(userId, TrashEntityKind.Habit, habitId, cancellationToken);

    public Task<OperationResult<TrashEntryDto>> TrashJournalAsync(Guid userId, Guid journalId, CancellationToken cancellationToken = default) =>
        MoveToTrashAsync(userId, TrashEntityKind.Journal, journalId, cancellationToken);

    public Task<OperationResult<TrashEntryDto>> TrashKanbanAsync(Guid userId, Guid entityId, CancellationToken cancellationToken = default) =>
        MoveToTrashAsync(userId, TrashEntityKind.Kanban, entityId, cancellationToken);

    public async Task<OperationResult<TrashListDto>> ListAsync(
        Guid userId,
        string? kind,
        string? search,
        int limit,
        CancellationToken cancellationToken = default)
    {
        if (!TryParseKind(kind, out var parsedKind)
            || limit is < 1 or > 100
            || (search?.Length ?? 0) > 120)
        {
            return OperationResult<TrashListDto>.Failure(TrashError.Validation());
        }

        var entries = await _trash.ListActiveAsync(userId, parsedKind, search?.Trim(), limit, cancellationToken);
        return OperationResult<TrashListDto>.Success(new TrashListDto(entries.Select(ToDto).ToList()));
    }

    public Task<OperationResult<bool>> RestoreAsync(Guid userId, Guid entryId, string? timeZoneId = null, CancellationToken cancellationToken = default)
    {
        return RestoreOrDeleteAsync(userId, entryId, restore: true, timeZoneId, cancellationToken);
    }

    public Task<OperationResult<bool>> PermanentlyDeleteAsync(Guid userId, Guid entryId, CancellationToken cancellationToken = default)
    {
        return RestoreOrDeleteAsync(userId, entryId, restore: false, timeZoneId: null, cancellationToken);
    }

    public Task<OperationResult<TrashBulkResult>> BulkRestoreAsync(Guid userId, IReadOnlyList<Guid>? entryIds, string? timeZoneId = null, CancellationToken cancellationToken = default) =>
        ProcessBulkAsync(userId, entryIds, (id, token) => RestoreAsync(userId, id, timeZoneId, token), cancellationToken);

    public Task<OperationResult<TrashBulkResult>> BulkPermanentlyDeleteAsync(Guid userId, IReadOnlyList<Guid>? entryIds, CancellationToken cancellationToken = default) =>
        ProcessBulkAsync(userId, entryIds, (id, token) => PermanentlyDeleteAsync(userId, id, token), cancellationToken);

    public async Task<OperationResult<TrashBulkResult>> EmptyAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var succeeded = 0;
        var failed = 0;
        while (true)
        {
            var entries = await _trash.ListActiveAsync(userId, null, null, 100, cancellationToken);
            if (entries.Count == 0) break;
            var result = await ProcessBulkAsync(userId, entries.Select(entry => entry.Id).ToArray(), (id, token) => PermanentlyDeleteAsync(userId, id, token), cancellationToken);
            if (!result.IsSuccess) return result;
            succeeded += result.Value!.Succeeded;
            failed += result.Value.Failed;
            if (result.Value.Succeeded == 0) break;
        }
        return OperationResult<TrashBulkResult>.Success(new TrashBulkResult(succeeded, failed));
    }

    public async Task<TrashPurgeResult> PurgeDueAsync(CancellationToken cancellationToken = default)
    {
        var dueIds = await _trash.ListDueEntryIdsAsync(DateTime.UtcNow, 100, cancellationToken);
        var claimed = 0;
        var deleted = 0;
        var skipped = 0;
        var failed = 0;
        foreach (var entryId in dueIds)
        {
            try
            {
                var result = await _transaction.ExecuteAsync(async token =>
                {
                    var entry = await _trash.ClaimDueAsync(entryId, DateTime.UtcNow, token);
                    if (entry is null)
                    {
                        return false;
                    }

                    return await PermanentlyDeleteClaimedAsync(entry, DateTime.UtcNow, token);
                }, cancellationToken);
                if (result)
                {
                    claimed++;
                    deleted++;
                }
                else
                {
                    skipped++;
                }
            }
            catch
            {
                failed++;
            }
        }

        return new TrashPurgeResult(claimed, deleted, skipped, failed);
    }

    private Task<OperationResult<bool>> RestoreOrDeleteAsync(Guid userId, Guid entryId, bool restore, string? timeZoneId, CancellationToken cancellationToken)
    {
        return _transaction.ExecuteAsync(async token =>
        {
            var claim = restore ? TrashEntryState.Restoring : TrashEntryState.Purging;
            var entry = await _trash.ClaimOwnedAsync(userId, entryId, claim, DateTime.UtcNow, token);
            if (entry is null)
            {
                return OperationResult<bool>.Failure(TrashError.NotFound());
            }

            if (restore)
            {
                var timeZone = ResolveRestoreTimeZone(entry.EntityKind, timeZoneId);
                if (entry.EntityKind == TrashEntityKind.LevelFive && timeZone is null)
                {
                    entry.Reactivate(DateTime.UtcNow);
                    await _trash.UpdateAsync(entry, token);
                    return OperationResult<bool>.Failure(TrashError.Validation());
                }
                var participant = FindParticipant(entry.EntityKind);
                if (participant is null || !await participant.RestoreAsync(entry, DateTime.UtcNow, timeZone, token))
                {
                    entry.Reactivate(DateTime.UtcNow);
                    await _trash.UpdateAsync(entry, token);
                    return OperationResult<bool>.Failure(TrashError.NotFound());
                }

                await _trash.RemoveAsync(entry, token);
                return OperationResult<bool>.Success(true);
            }

            var deleted = await PermanentlyDeleteClaimedAsync(entry, DateTime.UtcNow, token);
            return deleted
                ? OperationResult<bool>.Success(true)
                : OperationResult<bool>.Failure(TrashError.NotFound());
        }, cancellationToken);
    }

    private async Task<OperationResult<TrashEntryDto>> MoveToTrashAsync(Guid userId, TrashEntityKind kind, Guid entityId, CancellationToken cancellationToken)
    {
        var participant = FindParticipant(kind);
        if (participant is null)
        {
            return OperationResult<TrashEntryDto>.Failure(TrashError.NotFound());
        }

        return await _transaction.ExecuteAsync(async token =>
        {
            var result = await participant.MoveToTrashAsync(userId, entityId, DateTime.UtcNow, Retention, token);
            if (!result.IsSuccess)
            {
                return OperationResult<TrashEntryDto>.Failure(result.Error!);
            }

            await _trash.AddAsync(result.Value!, token);
            return OperationResult<TrashEntryDto>.Success(ToDto(result.Value!));
        }, cancellationToken);
    }

    private async Task<OperationResult<TrashBulkResult>> ProcessBulkAsync(
        Guid userId,
        IReadOnlyList<Guid>? entryIds,
        Func<Guid, CancellationToken, Task<OperationResult<bool>>> operation,
        CancellationToken cancellationToken)
    {
        if (entryIds is null || entryIds.Count is < 1 or > 100 || entryIds.Any(id => id == Guid.Empty) || entryIds.Distinct().Count() != entryIds.Count)
        {
            return OperationResult<TrashBulkResult>.Failure(TrashError.Validation());
        }

        var succeeded = 0;
        foreach (var entryId in entryIds)
        {
            if ((await operation(entryId, cancellationToken)).IsSuccess) succeeded++;
        }
        return OperationResult<TrashBulkResult>.Success(new TrashBulkResult(succeeded, entryIds.Count - succeeded));
    }

    private async Task<bool> PermanentlyDeleteClaimedAsync(TrashEntry entry, DateTime nowUtc, CancellationToken cancellationToken)
    {
        var participant = FindParticipant(entry.EntityKind);
        if (participant is null || !await participant.PermanentlyDeleteAsync(entry, nowUtc, cancellationToken))
        {
            entry.Reactivate(nowUtc);
            await _trash.UpdateAsync(entry, cancellationToken);
            return false;
        }

        await _trash.RemoveAsync(entry, cancellationToken);
        return true;
    }

    private ITrashParticipant? FindParticipant(TrashEntityKind entityKind) =>
        _participants.GetValueOrDefault(entityKind);

    private static TimeZoneInfo? ResolveRestoreTimeZone(TrashEntityKind entityKind, string? timeZoneId)
    {
        if (entityKind != TrashEntityKind.LevelFive)
        {
            return null;
        }

        return ReviewTime.TryFindTimeZone(timeZoneId, out var timeZone) ? timeZone : null;
    }

    private static bool TryParseKind(string? value, out TrashEntityKind? kind)
    {
        kind = null;
        if (string.IsNullOrWhiteSpace(value))
        {
            return true;
        }

        if (!Enum.TryParse<TrashEntityKind>(value, ignoreCase: false, out var parsed)
            || !Enum.IsDefined(parsed)
            || !string.Equals(value, parsed.ToString(), StringComparison.Ordinal))
        {
            return false;
        }

        kind = parsed;
        return true;
    }

    private static TrashEntryDto ToDto(TrashEntry entry) => new(
        entry.Id,
        entry.EntityKind.ToString(),
        entry.EntityId,
        entry.DisplayName,
        entry.OriginalLocation,
        entry.TrashedAt,
        entry.PurgeAfterAt);
}
