using CountdownEventEntity = FluentA.Domain.BoundedContexts.Countdown.Entities.CountdownEvent;

namespace FluentA.Domain.UnitTests;

public sealed class CountdownEventTests
{
    [Fact]
    public void CountdownEvent_NormalizesFieldsAndTracksAlerts()
    {
        var userId = Guid.NewGuid();
        var target = new DateTime(2026, 7, 2, 9, 0, 0, DateTimeKind.Utc);

        var countdownEvent = CountdownEventEntity.Create(userId, " IELTS Exam ", target);
        countdownEvent.AddAlert("7DaysBefore", "09:00", target.AddDays(-7));
        countdownEvent.AddAlert("OnTargetDay", "07:30", target);

        Assert.Equal(userId, countdownEvent.UserId);
        Assert.Equal("IELTS Exam", countdownEvent.Name);
        Assert.Equal(DateTimeKind.Utc, countdownEvent.TargetDate.Kind);
        Assert.Equal(new DateTime(2026, 7, 2, 0, 0, 0, DateTimeKind.Utc), countdownEvent.TargetDate);
        Assert.Equal(2, countdownEvent.Alerts.Count);
    }

    [Fact]
    public void CountdownEvent_ValidatesRequiredFields()
    {
        var target = DateTime.UtcNow.AddDays(1);

        Assert.Throws<ArgumentException>(() => CountdownEventEntity.Create(Guid.Empty, "Exam", target));
        Assert.Throws<ArgumentException>(() => CountdownEventEntity.Create(Guid.NewGuid(), "", target));
        Assert.Throws<ArgumentException>(() => CountdownEventEntity.Create(Guid.NewGuid(), new string('x', 181), target));
    }

    [Fact]
    public void CountdownEvent_ComputesCompletedVisibilityAndSoftDeletes()
    {
        var now = DateTime.UtcNow;
        var countdownEvent = CountdownEventEntity.Create(Guid.NewGuid(), "Exam", now.Date.AddDays(-2));
        countdownEvent.AddAlert("OnTargetDay", "09:00", now.AddDays(-2));

        Assert.True(countdownEvent.IsCompletedAt(now));
        Assert.True(countdownEvent.IsVisibleAt(now));

        countdownEvent.SoftDelete();

        Assert.NotNull(countdownEvent.DeletedAt);
        Assert.All(countdownEvent.Alerts, alert => Assert.NotNull(alert.DeletedAt));
    }
}
