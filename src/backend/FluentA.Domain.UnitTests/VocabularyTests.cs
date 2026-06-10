using FluentA.Domain.BoundedContexts.Flashcards.Entities;
using FluentA.Domain.BoundedContexts.Flashcards;
using FluentA.Domain.BoundedContexts.Vocabulary.Entities;
using FluentA.Domain.BoundedContexts.Vocabulary.Events;

namespace FluentA.Domain.UnitTests;

public sealed class VocabularyTests
{
    [Fact]
    public void CreateBoard_NormalizesNameAndLanguage()
    {
        var userId = Guid.NewGuid();

        var board = VocabBoard.Create(userId, " IELTS Vocabulary ", " EN ", 2);

        Assert.Equal(userId, board.UserId);
        Assert.Equal("IELTS Vocabulary", board.Name);
        Assert.Equal("en", board.Language);
        Assert.Equal(2, board.SortOrder);
    }

    [Fact]
    public void AddPage_StoresBoardAndSortOrder()
    {
        var board = VocabBoard.Create(Guid.NewGuid(), "IELTS", "en");

        var page = board.AddPage(" Unit 1 - Education ", 3);

        Assert.Equal(board.Id, page.BoardId);
        Assert.Equal("Unit 1 - Education", page.Name);
        Assert.Equal(3, page.SortOrder);
    }

    [Fact]
    public void CreateDeck_NamesAllWordsAndPageDecks()
    {
        var userId = Guid.NewGuid();
        var boardId = Guid.NewGuid();
        var pageId = Guid.NewGuid();

        var allWords = FlashcardDeck.CreateAllWords(userId, boardId, "IELTS");
        var pageDeck = FlashcardDeck.CreatePageDeck(userId, boardId, pageId, "IELTS", "Unit 1");

        Assert.Equal("IELTS - All Words", allWords.Name);
        Assert.Equal(DeckType.AllWords, allWords.Type);
        Assert.Null(allWords.PageId);
        Assert.Equal("IELTS - Unit 1", pageDeck.Name);
        Assert.Equal(DeckType.PageDeck, pageDeck.Type);
        Assert.Equal(pageId, pageDeck.PageId);
    }

    [Fact]
    public void CreateAndUpdateWord_NormalizesContent()
    {
        var word = VocabWord.Create(
            Guid.NewGuid(),
            " mitigate ",
            " giảm nhẹ ",
            " make less severe ",
            WordClass.Verb,
            " Mitigate the risk. ",
            " reduce ",
            null,
            " formal ");

        word.Update("mitigation", "sự giảm nhẹ", "the act of reducing harm", WordClass.Noun, "Risk mitigation matters.", null, "risk mitigation", null);

        Assert.Equal("mitigation", word.Word);
        Assert.Equal(WordClass.Noun, word.Class);
        Assert.Equal("risk mitigation", word.Collocation);
        Assert.Null(word.Thesaurus);
    }

    [Fact]
    public void WordLifecycle_RaisesSynchronizationEvents()
    {
        var word = VocabWord.Create(Guid.NewGuid(), "mitigate", "giảm nhẹ", "make less severe", WordClass.Verb, "Mitigate the risk.");

        Assert.IsType<WordAddedEvent>(Assert.Single(word.DomainEvents));

        word.ClearDomainEvents();
        word.Update("mitigation", "sự giảm nhẹ", "reduction of harm", WordClass.Noun, "Mitigation matters.", null, null, null);
        Assert.IsType<WordUpdatedEvent>(Assert.Single(word.DomainEvents));

        word.ClearDomainEvents();
        word.SoftDelete();
        Assert.IsType<WordDeletedEvent>(Assert.Single(word.DomainEvents));
    }

    [Fact]
    public void CardSyncFromWord_PreservesSchedulingMetadata()
    {
        var word = VocabWord.Create(Guid.NewGuid(), "mitigate", "giảm nhẹ", "make less severe", WordClass.Verb, "Mitigate the risk.");
        var card = FlashcardCard.Create(Guid.NewGuid(), word);
        var nextReview = DateTime.UtcNow.AddDays(7);
        card.RecordReviewResult(7, 2.7f, 3, nextReview, CardState.Review);

        word.Update("mitigation", "sự giảm nhẹ", "reduction of harm", WordClass.Noun, "Mitigation matters.", null, "risk mitigation", null);
        card.SyncFromWord(word);

        Assert.Equal("mitigation", card.Word);
        Assert.Equal("noun", card.WordClass);
        Assert.Equal(7, card.Interval);
        Assert.Equal(2.7f, card.EaseFactor);
        Assert.Equal(3, card.Repetitions);
        Assert.Equal(nextReview, card.NextReviewDate);
        Assert.Equal(CardState.Review, card.State);
    }

    [Theory]
    [InlineData(0, 2.5f, 0, ReviewRating.Again, 1, 2.18f, 0, CardState.Learning)]
    [InlineData(9, 2.5f, 4, ReviewRating.Hard, 1, 2.36f, 0, CardState.Learning)]
    [InlineData(0, 2.5f, 0, ReviewRating.Good, 1, 2.5f, 1, CardState.Learning)]
    [InlineData(1, 2.5f, 1, ReviewRating.Easy, 6, 2.6f, 2, CardState.Learning)]
    [InlineData(6, 2.5f, 2, ReviewRating.Good, 15, 2.5f, 3, CardState.Review)]
    [InlineData(10, 2.05f, 3, ReviewRating.Easy, 21, 2.15f, 4, CardState.Mature)]
    [InlineData(10, 1.3f, 3, ReviewRating.Again, 1, 1.3f, 0, CardState.Learning)]
    public void Sm2Scheduler_CalculatesDeterministicResult(
        int interval,
        float easeFactor,
        int repetitions,
        ReviewRating rating,
        int expectedInterval,
        float expectedEaseFactor,
        int expectedRepetitions,
        CardState expectedState)
    {
        var result = Sm2Scheduler.Calculate(interval, easeFactor, repetitions, rating);

        Assert.Equal(expectedInterval, result.Interval);
        Assert.Equal(expectedEaseFactor, result.EaseFactor, precision: 2);
        Assert.Equal(expectedRepetitions, result.Repetitions);
        Assert.Equal(expectedState, result.State);
    }
}
