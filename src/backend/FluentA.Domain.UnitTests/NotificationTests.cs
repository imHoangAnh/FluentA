using FluentA.Domain.BoundedContexts.Notification.Entities;

namespace FluentA.Domain.UnitTests;

public sealed class NotificationTests
{
    [Fact]
    public void Create_AcceptsOnlyOptionalApplicationRelativeActionPaths()
    {
        var userId = Guid.NewGuid();
        var actionable = Notification.Create(userId, "TodoReminder", "Reminder", "Task", "todo:key", "/todo?taskId=abc");
        var passive = Notification.Create(userId, "HabitReminder", "Reminder", "Habit", "habit:key");

        Assert.Equal("/todo?taskId=abc", actionable.ActionPath);
        Assert.Null(passive.ActionPath);
        Assert.Throws<ArgumentException>(() => Notification.Create(userId, "TodoReminder", "Reminder", "Task", "key:1", "https://example.com"));
        Assert.Throws<ArgumentException>(() => Notification.Create(userId, "TodoReminder", "Reminder", "Task", "key:2", "//example.com/todo"));
        Assert.Throws<ArgumentException>(() => Notification.Create(userId, "TodoReminder", "Reminder", "Task", "key:3", "/todo\\evil"));
        Assert.Throws<ArgumentException>(() => Notification.Create(userId, "TodoReminder", "Reminder", "Task", "key:4", "/todo\nnext"));
    }
}
