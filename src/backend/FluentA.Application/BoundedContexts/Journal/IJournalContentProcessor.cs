namespace FluentA.Application.BoundedContexts.Journal;

public interface IJournalContentProcessor
{
    JournalProcessedContent Process(string? content);
}

public sealed record JournalProcessedContent(string Html, string PlainText);

