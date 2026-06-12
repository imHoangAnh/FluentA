using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Pomodoro.Entities;

public sealed class PomodoroConfig : BaseEntity, IAggregateRoot
{
    public const int DefaultWorkMinutes = 25;
    public const int DefaultShortBreakMinutes = 5;
    public const int DefaultLongBreakMinutes = 15;
    public const int DefaultLongBreakAfter = 4;

    private PomodoroConfig()
    {
    }

    private PomodoroConfig(Guid userId)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User id is required.", nameof(userId));
        }

        UserId = userId;
        WorkMinutes = DefaultWorkMinutes;
        ShortBreakMinutes = DefaultShortBreakMinutes;
        LongBreakMinutes = DefaultLongBreakMinutes;
        LongBreakAfter = DefaultLongBreakAfter;
    }

    public Guid UserId { get; private set; }
    public int WorkMinutes { get; private set; }
    public int ShortBreakMinutes { get; private set; }
    public int LongBreakMinutes { get; private set; }
    public int LongBreakAfter { get; private set; }

    public static PomodoroConfig CreateDefault(Guid userId)
    {
        return new PomodoroConfig(userId);
    }

    public void Update(int? workMinutes, int? shortBreakMinutes, int? longBreakMinutes, int? longBreakAfter)
    {
        if (workMinutes is not null)
        {
            WorkMinutes = workMinutes.Value;
        }

        if (shortBreakMinutes is not null)
        {
            ShortBreakMinutes = shortBreakMinutes.Value;
        }

        if (longBreakMinutes is not null)
        {
            LongBreakMinutes = longBreakMinutes.Value;
        }

        if (longBreakAfter is not null)
        {
            LongBreakAfter = longBreakAfter.Value;
        }

        UpdatedAt = DateTime.UtcNow;
    }
}
