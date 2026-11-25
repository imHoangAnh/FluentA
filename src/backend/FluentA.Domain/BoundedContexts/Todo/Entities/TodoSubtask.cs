using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Todo.Entities;

public sealed class TodoSubtask : BaseEntity
{
    private TodoSubtask()
    {
        Title = string.Empty;
    }

    private TodoSubtask(Guid todoItemId, string title, int sortOrder, bool isCompleted)
    {
        if (todoItemId == Guid.Empty)
        {
            throw new ArgumentException("Todo item id is required.", nameof(todoItemId));
        }

        TodoItemId = todoItemId;
        Title = CleanTitle(title);
        SortOrder = ValidateSortOrder(sortOrder);
        IsCompleted = isCompleted;
    }

    public Guid TodoItemId { get; private set; }
    public string Title { get; private set; }
    public bool IsCompleted { get; private set; }
    public int SortOrder { get; private set; }

    public static TodoSubtask Create(Guid todoItemId, string title, int sortOrder = 0, bool isCompleted = false)
    {
        return new TodoSubtask(todoItemId, title, sortOrder, isCompleted);
    }

    public void Rename(string title)
    {
        Title = CleanTitle(title);
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetCompleted(bool isCompleted)
    {
        if (IsCompleted == isCompleted)
        {
            return;
        }

        IsCompleted = isCompleted;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetSortOrder(int sortOrder)
    {
        SortOrder = ValidateSortOrder(sortOrder);
        UpdatedAt = DateTime.UtcNow;
    }

    public void SoftDelete(DateTime? nowUtc = null)
    {
        if (DeletedAt.HasValue)
        {
            return;
        }

        var now = DateTime.SpecifyKind(nowUtc ?? DateTime.UtcNow, DateTimeKind.Utc);
        DeletedAt = now;
        UpdatedAt = now;
    }

    private static string CleanTitle(string title)
    {
        var cleaned = title.Trim();
        if (cleaned.Length is < 1 or > 240)
        {
            throw new ArgumentException("Subtask title must be between 1 and 240 characters.", nameof(title));
        }

        return cleaned;
    }

    private static int ValidateSortOrder(int sortOrder)
    {
        if (sortOrder < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(sortOrder), "Subtask sort order cannot be negative.");
        }

        return sortOrder;
    }
}
