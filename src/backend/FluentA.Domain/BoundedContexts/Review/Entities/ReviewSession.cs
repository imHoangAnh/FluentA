using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Review.Entities;

public sealed class ReviewSession : BaseEntity
{
    private ReviewSession()
    {
    }

    private ReviewSession(
        Guid userId,
        Guid boardId,
        string orderType,
        DateOnly sessionDate,
        DateTime startedAt,
        ReviewSessionStatus status)
    {
        if (userId == Guid.Empty || boardId == Guid.Empty)
        {
            throw new ArgumentException("User id and board id are required.");
        }

        if (string.IsNullOrWhiteSpace(orderType))
        {
            throw new ArgumentException("Order type is required.", nameof(orderType));
        }

        if (startedAt == default)
        {
            throw new ArgumentException("Started at is required.", nameof(startedAt));
        }

        UserId = userId;
        BoardId = boardId;
        OrderType = orderType;
        SessionDate = sessionDate;
        StartedAt = startedAt;
        Status = status;
    }

    public Guid UserId { get; private set; }
    public Guid BoardId { get; private set; }
    public string OrderType { get; private set; } = string.Empty;
    public DateOnly SessionDate { get; private set; }
    public DateTime StartedAt { get; private set; }
    public DateTime? CompletedAt { get; private set; }
    public ReviewSessionStatus Status { get; private set; }

    public static ReviewSession CreateActive(
        Guid userId,
        Guid boardId,
        string orderType,
        DateOnly sessionDate,
        DateTime startedAt) =>
        new(userId, boardId, orderType, sessionDate, startedAt, ReviewSessionStatus.Active);

    public void Complete(DateTime completedAtUtc)
    {
        if (completedAtUtc == default)
        {
            throw new ArgumentException("Completed at is required.", nameof(completedAtUtc));
        }

        Status = ReviewSessionStatus.Completed;
        CompletedAt = completedAtUtc;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Replace()
    {
        Status = ReviewSessionStatus.Replaced;
        CompletedAt = null;
        UpdatedAt = DateTime.UtcNow;
    }
}
