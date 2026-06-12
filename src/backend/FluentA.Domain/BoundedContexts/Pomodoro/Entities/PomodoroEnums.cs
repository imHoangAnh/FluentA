namespace FluentA.Domain.BoundedContexts.Pomodoro.Entities;

public enum PomodoroPhase
{
    Work = 0,
    ShortBreak = 1,
    LongBreak = 2,
}

public enum PomodoroState
{
    Idle = 0,
    Running = 1,
    Paused = 2,
    Completed = 3,
}
