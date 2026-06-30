namespace FluentA.Domain.BoundedContexts.Flashcards;

public sealed record FluentAsrsResult(int LevelAfter, int LapseCountAfter, int IntervalDays);

public static class FluentAsrsScheduler
{
    public static FluentAsrsResult ApplyCorrect(int level, int lapseCount)
    {
        ValidateState(level, lapseCount);

        var levelAfter = level switch
        {
            < 5 => level + 1,
            _ => 5,
        };

        return new FluentAsrsResult(levelAfter, lapseCount, IntervalDaysForLevel(levelAfter));
    }

    public static FluentAsrsResult ApplyWrong(int level, int lapseCount)
    {
        ValidateState(level, lapseCount);

        var lapseCountAfter = level == 0
            ? lapseCount
            : lapseCount + 1;

        return new FluentAsrsResult(0, lapseCountAfter, 1);
    }

    public static int IntervalDaysForLevel(int level) =>
        level switch
        {
            0 => 1,
            1 => 2,
            2 => 4,
            3 => 14,
            4 => 39,
            5 => 60,
            _ => throw new ArgumentOutOfRangeException(nameof(level), "FluentA SRS level must be between 0 and 5."),
        };

    private static void ValidateState(int level, int lapseCount)
    {
        if (level is < 0 or > 5)
        {
            throw new ArgumentOutOfRangeException(nameof(level), "FluentA SRS level must be between 0 and 5.");
        }

        if (lapseCount < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(lapseCount), "Lapse count must be non-negative.");
        }
    }
}
