using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Practice.Entities;

public sealed class PracticeSessionItem : BaseEntity
{
    private PracticeSessionItem()
    {
        Word = string.Empty;
        Meaning = string.Empty;
        IpaPronunciation = string.Empty;
        Type = string.Empty;
        Example = string.Empty;
        Choice1SlotId = Guid.NewGuid();
        Choice2SlotId = Guid.NewGuid();
        Choice3SlotId = Guid.NewGuid();
        Choice4SlotId = Guid.NewGuid();
    }

    private PracticeSessionItem(
        Guid sessionId,
        Guid wordId,
        int position,
        string word,
        string meaning,
        string ipaPronunciation,
        string type,
        string? context,
        string example,
        string? synonyms,
        string? antonyms,
        IReadOnlyList<string?> answerMeanings,
        int correctChoiceIndex,
        bool alreadyInReview)
        : this()
    {
        if (sessionId == Guid.Empty || wordId == Guid.Empty || position < 0)
        {
            throw new ArgumentException("Session, word, and non-negative position are required.");
        }

        if (answerMeanings.Count != 4 || correctChoiceIndex is < 0 or > 3 || string.IsNullOrWhiteSpace(answerMeanings[correctChoiceIndex]))
        {
            throw new ArgumentException("A practice item requires four choice slots and a correct choice.");
        }

        PracticeSessionId = sessionId;
        WordId = wordId;
        Position = position;
        Word = word;
        Meaning = meaning;
        IpaPronunciation = ipaPronunciation;
        Type = type;
        Context = context;
        Example = example;
        Synonyms = synonyms;
        Antonyms = antonyms;
        Choice1Meaning = answerMeanings[0];
        Choice2Meaning = answerMeanings[1];
        Choice3Meaning = answerMeanings[2];
        Choice4Meaning = answerMeanings[3];
        CorrectAnswerSlotId = ChoiceSlotIdAt(correctChoiceIndex);
        AlreadyInReview = alreadyInReview;
        CurrentStep = PracticeStep.Dictation;
    }

    public Guid PracticeSessionId { get; private set; }
    public Guid WordId { get; private set; }
    public int Position { get; private set; }
    public string Word { get; private set; }
    public string Meaning { get; private set; }
    public string IpaPronunciation { get; private set; }
    public string Type { get; private set; }
    public string? Context { get; private set; }
    public string Example { get; private set; }
    public string? Synonyms { get; private set; }
    public string? Antonyms { get; private set; }
    public PracticeStep CurrentStep { get; private set; }
    public bool AlreadyInReview { get; private set; }
    public int? SelectedLevel { get; private set; }
    public bool HasMistake { get; private set; }
    public bool IsCompleted { get; private set; }
    public DateTime? CompletedAt { get; private set; }
    public Guid Choice1SlotId { get; private set; }
    public Guid Choice2SlotId { get; private set; }
    public Guid Choice3SlotId { get; private set; }
    public Guid Choice4SlotId { get; private set; }
    public string? Choice1Meaning { get; private set; }
    public string? Choice2Meaning { get; private set; }
    public string? Choice3Meaning { get; private set; }
    public string? Choice4Meaning { get; private set; }

    // This value is persisted only for server-side grading and is never mapped to an API DTO.
    public Guid CorrectAnswerSlotId { get; private set; }

    public static PracticeSessionItem Create(
        Guid sessionId,
        Guid wordId,
        int position,
        string word,
        string meaning,
        string ipaPronunciation,
        string type,
        string? context,
        string example,
        string? synonyms,
        string? antonyms,
        IReadOnlyList<string?> answerMeanings,
        int correctChoiceIndex,
        bool alreadyInReview) =>
        new(
            sessionId,
            wordId,
            position,
            word,
            meaning,
            ipaPronunciation,
            type,
            context,
            example,
            synonyms,
            antonyms,
            answerMeanings,
            correctChoiceIndex,
            alreadyInReview);

    public Guid ChoiceSlotIdAt(int index) => index switch
    {
        0 => Choice1SlotId,
        1 => Choice2SlotId,
        2 => Choice3SlotId,
        3 => Choice4SlotId,
        _ => throw new ArgumentOutOfRangeException(nameof(index)),
    };

    public string? ChoiceMeaningAt(int index) => index switch
    {
        0 => Choice1Meaning,
        1 => Choice2Meaning,
        2 => Choice3Meaning,
        3 => Choice4Meaning,
        _ => throw new ArgumentOutOfRangeException(nameof(index)),
    };

    public bool IsCorrectChoice(Guid? slotId) => slotId.HasValue && slotId.Value == CorrectAnswerSlotId;

    public void MarkAnswer(bool correct, PracticeStep submittedStep, DateTime utcNow)
    {
        EnsureCurrentStep(submittedStep);
        if (!correct)
        {
            HasMistake = true;
            UpdatedAt = DateTime.SpecifyKind(utcNow, DateTimeKind.Utc);
            return;
        }

        AdvanceStep(utcNow);
    }

    public void SkipStep(PracticeStep submittedStep, DateTime utcNow)
    {
        EnsureCurrentStep(submittedStep);
        if (CurrentStep == PracticeStep.Recap)
        {
            IsCompleted = true;
            CompletedAt = DateTime.SpecifyKind(utcNow, DateTimeKind.Utc);
            UpdatedAt = DateTime.SpecifyKind(utcNow, DateTimeKind.Utc);
            return;
        }

        HasMistake = true;
        AdvanceStep(utcNow);
    }

    public void RecordPronunciation(bool correct, DateTime utcNow)
    {
        EnsureCurrentStep(PracticeStep.Pronunciation);
        if (correct)
        {
            AdvanceStep(utcNow);
        }
        else
        {
            HasMistake = true;
            UpdatedAt = DateTime.SpecifyKind(utcNow, DateTimeKind.Utc);
        }
    }

    public void SetReviewEnrollment(int level, bool alreadyActive, DateTime utcNow)
    {
        EnsureCurrentStep(PracticeStep.Recap);
        if (level is < 0 or > 5)
        {
            throw new ArgumentOutOfRangeException(nameof(level));
        }

        AlreadyInReview = alreadyActive;
        SelectedLevel = alreadyActive ? null : level;
        IsCompleted = true;
        CompletedAt = DateTime.SpecifyKind(utcNow, DateTimeKind.Utc);
        UpdatedAt = DateTime.SpecifyKind(utcNow, DateTimeKind.Utc);
    }

    public void MarkAlreadyInReview()
    {
        AlreadyInReview = true;
        UpdatedAt = DateTime.UtcNow;
    }

    private void EnsureCurrentStep(PracticeStep submittedStep)
    {
        if (IsCompleted || CurrentStep != submittedStep)
        {
            throw new InvalidOperationException("The practice item is not at the submitted step.");
        }
    }

    private void AdvanceStep(DateTime utcNow)
    {
        CurrentStep = CurrentStep switch
        {
            PracticeStep.Dictation => PracticeStep.WordToMeaning,
            PracticeStep.WordToMeaning => PracticeStep.Pronunciation,
            PracticeStep.Pronunciation => PracticeStep.Recap,
            PracticeStep.Recap => PracticeStep.Recap,
            _ => throw new InvalidOperationException("Unknown practice step."),
        };
        UpdatedAt = DateTime.SpecifyKind(utcNow, DateTimeKind.Utc);
    }
}
