using FluentA.Domain.BoundedContexts.Flashcards.Entities;
using FluentA.Domain.BoundedContexts.Flashcards;
using FluentA.Domain.BoundedContexts.Todo.Entities;
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
    public void BoardAndPage_UpdateAndSoftDelete()
    {
        var board = VocabBoard.Create(Guid.NewGuid(), "IELTS", "en");
        var page = board.AddPage("Unit 1", 0);

        board.Update(" HSK ", " ZH ", 4);
        page.Update(" Lesson 2 ", 5);
        page.SoftDelete();
        board.SoftDelete();

        Assert.Equal("HSK", board.Name);
        Assert.Equal("zh", board.Language);
        Assert.Equal(4, board.SortOrder);
        Assert.NotNull(board.DeletedAt);
        Assert.Equal("Lesson 2", page.Name);
        Assert.Equal(5, page.SortOrder);
        Assert.NotNull(page.DeletedAt);
    }

    [Fact]
    public void BoardAndPage_RejectInvalidIdentityAndNames()
    {
        Assert.Throws<ArgumentException>(() => VocabBoard.Create(Guid.Empty, "IELTS", "en"));
        Assert.Throws<ArgumentException>(() => VocabBoard.Create(Guid.NewGuid(), "", "en"));
        Assert.Throws<ArgumentException>(() => VocabBoard.Create(Guid.NewGuid(), "IELTS", "e"));
        Assert.Throws<ArgumentException>(() => VocabPage.Create(Guid.Empty, "Unit 1", 0));
        Assert.Throws<ArgumentException>(() => VocabPage.Create(Guid.NewGuid(), "", 0));
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
    public void Deck_RenameSoftDeleteAndValidation()
    {
        var deck = FlashcardDeck.CreateAllWords(Guid.NewGuid(), Guid.NewGuid(), "IELTS");

        deck.Rename(" HSK - All Words ");
        deck.SoftDelete();

        Assert.Equal("HSK - All Words", deck.Name);
        Assert.NotNull(deck.DeletedAt);
        Assert.Throws<ArgumentException>(() => deck.Rename(""));
        Assert.Throws<ArgumentException>(() => FlashcardDeck.CreatePageDeck(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), new string('x', 241), "Unit"));
    }

    [Fact]
    public void CardReview_StoresResultAndValidatesInputs()
    {
        var reviewedAt = DateTime.UtcNow;
        var review = CardReview.Create(Guid.NewGuid(), Guid.NewGuid(), ReviewRating.Easy, 12, reviewedAt, 6, 2.6f);

        Assert.Equal(ReviewRating.Easy, review.Rating);
        Assert.Equal(12, review.TimeSpentSeconds);
        Assert.Equal(reviewedAt, review.ReviewedAt);
        Assert.Equal(6, review.IntervalAfter);
        Assert.Equal(2.6f, review.EaseFactorAfter);
        Assert.Throws<ArgumentException>(() => CardReview.Create(Guid.Empty, Guid.NewGuid(), ReviewRating.Good, 1, reviewedAt, 1, 2.5f));
        Assert.Throws<ArgumentException>(() => CardReview.Create(Guid.NewGuid(), Guid.NewGuid(), ReviewRating.Good, -1, reviewedAt, 1, 2.5f));
        Assert.Throws<ArgumentException>(() => CardReview.Create(Guid.NewGuid(), Guid.NewGuid(), ReviewRating.Good, 1, reviewedAt, 1, 0));
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

    [Fact]
    public void ReviewSettings_UsesDefaultsAndValidatesUpdates()
    {
        var settings = ReviewSettings.CreateDefault(Guid.NewGuid());

        Assert.Equal(20, settings.NewCardsPerDay);
        Assert.Equal(200, settings.ReviewCardsPerDay);

        settings.Update(12, 80);
        Assert.Equal(12, settings.NewCardsPerDay);
        Assert.Equal(80, settings.ReviewCardsPerDay);
        Assert.Throws<ArgumentOutOfRangeException>(() => settings.Update(-1, 80));
        Assert.Throws<ArgumentOutOfRangeException>(() => settings.Update(12, 1001));
    }

    [Fact]
    public void CustomColumnsAndValues_NormalizeAndPreserveTypes()
    {
        var boardId = Guid.NewGuid();
        var wordId = Guid.NewGuid();
        var textColumn = VocabCustomColumn.Create(boardId, " Register ", CustomColumnType.Text, 0);
        var numberColumn = VocabCustomColumn.Create(boardId, "Priority", CustomColumnType.Number, 1);

        var text = VocabCustomValue.CreateText(wordId, textColumn.Id, " formal ");
        var number = VocabCustomValue.CreateNumber(wordId, numberColumn.Id, 3.5m);

        Assert.Equal("Register", textColumn.Name);
        Assert.Equal(CustomColumnType.Number, numberColumn.Type);
        Assert.Equal("formal", text.TextValue);
        Assert.Equal(3.5m, number.NumberValue);
        Assert.Null(number.TextValue);
    }

    [Fact]
    public void CustomColumnVisibilityAndValues_ValidateBoundaries()
    {
        var userId = Guid.NewGuid();
        var boardId = Guid.NewGuid();
        var hidden = VocabColumnVisibility.Create(userId, boardId, " Custom:ABC ");

        Assert.Equal("custom:abc", hidden.ColumnKey);
        Assert.Throws<ArgumentException>(() => VocabColumnVisibility.Create(Guid.Empty, boardId, "note"));
        Assert.Throws<ArgumentException>(() => VocabColumnVisibility.Create(userId, boardId, ""));
        Assert.Throws<ArgumentException>(() => VocabCustomColumn.Create(Guid.Empty, "Priority", CustomColumnType.Number, 0));
        Assert.Throws<ArgumentException>(() => VocabCustomColumn.Create(boardId, "", CustomColumnType.Text, 0));
        Assert.Throws<ArgumentException>(() => VocabCustomValue.CreateText(Guid.NewGuid(), Guid.NewGuid(), ""));
    }

    [Fact]
    public void TodoItem_ValidatesAndTracksLifecycle()
    {
        var yesterday = DateTime.UtcNow.Date.AddDays(-1);
        var today = DateTime.UtcNow.Date;
        var item = TodoItem.Create(Guid.NewGuid(), " Review IELTS ", yesterday, " Unit 3 ", 0);

        item.Rename("Review HSK");
        item.UpdateNote("tones");
        item.SetCompleted(true, DateTime.UtcNow);
        item.SetCompleted(false, DateTime.UtcNow);
        var carried = item.CarryOver(today);
        var repeated = item.CarryOver(today);

        Assert.Equal("Review HSK", item.Title);
        Assert.Equal("tones", item.Note);
        Assert.False(item.IsCompleted);
        Assert.True(carried);
        Assert.False(repeated);
        Assert.True(item.IsCarriedOver);
        Assert.Equal(today, item.Date);
        Assert.Equal(yesterday, item.OriginalDate);
    }

    [Fact]
    public void TodoItem_RejectsInvalidInputs()
    {
        Assert.Throws<ArgumentException>(() => TodoItem.Create(Guid.Empty, "Task", DateTime.UtcNow, null));
        Assert.Throws<ArgumentException>(() => TodoItem.Create(Guid.NewGuid(), "", DateTime.UtcNow, null));
        Assert.Throws<ArgumentException>(() => TodoItem.Create(Guid.NewGuid(), "Task", DateTime.UtcNow, new string('x', 4001)));
        Assert.Throws<ArgumentOutOfRangeException>(() => TodoItem.Create(Guid.NewGuid(), "Task", DateTime.UtcNow, null, -1));
    }
}
