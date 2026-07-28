using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Vocabulary.Entities;

public sealed class VocabWord : BaseEntity
{
    private VocabWord()
    {
        Word = string.Empty;
        MeaningVn = string.Empty;
        IpaPronunciation = string.Empty;
        Example = string.Empty;
    }

    private VocabWord(
        Guid pageId,
        string word,
        string meaningVn,
        string ipaPronunciation,
        WordClass wordClass,
        string? definition,
        string example,
        string? note,
        string? synonyms,
        string? antonyms)
        : this()
    {
        PageId = pageId;
        Apply(word, meaningVn, ipaPronunciation, wordClass, definition, example, note, synonyms, antonyms);
    }

    public Guid PageId { get; private set; }
    public string Word { get; private set; }
    public string MeaningVn { get; private set; }
    public string IpaPronunciation { get; private set; }
    public WordClass Class { get; private set; }
    public string? Definition { get; private set; }
    public string Example { get; private set; }
    public string? Note { get; private set; }
    public string? Synonyms { get; private set; }
    public string? Antonyms { get; private set; }

    public static VocabWord Create(
        Guid pageId,
        string word,
        string meaningVn,
        string ipaPronunciation,
        WordClass wordClass,
        string? definition,
        string example,
        string? note = null,
        string? synonyms = null,
        string? antonyms = null)
    {
        if (pageId == Guid.Empty)
        {
            throw new ArgumentException("Page id is required.", nameof(pageId));
        }

        return new VocabWord(pageId, word, meaningVn, ipaPronunciation, wordClass, definition, example, note, synonyms, antonyms);
    }

    public void Update(
        string word,
        string meaningVn,
        string ipaPronunciation,
        WordClass wordClass,
        string? definition,
        string example,
        string? note,
        string? synonyms,
        string? antonyms)
    {
        Apply(word, meaningVn, ipaPronunciation, wordClass, definition, example, note, synonyms, antonyms);
        UpdatedAt = DateTime.UtcNow;
    }

    public void SoftDelete(DateTime? nowUtc = null)
    {
        var now = DateTime.SpecifyKind(nowUtc ?? DateTime.UtcNow, DateTimeKind.Utc);
        DeletedAt = now;
        UpdatedAt = now;
    }

    public void RestoreFromTrash(DateTime? nowUtc = null)
    {
        DeletedAt = null;
        UpdatedAt = DateTime.SpecifyKind(nowUtc ?? DateTime.UtcNow, DateTimeKind.Utc);
    }

    private void Apply(
        string word,
        string meaningVn,
        string ipaPronunciation,
        WordClass wordClass,
        string? definition,
        string example,
        string? note,
        string? synonyms,
        string? antonyms)
    {
        Word = CleanRequired(word, 240, "Word");
        MeaningVn = CleanRequired(meaningVn, 1000, "Vietnamese meaning");
        IpaPronunciation = CleanRequired(ipaPronunciation, 2000, "IPA pronunciation");
        Class = wordClass;
        Definition = CleanOptional(definition, 4000, "Definition");
        Example = CleanRequired(example, 2000, "Example");
        Note = CleanOptional(note, 4000, "Note");
        Synonyms = CleanOptional(synonyms, 2000, "Synonyms");
        Antonyms = CleanOptional(antonyms, 2000, "Antonyms");
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
