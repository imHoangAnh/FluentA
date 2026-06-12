using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Pomodoro.Entities;

public sealed class PomodoroSession : BaseEntity, IAggregateRoot
{
    private PomodoroSession()
    {
    }

    private PomodoroSession(Guid userId, PomodoroPhase phase, DateTime startedAt, DateTime completedAt, int durationSeconds, Guid? linkedTaskId, string? linkedTaskSource)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User id is required.", nameof(userId));
        }

        if (durationSeconds <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(durationSeconds), "Duration must be greater than zero.");
        }

        UserId = userId;
        Phase = phase;
        State = PomodoroState.Completed;
        StartedAt = startedAt;
        CompletedAt = completedAt;
        DurationSeconds = durationSeconds;
        LinkedTaskId = linkedTaskId;
        LinkedTaskSource = linkedTaskSource;
    }

    public Guid UserId { get; private set; }
    public PomodoroPhase Phase { get; private set; }
    public PomodoroState State { get; private set; }
    public DateTime StartedAt { get; private set; }
    public DateTime CompletedAt { get; private set; }
    public int DurationSeconds { get; private set; }
    public Guid? LinkedTaskId { get; private set; }
    public string? LinkedTaskSource { get; private set; }

    public static PomodoroSession CompleteWork(Guid userId, DateTime completedAt, int durationSeconds, Guid? linkedTaskId = null, string? linkedTaskSource = null)
    {
        return new PomodoroSession(userId, PomodoroPhase.Work, completedAt.AddSeconds(-durationSeconds), completedAt, durationSeconds, linkedTaskId, linkedTaskSource);
    }
}
