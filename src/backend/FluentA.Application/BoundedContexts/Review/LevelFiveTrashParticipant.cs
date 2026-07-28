using FluentA.Application.BoundedContexts.Trash;
using FluentA.Application.Common;
using FluentA.Domain.BoundedContexts.Trash.Entities;
using FluentA.Domain.BoundedContexts.Trash.Enums;

namespace FluentA.Application.BoundedContexts.Review;

public sealed class LevelFiveTrashParticipant : ITrashParticipant
{
    private readonly ILevelFiveTrashRepository _review;

    public LevelFiveTrashParticipant(ILevelFiveTrashRepository review)
    {
        _review = review;
    }

    public TrashEntityKind EntityKind => TrashEntityKind.LevelFive;

    public async Task<OperationResult<TrashEntry>> MoveToTrashAsync(
        Guid userId,
        Guid entityId,
        DateTime nowUtc,
        TimeSpan retention,
        CancellationToken cancellationToken = default)
    {
        var source = await _review.GetActiveAsync(userId, entityId, cancellationToken);
        if (source is null)
        {
            return OperationResult<TrashEntry>.Failure(TrashError.NotFound());
        }

        source.State.Deactivate();
        await _review.SaveChangesAsync(cancellationToken);
        return OperationResult<TrashEntry>.Success(TrashEntry.Create(
            userId,
            EntityKind,
            source.State.WordId,
            source.Word,
            source.Location,
            nowUtc,
            retention));
    }

    public async Task<bool> RestoreAsync(TrashEntry entry, DateTime nowUtc, TimeZoneInfo? timeZone, CancellationToken cancellationToken = default)
    {
        if (timeZone is null)
        {
            return false;
        }

        var state = await _review.GetTrashedAsync(entry.UserId, entry.EntityId, cancellationToken);
        if (state is null)
        {
            return false;
        }

        state.ReactivateLevelZero(ReviewTime.LocalDate(nowUtc, timeZone).AddDays(1));
        await _review.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> PermanentlyDeleteAsync(TrashEntry entry, DateTime nowUtc, CancellationToken cancellationToken = default)
    {
        // The Vocabulary word intentionally remains in its Board/Page.
        await _review.DeleteProgressAsync(entry.UserId, entry.EntityId, cancellationToken);
        await _review.SaveChangesAsync(cancellationToken);
        return true;
    }
}
