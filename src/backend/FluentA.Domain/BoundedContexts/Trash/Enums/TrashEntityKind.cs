namespace FluentA.Domain.BoundedContexts.Trash.Enums;

public enum TrashEntityKind
{
    Note = 1,
    Vocabulary = 2,
    // Value 3 belonged to the retired Level Five Trash kind.
    Journal = 4,
    // Value 5 belonged to Habit before retained soft deletion.
    Project = 6
}
