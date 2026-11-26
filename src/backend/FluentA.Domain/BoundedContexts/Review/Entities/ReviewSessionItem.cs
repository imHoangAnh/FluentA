using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Review.Entities;

public sealed class ReviewSessionItem : BaseEntity
{
    private ReviewSessionItem()
    {
        Mode = string.Empty;
        LanguageSnapshot = string.Empty;
        WordSnapshot = string.Empty;
        MeaningSnapshot = string.Empty;
        IpaPronunciationSnapshot = string.Empty;
        TypeSnapshot = string.Empty;
        ExampleSnapshot = string.Empty;
    }

    private ReviewSessionItem(
        Guid reviewSessionId,
        Guid vocabWordId,
        int position,
        string mode,
        string languageSnapshot,
        string wordSnapshot,
        string meaningSnapshot,
        string ipaPronunciationSnapshot,
        string typeSnapshot,
        string? contextSnapshot,
        string exampleSnapshot,
        string? synonymsSnapshot,
        string? antonymsSnapshot)
        : this()
    {
        if (reviewSessionId == Guid.Empty || vocabWordId == Guid.Empty)
        {
            throw new ArgumentException("Session id and word id are required.");
        }

        if (position < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(position), "Position must be non-negative.");
        }

        if (string.IsNullOrWhiteSpace(mode)
            || string.IsNullOrWhiteSpace(languageSnapshot)
            || string.IsNullOrWhiteSpace(wordSnapshot)
            || string.IsNullOrWhiteSpace(meaningSnapshot)
            || string.IsNullOrWhiteSpace(typeSnapshot)
            || string.IsNullOrWhiteSpace(exampleSnapshot))
        {
            throw new ArgumentException("Review mode and word snapshot fields are required.");
        }

        ReviewSessionId = reviewSessionId;
        VocabWordId = vocabWordId;
        Position = position;
        Mode = mode;
        LanguageSnapshot = languageSnapshot;
        WordSnapshot = wordSnapshot;
        MeaningSnapshot = meaningSnapshot;
        IpaPronunciationSnapshot = ipaPronunciationSnapshot;
        TypeSnapshot = typeSnapshot;
        ContextSnapshot = contextSnapshot;
        ExampleSnapshot = exampleSnapshot;
        SynonymsSnapshot = synonymsSnapshot;
        AntonymsSnapshot = antonymsSnapshot;
    }

    public Guid ReviewSessionId { get; private set; }
    public Guid VocabWordId { get; private set; }
    public int Position { get; private set; }
    public string Mode { get; private set; }
    public string LanguageSnapshot { get; private set; }
    public string WordSnapshot { get; private set; }
    public string MeaningSnapshot { get; private set; }
    public string IpaPronunciationSnapshot { get; private set; }
    public string TypeSnapshot { get; private set; }
    public string? ContextSnapshot { get; private set; }
    public string ExampleSnapshot { get; private set; }
    public string? SynonymsSnapshot { get; private set; }
    public string? AntonymsSnapshot { get; private set; }
    public bool IsReviewed { get; private set; }
    public FluentAsrsReviewResult? Result { get; private set; }
    public int? LevelBefore { get; private set; }
    public int? LevelAfter { get; private set; }
    public DateOnly? NextReviewDateBefore { get; private set; }
    public DateOnly? NextReviewDateAfter { get; private set; }
    public DateTime? CompletedAt { get; private set; }

    public static ReviewSessionItem Create(
        Guid reviewSessionId,
        Guid vocabWordId,
        int position,
        string mode,
        string languageSnapshot,
        string wordSnapshot,
        string meaningSnapshot,
        string ipaPronunciationSnapshot,
        string typeSnapshot,
        string? contextSnapshot,
        string exampleSnapshot,
        string? synonymsSnapshot,
        string? antonymsSnapshot) =>
        new(
            reviewSessionId,
            vocabWordId,
            position,
            mode,
            languageSnapshot,
            wordSnapshot,
            meaningSnapshot,
            ipaPronunciationSnapshot,
            typeSnapshot,
            contextSnapshot,
            exampleSnapshot,
            synonymsSnapshot,
            antonymsSnapshot);

    public void Complete(
        FluentAsrsReviewResult result,
        int levelBefore,
        int levelAfter,
        DateOnly nextReviewDateBefore,
        DateOnly nextReviewDateAfter,
        DateTime completedAtUtc)
    {
        if (IsReviewed)
        {
            throw new InvalidOperationException("This review item has already been completed.");
        }

        if (levelBefore is < 0 or > 5 || levelAfter is < 0 or > 5 || completedAtUtc == default)
        {
            throw new ArgumentOutOfRangeException(nameof(levelBefore), "Review result values are invalid.");
        }

        IsReviewed = true;
        Result = result;
        LevelBefore = levelBefore;
        LevelAfter = levelAfter;
        NextReviewDateBefore = nextReviewDateBefore;
        NextReviewDateAfter = nextReviewDateAfter;
        CompletedAt = DateTime.SpecifyKind(completedAtUtc, DateTimeKind.Utc);
        UpdatedAt = CompletedAt.Value;
    }
}
