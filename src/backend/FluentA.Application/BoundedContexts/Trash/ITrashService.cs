using FluentA.Application.Common;

namespace FluentA.Application.BoundedContexts.Trash;

public interface ITrashService
{
    Task<OperationResult<TrashEntryDto>> TrashTodoAsync(Guid userId, Guid todoId, CancellationToken cancellationToken = default);
    Task<OperationResult<TrashEntryDto>> TrashNoteBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default);
    Task<OperationResult<TrashEntryDto>> TrashNotePageAsync(Guid userId, Guid pageId, CancellationToken cancellationToken = default);
    Task<OperationResult<TrashEntryDto>> TrashVocabularyAsync(Guid userId, Guid entityId, CancellationToken cancellationToken = default);
    Task<OperationResult<TrashEntryDto>> TrashLevelFiveAsync(Guid userId, Guid wordId, CancellationToken cancellationToken = default);
    Task<OperationResult<IReadOnlyList<TrashEntryDto>>> TrashLevelFiveBatchAsync(Guid userId, IReadOnlyList<Guid> wordIds, CancellationToken cancellationToken = default);
    Task<OperationResult<TrashEntryDto>> TrashCountdownAsync(Guid userId, Guid countdownId, CancellationToken cancellationToken = default);
    Task<OperationResult<TrashEntryDto>> TrashHabitAsync(Guid userId, Guid habitId, CancellationToken cancellationToken = default);
    Task<OperationResult<TrashEntryDto>> TrashJournalAsync(Guid userId, Guid journalId, CancellationToken cancellationToken = default);
    Task<OperationResult<TrashEntryDto>> TrashKanbanAsync(Guid userId, Guid entityId, CancellationToken cancellationToken = default);
    Task<OperationResult<TrashListDto>> ListAsync(Guid userId, string? kind, string? search, int limit, CancellationToken cancellationToken = default);
    Task<OperationResult<bool>> RestoreAsync(Guid userId, Guid entryId, string? timeZoneId = null, CancellationToken cancellationToken = default);
    Task<OperationResult<bool>> PermanentlyDeleteAsync(Guid userId, Guid entryId, CancellationToken cancellationToken = default);
    Task<OperationResult<TrashBulkResult>> BulkRestoreAsync(Guid userId, IReadOnlyList<Guid>? entryIds, string? timeZoneId = null, CancellationToken cancellationToken = default);
    Task<OperationResult<TrashBulkResult>> BulkPermanentlyDeleteAsync(Guid userId, IReadOnlyList<Guid>? entryIds, CancellationToken cancellationToken = default);
    Task<OperationResult<TrashBulkResult>> EmptyAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<TrashPurgeResult> PurgeDueAsync(CancellationToken cancellationToken = default);
}
