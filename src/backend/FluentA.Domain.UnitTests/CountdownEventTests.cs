using CountdownEventEntity = FluentA.Domain.BoundedContexts.Countdown.Entities.CountdownEvent;

namespace FluentA.Domain.UnitTests;

public sealed class CountdownEventTests
{
    [Fact]
    public void CountdownEvent_NormalizesAndUpdatesFields()
    {
        var userId = Guid.NewGuid();
        var target = new DateTime(2026, 7, 2, 9, 0, 0, DateTimeKind.Utc);

        var countdownEvent = CountdownEventEntity.Create(userId, " IELTS Exam ", target, " #4F46E5 ", "IELTS");

        Assert.Equal(userId, countdownEvent.UserId);
        Assert.Equal("IELTS Exam", countdownEvent.Name);
        Assert.Equal(DateTimeKind.Utc, countdownEvent.TargetDate.Kind);
        Assert.Equal("#4F46E5", countdownEvent.Color);
        Assert.Equal("IELTS", countdownEvent.Icon);

        var updatedTarget = target.AddDays(3);
        countdownEvent.Rename("Project deadline");
        countdownEvent.Reschedule(updatedTarget);
        countdownEvent.UpdateColor(null);
        countdownEvent.UpdateIcon("📅");

        Assert.Equal("Project deadline", countdownEvent.Name);
        Assert.Equal(updatedTarget, countdownEvent.TargetDate);
        Assert.Null(countdownEvent.Color);
        Assert.Equal("📅", countdownEvent.Icon);
    }

    [Fact]
    public void CountdownEvent_ValidatesRequiredFields()
    {
        var target = DateTime.UtcNow.AddDays(1);

        Assert.Throws<ArgumentException>(() => CountdownEventEntity.Create(Guid.Empty, "Exam", target));
        Assert.Throws<ArgumentException>(() => CountdownEventEntity.Create(Guid.NewGuid(), "", target));
        Assert.Throws<ArgumentException>(() => CountdownEventEntity.Create(Guid.NewGuid(), new string('x', 181), target));
        Assert.Throws<ArgumentException>(() => CountdownEventEntity.Create(Guid.NewGuid(), "Exam", target, null, new string('x', 17)));
    }

    [Fact]
    public void CountdownEvent_ComputesCompletedStateAndSoftDeletes()
    {
        var now = new DateTime(2026, 6, 11, 3, 0, 0, DateTimeKind.Utc);
        var countdownEvent = CountdownEventEntity.Create(Guid.NewGuid(), "Exam", now.AddMinutes(5));

        Assert.False(countdownEvent.IsCompletedAt(now));
        Assert.True(countdownEvent.IsCompletedAt(now.AddMinutes(5)));

        countdownEvent.SoftDelete();

        Assert.NotNull(countdownEvent.DeletedAt);
    }
}
