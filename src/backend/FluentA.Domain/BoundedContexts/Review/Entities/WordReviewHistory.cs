using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Review.Entities;

public sealed class WordReviewHistory : BaseEntity
{
    private WordReviewHistory()
    {
    }

    private WordReviewHistory(
        Guid userId,
        Guid wordId,
        Guid sessionId,
        Guid reviewSessionItemId,
        int timeSpentSeconds,
        DateTime reviewedAt,
        FluentAsrsReviewResult result)
    {
        if (userId == Guid.Empty || wordId == Guid.Empty || sessionId == Guid.Empty || reviewSessionItemId == Guid.Empty)
        {
            throw new ArgumentException("User, word, session, and review item ids are required.");
        }

        if (timeSpentSeconds < 0 || reviewedAt == default)
        {
            throw new ArgumentException("Word review history values are invalid.");
        }

        UserId = userId;
        WordId = wordId;
        SessionId = sessionId;
        ReviewSessionItemId = reviewSessionItemId;
        TimeSpentSeconds = timeSpentSeconds;
        ReviewedAt = reviewedAt;
        Result = result;
    }

    public Guid UserId { get; private set; }
    public Guid WordId { get; private set; }
    public Guid SessionId { get; private set; }
    public Guid? ReviewSessionItemId { get; private set; }
    public int TimeSpentSeconds { get; private set; }
    public DateTime ReviewedAt { get; private set; }
    public FluentAsrsReviewResult Result { get; private set; }

    public static WordReviewHistory Create(
        Guid userId,
        Guid wordId,
        Guid sessionId,
        Guid reviewSessionItemId,
        int timeSpentSeconds,
        DateTime reviewedAt,
        FluentAsrsReviewResult result) =>
        new(userId, wordId, sessionId, reviewSessionItemId, timeSpentSeconds, reviewedAt, result);
}
