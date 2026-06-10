using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Flashcards.Entities;

public sealed class ReviewSettings : BaseEntity
{
    public const int DefaultNewCardsPerDay = 20;
    public const int DefaultReviewCardsPerDay = 200;
    public const int MaximumDailyLimit = 1000;

    private ReviewSettings()
    {
    }

    private ReviewSettings(Guid userId, int newCardsPerDay, int reviewCardsPerDay)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User id is required.", nameof(userId));
        }

        ValidateLimit(newCardsPerDay, nameof(newCardsPerDay));
        ValidateLimit(reviewCardsPerDay, nameof(reviewCardsPerDay));
        UserId = userId;
        NewCardsPerDay = newCardsPerDay;
        ReviewCardsPerDay = reviewCardsPerDay;
    }

    public Guid UserId { get; private set; }
    public int NewCardsPerDay { get; private set; }
    public int ReviewCardsPerDay { get; private set; }

    public static ReviewSettings CreateDefault(Guid userId) =>
        new(userId, DefaultNewCardsPerDay, DefaultReviewCardsPerDay);

    public static ReviewSettings Create(Guid userId, int newCardsPerDay, int reviewCardsPerDay) =>
        new(userId, newCardsPerDay, reviewCardsPerDay);

    public void Update(int newCardsPerDay, int reviewCardsPerDay)
    {
        ValidateLimit(newCardsPerDay, nameof(newCardsPerDay));
        ValidateLimit(reviewCardsPerDay, nameof(reviewCardsPerDay));
        NewCardsPerDay = newCardsPerDay;
        ReviewCardsPerDay = reviewCardsPerDay;
        UpdatedAt = DateTime.UtcNow;
    }

    private static void ValidateLimit(int value, string parameterName)
    {
        if (value is < 0 or > MaximumDailyLimit)
        {
            throw new ArgumentOutOfRangeException(parameterName, $"Daily limit must be between 0 and {MaximumDailyLimit}.");
        }
    }
}
