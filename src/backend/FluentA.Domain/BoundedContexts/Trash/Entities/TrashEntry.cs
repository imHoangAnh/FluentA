using FluentA.Domain.BoundedContexts.Trash.Enums;
using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Trash.Entities;

/// <summary>
/// Owner-scoped lifecycle registry. Feature participants retain ownership of
/// their data; this aggregate contains only the information needed to list,
/// claim, and coordinate a restorable deletion.
/// </summary>
public sealed class TrashEntry : BaseEntity, IAggregateRoot
{
    private TrashEntry()
    {
        DisplayName = string.Empty;
        OriginalLocation = string.Empty;
    }

    private TrashEntry(
        Guid userId,
        TrashEntityKind entityKind,
        Guid entityId,
        string displayName,
        string originalLocation,
        DateTime trashedAt,
        DateTime purgeAfterAt)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User id is required.", nameof(userId));
        }

        if (entityId == Guid.Empty)
        {
            throw new ArgumentException("Entity id is required.", nameof(entityId));
        }

        UserId = userId;
        EntityKind = entityKind;
        EntityId = entityId;
        DisplayName = Clean(displayName, 240, nameof(displayName));
        OriginalLocation = Clean(originalLocation, 500, nameof(originalLocation));
        TrashedAt = EnsureUtc(trashedAt);
        PurgeAfterAt = EnsureUtc(purgeAfterAt);
        if (PurgeAfterAt <= TrashedAt)
        {
            throw new ArgumentOutOfRangeException(nameof(purgeAfterAt), "Purge time must be after trash time.");
        }

        State = TrashEntryState.Active;
        CreatedAt = TrashedAt;
        UpdatedAt = TrashedAt;
    }

    public Guid UserId { get; private set; }
    public TrashEntityKind EntityKind { get; private set; }
    public Guid EntityId { get; private set; }
    public string DisplayName { get; private set; }
    public string OriginalLocation { get; private set; }
    public DateTime TrashedAt { get; private set; }
    public DateTime PurgeAfterAt { get; private set; }
    public TrashEntryState State { get; private set; }

    public static TrashEntry Create(
        Guid userId,
        TrashEntityKind entityKind,
        Guid entityId,
        string displayName,
        string originalLocation,
        DateTime trashedAt,
        TimeSpan retention)
    {
        if (retention <= TimeSpan.Zero)
        {
            throw new ArgumentOutOfRangeException(nameof(retention), "Retention must be positive.");
        }

        var utcTrashedAt = EnsureUtc(trashedAt);
        return new TrashEntry(userId, entityKind, entityId, displayName, originalLocation, utcTrashedAt, utcTrashedAt.Add(retention));
    }

    public void MarkClaimed(TrashEntryState state, DateTime nowUtc)
    {
        if (state is not TrashEntryState.Restoring and not TrashEntryState.Purging)
        {
            throw new ArgumentOutOfRangeException(nameof(state), "Only restoring or purging may claim an entry.");
        }

        State = state;
        UpdatedAt = EnsureUtc(nowUtc);
    }

    public void Reactivate(DateTime nowUtc)
    {
        State = TrashEntryState.Active;
        UpdatedAt = EnsureUtc(nowUtc);
    }

    private static string Clean(string value, int maxLength, string parameterName)
    {
        var cleaned = value?.Trim() ?? string.Empty;
        if (cleaned.Length is < 1 or > 500 || cleaned.Length > maxLength)
        {
            throw new ArgumentException($"{parameterName} must be between 1 and {maxLength} characters.", parameterName);
        }

        return cleaned;
    }

    private static DateTime EnsureUtc(DateTime value)
    {
        return value.Kind == DateTimeKind.Utc
            ? value
            : DateTime.SpecifyKind(value, DateTimeKind.Utc);
    }
}
