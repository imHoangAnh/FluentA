using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Flashcards.Entities;

public sealed class ReviewSettings : BaseEntity
{
    public const int DefaultDailyLimit = 300;
    public const int MaximumDailyLimit = 1000;

    private ReviewSettings()
    {
    }

    private ReviewSettings(Guid userId, int dailyLimit, bool recapAfterAnswer)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User id is required.", nameof(userId));
        }

        ValidateLimit(dailyLimit, nameof(dailyLimit));
        UserId = userId;
        DailyLimit = dailyLimit;
        RecapAfterAnswer = recapAfterAnswer;
    }

    public Guid UserId { get; private set; }
    public int DailyLimit { get; private set; }
    public bool RecapAfterAnswer { get; private set; }

    public static ReviewSettings CreateDefault(Guid userId) =>
        new(userId, DefaultDailyLimit, true);

    public static ReviewSettings Create(Guid userId, int dailyLimit, bool recapAfterAnswer) =>
        new(userId, dailyLimit, recapAfterAnswer);

    public void Update(int dailyLimit, bool recapAfterAnswer)
    {
        ValidateLimit(dailyLimit, nameof(dailyLimit));
        DailyLimit = dailyLimit;
        RecapAfterAnswer = recapAfterAnswer;
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
