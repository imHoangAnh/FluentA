using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Review.Entities;

public sealed class ReviewSession : BaseEntity
{
    private ReviewSession()
    {
    }

    private ReviewSession(
        Guid userId,
        DateOnly sessionDate,
        DateTime startedAt,
        ReviewSessionStatus status)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User id is required.", nameof(userId));
        }

        if (startedAt == default)
        {
            throw new ArgumentException("Started at is required.", nameof(startedAt));
        }

        UserId = userId;
        SessionDate = sessionDate;
        StartedAt = startedAt;
        Status = status;
    }

    public Guid UserId { get; private set; }
    public DateOnly SessionDate { get; private set; }
    public DateTime StartedAt { get; private set; }
    public DateTime? CompletedAt { get; private set; }
    public ReviewSessionStatus Status { get; private set; }

    public static ReviewSession CreateActive(
        Guid userId,
        DateOnly sessionDate,
        DateTime startedAt) =>
        new(userId, sessionDate, startedAt, ReviewSessionStatus.Active);

    public void Complete(DateTime completedAtUtc)
    {
        if (completedAtUtc == default)
        {
            throw new ArgumentException("Completed at is required.", nameof(completedAtUtc));
        }

        Status = ReviewSessionStatus.Completed;
        CompletedAt = DateTime.SpecifyKind(completedAtUtc, DateTimeKind.Utc);
        UpdatedAt = CompletedAt.Value;
    }

    public void Abandon(DateTime abandonedAtUtc)
    {
        if (abandonedAtUtc == default)
        {
            throw new ArgumentException("Abandoned at is required.", nameof(abandonedAtUtc));
        }

        Status = ReviewSessionStatus.Abandoned;
        UpdatedAt = DateTime.SpecifyKind(abandonedAtUtc, DateTimeKind.Utc);
    }
}
