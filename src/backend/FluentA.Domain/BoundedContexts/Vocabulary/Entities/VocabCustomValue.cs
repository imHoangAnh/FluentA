using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Vocabulary.Entities;

public sealed class VocabCustomValue : BaseEntity
{
    private VocabCustomValue()
    {
    }

    private VocabCustomValue(Guid wordId, Guid columnId, string? textValue, decimal? numberValue)
    {
        WordId = wordId;
        ColumnId = columnId;
        TextValue = textValue;
        NumberValue = numberValue;
    }

    public Guid WordId { get; private set; }
    public Guid ColumnId { get; private set; }
    public string? TextValue { get; private set; }
    public decimal? NumberValue { get; private set; }

    public static VocabCustomValue CreateText(Guid wordId, Guid columnId, string value) =>
        new(wordId, columnId, CleanText(value), null);

    public static VocabCustomValue CreateNumber(Guid wordId, Guid columnId, decimal value) =>
        new(wordId, columnId, null, value);

    private static string CleanText(string value)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Trim().Length > 4000)
        {
            throw new ArgumentException("Custom text value must be between 1 and 4000 characters.", nameof(value));
        }

        return value.Trim();
    }
}
