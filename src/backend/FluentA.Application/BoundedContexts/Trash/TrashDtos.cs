using FluentA.Domain.BoundedContexts.Trash.Enums;

namespace FluentA.Application.BoundedContexts.Trash;

public sealed record TrashEntryDto(
    Guid Id,
    string EntityKind,
    Guid EntityId,
    string DisplayName,
    string OriginalLocation,
    DateTime TrashedAt,
    DateTime PurgeAfterAt);

public sealed record TrashListDto(IReadOnlyList<TrashEntryDto> Items);

public sealed record RestoreTrashRequest(string? TimeZoneId);
public sealed record TrashBulkRequest(IReadOnlyList<Guid>? EntryIds, string? TimeZoneId = null);
public sealed record TrashBulkResult(int Succeeded, int Failed);

public sealed record TrashPurgeResult(int Claimed, int Deleted, int Skipped, int Failed);
