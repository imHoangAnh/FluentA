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
        int timeSpentSeconds,
        DateTime reviewedAt,
        FluentAsrsReviewResult result,
        int levelBefore,
        int levelAfter,
        DateTime nextReviewDate)
    {
        if (userId == Guid.Empty || wordId == Guid.Empty || sessionId == Guid.Empty)
        {
            throw new ArgumentException("User, word, and session ids are required.");
        }

        if (timeSpentSeconds < 0 || levelBefore is < 0 or > 5 || levelAfter is < 0 or > 5 || nextReviewDate == default)
        {
            throw new ArgumentException("Word review history values are invalid.");
        }

        UserId = userId;
        WordId = wordId;
        SessionId = sessionId;
        TimeSpentSeconds = timeSpentSeconds;
        ReviewedAt = reviewedAt;
        Result = result;
        LevelBefore = levelBefore;
        LevelAfter = levelAfter;
        NextReviewDate = nextReviewDate;
    }

    public Guid UserId { get; private set; }
    public Guid WordId { get; private set; }
    public Guid SessionId { get; private set; }
    public int TimeSpentSeconds { get; private set; }
    public DateTime ReviewedAt { get; private set; }
    public FluentAsrsReviewResult Result { get; private set; }
    public int LevelBefore { get; private set; }
    public int LevelAfter { get; private set; }
    public DateTime NextReviewDate { get; private set; }

    public static WordReviewHistory Create(
        Guid userId,
        Guid wordId,
        Guid sessionId,
        int timeSpentSeconds,
        DateTime reviewedAt,
        FluentAsrsReviewResult result,
        int levelBefore,
        int levelAfter,
        DateTime nextReviewDate) =>
        new(userId, wordId, sessionId, timeSpentSeconds, reviewedAt, result, levelBefore, levelAfter, nextReviewDate);
}
