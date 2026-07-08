using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Todo.Entities;

public sealed class TodoItem : BaseEntity, IAggregateRoot
{
    private TodoItem()
    {
        Title = string.Empty;
    }

    private TodoItem(Guid userId, string title, DateTime date, string? note)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User id is required.", nameof(userId));
        }

        UserId = userId;
        Title = CleanTitle(title);
        Date = NormalizeDate(date);
        Note = CleanNote(note);
    }

    public Guid UserId { get; private set; }
    public string Title { get; private set; }
    public string? Note { get; private set; }
    public DateTime Date { get; private set; }
    public bool IsCompleted { get; private set; }
    public DateTime? CompletedAt { get; private set; }
    public static TodoItem Create(Guid userId, string title, DateTime date, string? note)
    {
        return new TodoItem(userId, title, date, note);
    }

    public void Rename(string title)
    {
        Title = CleanTitle(title);
        Touch();
    }

    public void UpdateNote(string? note)
    {
        Note = CleanNote(note);
        Touch();
    }

    public void SetCompleted(bool isCompleted, DateTime nowUtc)
    {
        if (IsCompleted == isCompleted)
        {
            return;
        }

        IsCompleted = isCompleted;
        CompletedAt = isCompleted ? nowUtc : null;
        Touch(nowUtc);
    }

    public void SoftDelete()
    {
        DeletedAt = DateTime.UtcNow;
        UpdatedAt = DeletedAt.Value;
    }

    private void Touch(DateTime? nowUtc = null)
    {
        UpdatedAt = nowUtc ?? DateTime.UtcNow;
    }

    private static DateTime NormalizeDate(DateTime date)
    {
        return DateTime.SpecifyKind(date.Date, DateTimeKind.Utc);
    }

    private static string CleanTitle(string title)
    {
        var cleaned = title.Trim();
        if (cleaned.Length is < 1 or > 240)
        {
            throw new ArgumentException("Todo title must be between 1 and 240 characters.", nameof(title));
        }

        return cleaned;
    }

    private static string? CleanNote(string? note)
    {
        if (string.IsNullOrWhiteSpace(note))
        {
            return null;
        }

        var cleaned = note.Trim();
        if (cleaned.Length > 4000)
        {
            throw new ArgumentException("Todo note must be at most 4000 characters.", nameof(note));
        }

        return cleaned;
    }

}
