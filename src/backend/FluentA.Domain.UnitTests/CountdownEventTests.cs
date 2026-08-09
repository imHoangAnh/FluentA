using CountdownEventEntity = FluentA.Domain.BoundedContexts.Countdown.Entities.CountdownEvent;
using FluentA.Domain.BoundedContexts.Countdown.Enums;

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
        Assert.True(countdownEvent.IsVisibleAt(now.AddDays(30)));

        countdownEvent.SoftDelete();

        Assert.NotNull(countdownEvent.DeletedAt);
        Assert.All(countdownEvent.Alerts, alert => Assert.NotNull(alert.DeletedAt));
    }

    [Fact]
    public void CountdownEvent_RecurringMonthlyPreservesDayAndSkipsInvalidMonths()
    {
        var countdownEvent = CountdownEventEntity.Create(
            Guid.NewGuid(),
            "Month end",
            new DateTime(2026, 1, 31),
            repeatPattern: CountdownRepeatPattern.Monthly);
        countdownEvent.AddAlert("OnTargetDay", "09:00", new DateTime(2026, 1, 31, 2, 0, 0, DateTimeKind.Utc));
        countdownEvent.Alerts[0].MarkFired(new DateTime(2026, 1, 31, 2, 0, 0, DateTimeKind.Utc));

        var advanced = countdownEvent.AdvanceRecurrenceAt(new DateTime(2026, 2, 1, 0, 0, 0, DateTimeKind.Utc));

        Assert.True(advanced);
        Assert.Equal(new DateTime(2026, 3, 31, 0, 0, 0, DateTimeKind.Utc), countdownEvent.TargetDate);
        Assert.Null(countdownEvent.Alerts[0].FiredAtUtc);
        Assert.Equal(new DateTime(2026, 3, 31, 2, 0, 0, DateTimeKind.Utc), countdownEvent.Alerts[0].ScheduledAtUtc);
        Assert.False(countdownEvent.IsCompletedAt(new DateTime(2026, 4, 1, 0, 0, 0, DateTimeKind.Utc)));
    }

    [Fact]
    public void CountdownEvent_RecurringYearlySkipsNonLeapYears()
    {
        var countdownEvent = CountdownEventEntity.Create(
            Guid.NewGuid(),
            "Leap day",
            new DateTime(2024, 2, 29),
            repeatPattern: CountdownRepeatPattern.Yearly);

        var advanced = countdownEvent.AdvanceRecurrenceAt(new DateTime(2027, 3, 1, 0, 0, 0, DateTimeKind.Utc));

        Assert.True(advanced);
        Assert.Equal(new DateTime(2028, 2, 29, 0, 0, 0, DateTimeKind.Utc), countdownEvent.TargetDate);
    }

    [Fact]
    public void CountdownEvent_RecurringWeeklyAdvancesStrictlyAfterToday()
    {
        var countdownEvent = CountdownEventEntity.Create(
            Guid.NewGuid(),
            "Weekly",
            new DateTime(2026, 8, 2),
            repeatPattern: CountdownRepeatPattern.Weekly);

        Assert.True(countdownEvent.AdvanceRecurrenceAt(new DateTime(2026, 8, 9, 0, 0, 0, DateTimeKind.Utc)));
        Assert.Equal(new DateTime(2026, 8, 16, 0, 0, 0, DateTimeKind.Utc), countdownEvent.TargetDate);
    }
}
