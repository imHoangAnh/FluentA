using FluentA.Domain.BoundedContexts.Pomodoro.Entities;

namespace FluentA.Domain.UnitTests;

public sealed class PomodoroSessionTests
{
    [Fact]
    public void CompleteWork_CreatesCompletedWorkSession()
    {
        var userId = Guid.NewGuid();
        var completedAt = DateTime.UtcNow;

        var session = PomodoroSession.CompleteWork(userId, completedAt, 1500);

        Assert.Equal(userId, session.UserId);
        Assert.Equal(PomodoroPhase.Work, session.Phase);
        Assert.Equal(PomodoroState.Completed, session.State);
        Assert.Equal(completedAt, session.CompletedAt);
        Assert.Equal(1500, session.DurationSeconds);
    }

    [Fact]
    public void CompleteWork_RejectsInvalidInput()
    {
        Assert.Throws<ArgumentException>(() => PomodoroSession.CompleteWork(Guid.Empty, DateTime.UtcNow, 1500));
        Assert.Throws<ArgumentOutOfRangeException>(() => PomodoroSession.CompleteWork(Guid.NewGuid(), DateTime.UtcNow, 0));
    }
}
