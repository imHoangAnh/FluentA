using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Review.Entities;

public sealed class ReviewAttempt : BaseEntity
{
    private ReviewAttempt()
    {
        Mode = string.Empty;
    }

    private ReviewAttempt(
        Guid reviewSessionItemId,
        int attemptNumber,
        string mode,
        string? answerText,
        bool isCorrect,
        double? accuracyScore,
        double? completenessScore,
        string? feedbackMode,
        string? feedbackJson,
        int timeSpentSeconds,
        DateTime attemptedAtUtc)
        : this()
    {
        if (reviewSessionItemId == Guid.Empty)
        {
            throw new ArgumentException("Review session item id is required.", nameof(reviewSessionItemId));
        }

        if (attemptNumber is < 1 or > 2)
        {
            throw new ArgumentOutOfRangeException(nameof(attemptNumber), "Review attempts are limited to two.");
        }

        if (string.IsNullOrWhiteSpace(mode) || timeSpentSeconds is < 0 or > 86400 || attemptedAtUtc == default)
        {
            throw new ArgumentException("Review attempt values are invalid.");
        }

        ReviewSessionItemId = reviewSessionItemId;
        AttemptNumber = attemptNumber;
        Mode = mode;
        AnswerText = answerText;
        IsCorrect = isCorrect;
        AccuracyScore = accuracyScore;
        CompletenessScore = completenessScore;
        FeedbackMode = feedbackMode;
        FeedbackJson = feedbackJson;
        TimeSpentSeconds = timeSpentSeconds;
        CreatedAt = DateTime.SpecifyKind(attemptedAtUtc, DateTimeKind.Utc);
        UpdatedAt = CreatedAt;
    }

    public Guid ReviewSessionItemId { get; private set; }
    public int AttemptNumber { get; private set; }
    public string Mode { get; private set; }
    public string? AnswerText { get; private set; }
    public bool IsCorrect { get; private set; }
    public double? AccuracyScore { get; private set; }
    public double? CompletenessScore { get; private set; }
    public string? FeedbackMode { get; private set; }
    public string? FeedbackJson { get; private set; }
    public int TimeSpentSeconds { get; private set; }

    public static ReviewAttempt CreateTyped(
        Guid reviewSessionItemId,
        string mode,
        string answerText,
        bool isCorrect,
        int timeSpentSeconds,
        DateTime attemptedAtUtc) =>
        new(
            reviewSessionItemId,
            attemptNumber: 1,
            mode,
            answerText,
            isCorrect,
            accuracyScore: null,
            completenessScore: null,
            feedbackMode: null,
            feedbackJson: null,
            timeSpentSeconds,
            attemptedAtUtc);

    public static ReviewAttempt CreatePronunciation(
        Guid reviewSessionItemId,
        int attemptNumber,
        bool isCorrect,
        double accuracyScore,
        double? completenessScore,
        string feedbackMode,
        string feedbackJson,
        int timeSpentSeconds,
        DateTime attemptedAtUtc) =>
        new(
            reviewSessionItemId,
            attemptNumber,
            mode: "listenAndRepeat",
            answerText: null,
            isCorrect,
            accuracyScore,
            completenessScore,
            feedbackMode,
            feedbackJson,
            timeSpentSeconds,
            attemptedAtUtc);
}
