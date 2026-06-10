using FluentA.Domain.BoundedContexts.Flashcards.Entities;

namespace FluentA.Domain.BoundedContexts.Flashcards;

public sealed record Sm2Result(int Interval, float EaseFactor, int Repetitions, CardState State);

public static class Sm2Scheduler
{
    public static Sm2Result Calculate(int interval, float easeFactor, int repetitions, ReviewRating rating)
    {
        if (interval < 0 || easeFactor <= 0 || repetitions < 0)
        {
            throw new ArgumentException("Current scheduling values are invalid.");
        }

        var quality = (int)rating;
        if (!Enum.IsDefined(rating))
        {
            throw new ArgumentOutOfRangeException(nameof(rating));
        }

        int nextInterval;
        int nextRepetitions;
        if (quality < (int)ReviewRating.Good)
        {
            nextInterval = 1;
            nextRepetitions = 0;
        }
        else
        {
            nextInterval = repetitions switch
            {
                0 => 1,
                1 => 6,
                _ => Math.Max(1, (int)Math.Round(interval * easeFactor, MidpointRounding.AwayFromZero))
            };
            nextRepetitions = repetitions + 1;
        }

        var distance = 3 - quality;
        var nextEaseFactor = Math.Max(1.3f, easeFactor + 0.1f - distance * (0.08f + distance * 0.02f));
        var nextState = nextInterval switch
        {
            < 7 => CardState.Learning,
            < 21 => CardState.Review,
            _ => CardState.Mature
        };

        return new Sm2Result(nextInterval, nextEaseFactor, nextRepetitions, nextState);
    }
}
