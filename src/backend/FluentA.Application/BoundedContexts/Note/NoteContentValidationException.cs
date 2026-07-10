namespace FluentA.Application.BoundedContexts.Note;

public sealed class NoteContentValidationException : Exception
{
    public NoteContentValidationException(Dictionary<string, string[]> errors)
        : base("Note content validation failed.")
    {
        Errors = errors;
    }

    public Dictionary<string, string[]> Errors { get; }
}
