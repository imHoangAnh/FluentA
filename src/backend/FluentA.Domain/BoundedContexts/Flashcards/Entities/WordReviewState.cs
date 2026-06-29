using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Flashcards.Entities;

public sealed class WordReviewState : BaseEntity
{
    private WordReviewState()
    {
    }

    private WordReviewState(Guid wordId, int interval, float easeFactor, int repetitions, DateTime nextReviewDate, CardState state)
    {
        if (wordId == Guid.Empty)
        {
            throw new ArgumentException("Word id is required.", nameof(wordId));
        }

        ValidateSchedule(interval, easeFactor, repetitions, nextReviewDate);
        WordId = wordId;
        Interval = interval;
        EaseFactor = easeFactor;
        Repetitions = repetitions;
        NextReviewDate = nextReviewDate;
        State = state;
    }

    public Guid WordId { get; private set; }
    public int Interval { get; private set; }
    public float EaseFactor { get; private set; }
    public int Repetitions { get; private set; }
    public DateTime NextReviewDate { get; private set; }
    public CardState State { get; private set; }

    public static WordReviewState CreateLearning(Guid wordId, DateTime nextReviewDate) =>
        new(wordId, interval: 1, easeFactor: 2.5f, repetitions: 1, nextReviewDate, CardState.Learning);

    public void ResetToLearning(DateTime nextReviewDate)
    {
        ValidateSchedule(interval: 1, easeFactor: 2.5f, repetitions: 1, nextReviewDate);
        Interval = 1;
        EaseFactor = 2.5f;
        Repetitions = 1;
        NextReviewDate = nextReviewDate;
        State = CardState.Learning;
        UpdatedAt = DateTime.UtcNow;
    }

    public void ApplyReviewResult(int interval, float easeFactor, int repetitions, DateTime nextReviewDate, CardState state)
    {
        ValidateSchedule(interval, easeFactor, repetitions, nextReviewDate);
        Interval = interval;
        EaseFactor = easeFactor;
        Repetitions = repetitions;
        NextReviewDate = nextReviewDate;
        State = state;
        UpdatedAt = DateTime.UtcNow;
    }

    private static void ValidateSchedule(int interval, float easeFactor, int repetitions, DateTime nextReviewDate)
    {
        if (interval < 0 || easeFactor <= 0 || repetitions < 0)
        {
            throw new ArgumentException("Review scheduling values must be non-negative and ease factor must be positive.");
        }

        if (nextReviewDate == default)
        {
            throw new ArgumentException("Next review date is required.", nameof(nextReviewDate));
        }
    }
}
