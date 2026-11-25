using CountdownEventEntity = FluentA.Domain.BoundedContexts.Countdown.Entities.CountdownEvent;

namespace FluentA.Domain.UnitTests;

public sealed class CountdownEventTests
{
    [Fact]
    public void Create_NormalizesNameAndTargetDate()
    {
        var userId = Guid.NewGuid();
        var target = new DateTime(2026, 7, 2, 9, 0, 0, DateTimeKind.Utc);

        var countdown = CountdownEventEntity.Create(userId, " IELTS Exam ", target);

        Assert.Equal(userId, countdown.UserId);
        Assert.Equal("IELTS Exam", countdown.Name);
        Assert.Equal(new DateTime(2026, 7, 2, 0, 0, 0, DateTimeKind.Utc), countdown.TargetDate);
    }

    [Fact]
    public void Create_ValidatesRequiredFields()
    {
        var target = DateTime.UtcNow.AddDays(1);

        Assert.Throws<ArgumentException>(() => CountdownEventEntity.Create(Guid.Empty, "Exam", target));
        Assert.Throws<ArgumentException>(() => CountdownEventEntity.Create(Guid.NewGuid(), "", target));
        Assert.Throws<ArgumentException>(() => CountdownEventEntity.Create(Guid.NewGuid(), new string('x', 181), target));
        Assert.Throws<ArgumentException>(() => CountdownEventEntity.Create(Guid.NewGuid(), "Exam", target, Guid.Empty));
    }

    [Fact]
    public void IsCompletedAt_MovesToCompleteAtUtcMidnightAfterTargetDate()
    {
        var countdown = CountdownEventEntity.Create(Guid.NewGuid(), "Exam", new DateTime(2026, 7, 2));

        Assert.False(countdown.IsCompletedAt(new DateTime(2026, 7, 2, 23, 59, 59, DateTimeKind.Utc)));
        Assert.True(countdown.IsCompletedAt(new DateTime(2026, 7, 3, 0, 0, 0, DateTimeKind.Utc)));
        Assert.True(countdown.IsCompletedAt(new DateTime(2026, 8, 3, 0, 0, 0, DateTimeKind.Utc)));
    }

    [Fact]
    public void SoftDelete_SetsUtcTimestampOnceAndPreservesCover()
    {
        var coverId = Guid.NewGuid();
        var countdown = CountdownEventEntity.Create(Guid.NewGuid(), "Exam", new DateTime(2026, 11, 1), coverId);
        var deletedAt = new DateTime(2026, 10, 8, 7, 0, 0, DateTimeKind.Utc);

        Assert.Null(countdown.DeletedAt);
        countdown.SoftDelete(deletedAt);
        countdown.SoftDelete(deletedAt.AddHours(1));

        Assert.Equal(deletedAt, countdown.DeletedAt);
        Assert.Equal(deletedAt, countdown.UpdatedAt);
        Assert.Equal(coverId, countdown.CoverAssetId);
    }
}
