using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Practice.Entities;

public sealed class PracticeAttempt : BaseEntity
{
    private PracticeAttempt()
    {
        SubmittedAnswer = null;
    }

    private PracticeAttempt(
        Guid sessionId,
        Guid itemId,
        PracticeStep step,
        PracticeAttemptKind kind,
        string? submittedAnswer,
        Guid? answerSlotId,
        bool correctness,
        long durationMs,
        int? attemptNumber,
        double? accuracyScore,
        double? completenessScore,
        string? assessmentJson,
        DateTime createdAt)
        : this()
    {
        if (sessionId == Guid.Empty || itemId == Guid.Empty || durationMs < 0)
        {
            throw new ArgumentException("Session id, item id, and non-negative duration are required.");
        }

        PracticeSessionId = sessionId;
        PracticeSessionItemId = itemId;
        Step = step;
        Kind = kind;
        SubmittedAnswer = submittedAnswer;
        AnswerSlotId = answerSlotId;
        Correctness = correctness;
        DurationMs = durationMs;
        AttemptNumber = attemptNumber;
        AccuracyScore = accuracyScore;
        CompletenessScore = completenessScore;
        AssessmentJson = assessmentJson;
        CreatedAt = DateTime.SpecifyKind(createdAt, DateTimeKind.Utc);
        UpdatedAt = DateTime.SpecifyKind(createdAt, DateTimeKind.Utc);
    }

    public Guid PracticeSessionId { get; private set; }
    public Guid PracticeSessionItemId { get; private set; }
    public PracticeStep Step { get; private set; }
    public PracticeAttemptKind Kind { get; private set; }
    public string? SubmittedAnswer { get; private set; }
    public Guid? AnswerSlotId { get; private set; }
    public bool Correctness { get; private set; }
    public long DurationMs { get; private set; }
    public int? AttemptNumber { get; private set; }
    public double? AccuracyScore { get; private set; }
    public double? CompletenessScore { get; private set; }
    public string? AssessmentJson { get; private set; }

    public static PracticeAttempt Create(
        Guid sessionId,
        Guid itemId,
        PracticeStep step,
        PracticeAttemptKind kind,
        string? submittedAnswer,
        Guid? answerSlotId,
        bool correctness,
        long durationMs,
        int? attemptNumber,
        double? accuracyScore,
        double? completenessScore,
        string? assessmentJson,
        DateTime createdAt) =>
        new(
            sessionId,
            itemId,
            step,
            kind,
            submittedAnswer,
            answerSlotId,
            correctness,
            durationMs,
            attemptNumber,
            accuracyScore,
            completenessScore,
            assessmentJson,
            createdAt);
}
