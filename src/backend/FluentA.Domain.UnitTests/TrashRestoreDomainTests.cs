using FluentA.Domain.BoundedContexts.Assets.Entities;
using FluentA.Domain.BoundedContexts.Assets.Enums;
using FluentA.Domain.BoundedContexts.Note.Entities;
using CountdownEventEntity = FluentA.Domain.BoundedContexts.Countdown.Entities.CountdownEvent;
using FluentA.Domain.BoundedContexts.Habit.Entities;
using FluentA.Domain.BoundedContexts.Habit.Enums;

namespace FluentA.Domain.UnitTests;

public sealed class TrashRestoreDomainTests
{
    [Fact]
    public void NoteBoardAndPage_RestoreFromTrash_ReturnToActive()
    {
        var board = NoteBoard.Create(Guid.NewGuid(), "Personal");
        var page = board.AddPage("Today", "<p>keep this</p>", new DateTime(2035, 7, 21));
        var trashedAt = new DateTime(2035, 7, 22, 10, 0, 0, DateTimeKind.Utc);

        board.SoftDelete(trashedAt);
        board.RestoreFromTrash(trashedAt.AddMinutes(1));
        page.RestoreFromTrash(trashedAt.AddMinutes(1));

        Assert.Null(board.DeletedAt);
        Assert.Null(page.DeletedAt);
        Assert.Equal(trashedAt.AddMinutes(1), board.UpdatedAt);
        Assert.Equal(trashedAt.AddMinutes(1), page.UpdatedAt);
    }

    [Fact]
    public void ArchivedNoteImage_RestoreFromTrash_ReturnsToReadyWithoutPurgeDeadline()
    {
        var asset = Asset.CreatePending(
            Guid.NewGuid(),
            Guid.NewGuid(),
            AssetType.NoteImage,
            "notes/test.png",
            "image/png",
            12,
            new DateTime(2035, 7, 21, 10, 0, 0, DateTimeKind.Utc));
        asset.FinalizeUpload("image/png", 12);
        asset.Archive(new DateTime(2035, 7, 22, 10, 0, 0, DateTimeKind.Utc), TimeSpan.FromDays(30));

        asset.RestoreFromTrash(new DateTime(2035, 7, 23, 10, 0, 0, DateTimeKind.Utc));

        Assert.Equal(AssetStatus.Ready, asset.Status);
        Assert.Null(asset.ArchivedAt);
        Assert.Null(asset.PurgeAfterAt);
    }

    [Fact]
    public void ExpiredCountdown_RestoreRemainsVisibleAsADurableMemory()
    {
        var countdown = CountdownEventEntity.Create(Guid.NewGuid(), "Exam", new DateTime(2026, 7, 1));
        var restoredAt = new DateTime(2026, 7, 28, 10, 0, 0, DateTimeKind.Utc);

        countdown.SoftDelete(restoredAt);
        countdown.RestoreFromTrash(restoredAt);

        Assert.Null(countdown.DeletedAt);
        Assert.True(countdown.IsCompletedAt(restoredAt));
        Assert.True(countdown.IsVisibleAt(restoredAt.AddDays(7)));
        Assert.True(countdown.IsVisibleAt(restoredAt.AddDays(8)));
    }

    [Fact]
    public void Habit_RestoreKeepsCheckInDataButDoesNotRestoreReminder()
    {
        var habit = Habit.Create(
            Guid.NewGuid(), "Read", null, HabitIcon.Book, HabitFrequency.Daily, null,
            reminderTime: new TimeOnly(7, 30));
        var trashedAt = new DateTime(2026, 7, 28, 10, 0, 0, DateTimeKind.Utc);

        habit.MoveToTrash(trashedAt);
        habit.RestoreFromTrash(trashedAt.AddMinutes(1));

        Assert.Null(habit.DeletedAt);
        Assert.False(habit.ReminderEnabled);
        Assert.Null(habit.LastReminderSentOn);
        Assert.Equal(new TimeOnly(7, 30), habit.ReminderTime);
    }
}
