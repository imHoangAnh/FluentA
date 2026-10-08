namespace FluentA.Domain.BoundedContexts.Trash.Enums;

public enum TrashEntityKind
{
    Todo,
    Note,
    Vocabulary,
    // Value 3 belonged to the retired Level Five Trash kind.
    Journal = 4,
    Habit,
    Project
}
