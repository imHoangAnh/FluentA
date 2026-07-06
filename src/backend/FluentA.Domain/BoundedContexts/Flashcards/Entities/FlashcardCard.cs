using FluentA.Domain.BoundedContexts.Vocabulary.Entities;
using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Flashcards.Entities;

public sealed class FlashcardCard : BaseEntity
{
    private FlashcardCard()
    {
        Word = string.Empty;
        WordClass = string.Empty;
        MeaningVn = string.Empty;
        MeaningEn = string.Empty;
        Example = string.Empty;
    }

    private FlashcardCard(Guid deckId, VocabWord word)
        : this()
    {
        if (deckId == Guid.Empty)
        {
            throw new ArgumentException("Deck id is required.", nameof(deckId));
        }

        DeckId = deckId;
        WordId = word.Id;
        EaseFactor = 2.5f;
        State = CardState.New;
        SyncFromWord(word);
    }

    public Guid DeckId { get; private set; }
    public Guid WordId { get; private set; }
    public string Word { get; private set; }
    public string WordClass { get; private set; }
    public string MeaningVn { get; private set; }
    public string MeaningEn { get; private set; }
    public string Example { get; private set; }
    public string? Thesaurus { get; private set; }
    public string? Collocation { get; private set; }
    public string? Note { get; private set; }
    public int Interval { get; private set; }
    public float EaseFactor { get; private set; }
    public int Repetitions { get; private set; }
    public DateTime? NextReviewDate { get; private set; }
    public CardState State { get; private set; }

    public static FlashcardCard Create(Guid deckId, VocabWord word)
    {
        return new FlashcardCard(deckId, word);
    }

    public void SyncFromWord(VocabWord word)
    {
        if (word.Id != WordId)
        {
            throw new ArgumentException("Card and vocabulary word ids must match.", nameof(word));
        }

        Word = word.Word;
        WordClass = word.Class.ToString().ToLowerInvariant();
        MeaningVn = word.MeaningVn;
        MeaningEn = word.Definition ?? string.Empty;
        Example = word.Example;
        Thesaurus = word.Synonyms;
        Collocation = word.Antonyms;
        Note = word.Note;
        UpdatedAt = DateTime.UtcNow;
    }

    public void RecordReviewResult(int interval, float easeFactor, int repetitions, DateTime? nextReviewDate, CardState state)
    {
        if (interval < 0 || easeFactor <= 0 || repetitions < 0)
        {
            throw new ArgumentException("Review scheduling values must be non-negative and ease factor must be positive.");
        }

        Interval = interval;
        EaseFactor = easeFactor;
        Repetitions = repetitions;
        NextReviewDate = nextReviewDate;
        State = state;
        UpdatedAt = DateTime.UtcNow;
    }
}
