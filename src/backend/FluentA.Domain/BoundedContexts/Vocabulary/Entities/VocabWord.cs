using FluentA.Domain.SeedWork;
using FluentA.Domain.BoundedContexts.Vocabulary.Events;

namespace FluentA.Domain.BoundedContexts.Vocabulary.Entities;

public sealed class VocabWord : BaseEntity
{
    private VocabWord()
    {
        Word = string.Empty;
        MeaningVn = string.Empty;
        MeaningEn = string.Empty;
        Example = string.Empty;
    }

    private VocabWord(
        Guid pageId,
        string word,
        string meaningVn,
        string meaningEn,
        WordClass wordClass,
        string example,
        string? thesaurus,
        string? collocation,
        string? note)
    {
        Word = string.Empty;
        MeaningVn = string.Empty;
        MeaningEn = string.Empty;
        Example = string.Empty;
        PageId = pageId;
        Apply(word, meaningVn, meaningEn, wordClass, example, thesaurus, collocation, note);
    }

    public Guid PageId { get; private set; }
    public string Word { get; private set; }
    public string MeaningVn { get; private set; }
    public string MeaningEn { get; private set; }
    public WordClass Class { get; private set; }
    public string Example { get; private set; }
    public string? Thesaurus { get; private set; }
    public string? Collocation { get; private set; }
    public string? Note { get; private set; }

    public static VocabWord Create(
        Guid pageId,
        string word,
        string meaningVn,
        string meaningEn,
        WordClass wordClass,
        string example,
        string? thesaurus = null,
        string? collocation = null,
        string? note = null)
    {
        if (pageId == Guid.Empty)
        {
            throw new ArgumentException("Page id is required.", nameof(pageId));
        }

        var vocabWord = new VocabWord(pageId, word, meaningVn, meaningEn, wordClass, example, thesaurus, collocation, note);
        vocabWord.AddDomainEvent(new WordAddedEvent(vocabWord.Id, vocabWord.PageId, DateTime.UtcNow));
        return vocabWord;
    }

    public void Update(
        string word,
        string meaningVn,
        string meaningEn,
        WordClass wordClass,
        string example,
        string? thesaurus,
        string? collocation,
        string? note)
    {
        Apply(word, meaningVn, meaningEn, wordClass, example, thesaurus, collocation, note);
        UpdatedAt = DateTime.UtcNow;
        AddDomainEvent(new WordUpdatedEvent(Id, PageId, UpdatedAt));
    }

    public void SoftDelete()
    {
        DeletedAt = DateTime.UtcNow;
        UpdatedAt = DeletedAt.Value;
        AddDomainEvent(new WordDeletedEvent(Id, PageId, UpdatedAt));
    }

    private void Apply(
        string word,
        string meaningVn,
        string meaningEn,
        WordClass wordClass,
        string example,
        string? thesaurus,
        string? collocation,
        string? note)
    {
        Word = CleanRequired(word, 240, "Word");
        MeaningVn = CleanRequired(meaningVn, 1000, "Vietnamese meaning");
        MeaningEn = CleanRequired(meaningEn, 2000, "English meaning");
        Class = wordClass;
        Example = CleanRequired(example, 2000, "Example");
        Thesaurus = CleanOptional(thesaurus, 2000, "Thesaurus");
        Collocation = CleanOptional(collocation, 2000, "Collocation");
        Note = CleanOptional(note, 4000, "Note");
    }

    private static string CleanRequired(string value, int maxLength, string field)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Trim().Length > maxLength)
        {
            throw new ArgumentException($"{field} must be between 1 and {maxLength} characters.", field);
        }

        return value.Trim();
    }

    private static string? CleanOptional(string? value, int maxLength, string field)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        if (value.Trim().Length > maxLength)
        {
            throw new ArgumentException($"{field} must be at most {maxLength} characters.", field);
        }

        return value.Trim();
    }
}
