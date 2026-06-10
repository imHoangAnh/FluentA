using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Flashcards.Entities;

public sealed class CardReview : BaseEntity
{
    private CardReview()
    {
    }

    private CardReview(
        Guid cardId,
        Guid sessionId,
        ReviewRating rating,
        int timeSpentSeconds,
        DateTime reviewedAt,
        int intervalAfter,
        float easeFactorAfter)
    {
        CardId = cardId;
        SessionId = sessionId;
        Rating = rating;
        TimeSpentSeconds = timeSpentSeconds;
        ReviewedAt = reviewedAt;
        IntervalAfter = intervalAfter;
        EaseFactorAfter = easeFactorAfter;
    }

    public Guid CardId { get; private set; }
    public Guid SessionId { get; private set; }
    public ReviewRating Rating { get; private set; }
    public int TimeSpentSeconds { get; private set; }
    public DateTime ReviewedAt { get; private set; }
    public int IntervalAfter { get; private set; }
    public float EaseFactorAfter { get; private set; }

    public static CardReview Create(
        Guid cardId,
        Guid sessionId,
        ReviewRating rating,
        int timeSpentSeconds,
        DateTime reviewedAt,
        int intervalAfter,
        float easeFactorAfter)
    {
        if (cardId == Guid.Empty || sessionId == Guid.Empty)
        {
            throw new ArgumentException("Card id and session id are required.");
        }

        if (timeSpentSeconds < 0 || intervalAfter < 0 || easeFactorAfter <= 0)
        {
            throw new ArgumentException("Review result values are invalid.");
        }

        return new CardReview(cardId, sessionId, rating, timeSpentSeconds, reviewedAt, intervalAfter, easeFactorAfter);
    }
}
