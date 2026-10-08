namespace FluentA.Application.BoundedContexts.Journal;

public sealed class JournalContentValidationException(Dictionary<string, string[]> errors) : Exception("Invalid journal content.")
{
    public Dictionary<string, string[]> Errors { get; } = errors;
}
