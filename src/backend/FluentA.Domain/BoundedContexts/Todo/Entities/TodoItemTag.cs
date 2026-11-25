namespace FluentA.Domain.BoundedContexts.Todo.Entities;

public sealed class TodoItemTag
{
    private TodoItemTag()
    {
    }

    public TodoItemTag(Guid todoItemId, Guid tagId, TodoTag? tag = null)
    {
        TodoItemId = todoItemId;
        TagId = tagId;
        Tag = tag;
    }

    public Guid TodoItemId { get; private set; }
    public Guid TagId { get; private set; }
    public TodoTag? Tag { get; private set; }
}
