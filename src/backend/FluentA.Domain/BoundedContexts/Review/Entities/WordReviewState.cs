using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Review.Entities;

public sealed class WordReviewState : BaseEntity
{
    private WordReviewState()
    {
    }

    private WordReviewState(
        Guid userId,
        Guid wordId,
        WordReviewStatus status,
        int level,
        DateOnly nextReviewDate,
        int lapseCount,
        DateOnly? lastReviewedAt)
    {
        if (userId == Guid.Empty || wordId == Guid.Empty)
        {
            throw new ArgumentException("User id and word id are required.");
        }

        ValidateState(level, nextReviewDate, lapseCount);
        UserId = userId;
        WordId = wordId;
        Status = status;
        Level = level;
        NextReviewDate = nextReviewDate;
        LapseCount = lapseCount;
        LastReviewedAt = lastReviewedAt;
    }

    public Guid UserId { get; private set; }
    public Guid WordId { get; private set; }
    public WordReviewStatus Status { get; private set; }
    public int Level { get; private set; }
    public DateOnly NextReviewDate { get; private set; }
    public int LapseCount { get; private set; }
    public DateOnly? LastReviewedAt { get; private set; }

    public static WordReviewState CreateLevelZero(Guid userId, Guid wordId, DateOnly nextReviewDate) =>
        new(userId, wordId, WordReviewStatus.Active, level: 0, nextReviewDate, lapseCount: 0, lastReviewedAt: null);

    public void ApplyResult(int levelAfter, DateOnly nextReviewDate, int lapseCountAfter, DateOnly reviewedOn)
    {
        ValidateState(levelAfter, nextReviewDate, lapseCountAfter);
        Status = WordReviewStatus.Active;
        Level = levelAfter;
        NextReviewDate = nextReviewDate;
        LapseCount = lapseCountAfter;
        LastReviewedAt = reviewedOn;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MoveDueDate(DateOnly nextReviewDate)
    {
        ValidateState(Level, nextReviewDate, LapseCount);
        NextReviewDate = nextReviewDate;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Deactivate()
    {
        Status = WordReviewStatus.Inactive;
        UpdatedAt = DateTime.UtcNow;
    }

    public void ReactivateLevelZero(DateOnly nextReviewDate)
    {
        ValidateState(0, nextReviewDate, LapseCount);
        Status = WordReviewStatus.Active;
        Level = 0;
        NextReviewDate = nextReviewDate;
        LastReviewedAt = null;
        UpdatedAt = DateTime.UtcNow;
    }

    private static void ValidateState(int level, DateOnly nextReviewDate, int lapseCount)
    {
        if (level is < 0 or > 5)
        {
            throw new ArgumentOutOfRangeException(nameof(level), "FluentA SRS level must be between 0 and 5.");
        }

        if (lapseCount < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(lapseCount), "Lapse count must be non-negative.");
        }

        if (nextReviewDate == default)
        {
            throw new ArgumentException("Next review date is required.", nameof(nextReviewDate));
        }
    }
}
