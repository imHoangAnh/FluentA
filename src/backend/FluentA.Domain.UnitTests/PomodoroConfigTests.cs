using FluentA.Domain.BoundedContexts.Pomodoro.Entities;

namespace FluentA.Domain.UnitTests;

public sealed class PomodoroConfigTests
{
    [Fact]
    public void PomodoroConfig_CreatesDefaultsAndUpdatesDurations()
    {
        var userId = Guid.NewGuid();

        var config = PomodoroConfig.CreateDefault(userId);

        Assert.Equal(userId, config.UserId);
        Assert.Equal(25, config.WorkMinutes);
        Assert.Equal(5, config.ShortBreakMinutes);
        Assert.Equal(15, config.LongBreakMinutes);
        Assert.Equal(4, config.LongBreakAfter);

        config.Update(30, 10, 20, 3);

        Assert.Equal(30, config.WorkMinutes);
        Assert.Equal(10, config.ShortBreakMinutes);
        Assert.Equal(20, config.LongBreakMinutes);
        Assert.Equal(3, config.LongBreakAfter);
    }

    [Fact]
    public void PomodoroConfig_RequiresUserId()
    {
        Assert.Throws<ArgumentException>(() => PomodoroConfig.CreateDefault(Guid.Empty));
    }
}
