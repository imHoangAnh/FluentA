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
    public void CreateDeck_NamesPageDecks()
    {
        var userId = Guid.NewGuid();
        var boardId = Guid.NewGuid();
        var pageId = Guid.NewGuid();

        var pageDeck = FlashcardDeck.CreatePageDeck(userId, boardId, pageId, "IELTS", "Unit 1");

        Assert.Equal("IELTS - Unit 1", pageDeck.Name);
        Assert.Equal(DeckType.PageDeck, pageDeck.Type);
        Assert.Equal(pageId, pageDeck.PageId);
    }

    [Fact]
    public void Deck_RenameSoftDeleteAndValidation()
    {
        var deck = FlashcardDeck.CreatePageDeck(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), "IELTS", "Unit 1");

        deck.Rename(" HSK - Lesson 2 ");
        deck.SoftDelete();

        Assert.Equal("HSK - Lesson 2", deck.Name);
        Assert.NotNull(deck.DeletedAt);
        Assert.Throws<ArgumentException>(() => deck.Rename(""));
        Assert.Throws<ArgumentException>(() => FlashcardDeck.CreatePageDeck(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), new string('x', 241), "Unit"));
    }

    [Fact]
    public void WordReviewHistory_StoresResultAndValidatesInputs()
    {
        var reviewedAt = DateTime.UtcNow;
        var review = WordReviewHistory.Create(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            12,
            reviewedAt,
            FluentAsrsReviewResult.Correct,
            2,
            3,
            reviewedAt.AddDays(14));

        Assert.Equal(FluentAsrsReviewResult.Correct, review.Result);
        Assert.Equal(12, review.TimeSpentSeconds);
        Assert.Equal(reviewedAt, review.ReviewedAt);
        Assert.Equal(2, review.LevelBefore);
        Assert.Equal(3, review.LevelAfter);
        Assert.Throws<ArgumentException>(() => WordReviewHistory.Create(Guid.Empty, Guid.NewGuid(), Guid.NewGuid(), 1, reviewedAt, FluentAsrsReviewResult.Correct, 0, 1, reviewedAt.AddDays(1)));
        Assert.Throws<ArgumentException>(() => WordReviewHistory.Create(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), -1, reviewedAt, FluentAsrsReviewResult.Correct, 0, 1, reviewedAt.AddDays(1)));
        Assert.Throws<ArgumentException>(() => WordReviewHistory.Create(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 1, reviewedAt, FluentAsrsReviewResult.Correct, 0, 6, reviewedAt.AddDays(1)));
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
    [InlineData(0, 1, 0)]
    [InlineData(1, 2, 0)]
    [InlineData(2, 3, 0)]
    [InlineData(3, 4, 0)]
    [InlineData(4, 5, 0)]
    [InlineData(5, 5, 0)]
    public void FluentAsrsScheduler_AdvancesLevelsOnCorrect(int levelBefore, int expectedLevelAfter, int lapseCount)
    {
        var result = FluentAsrsScheduler.ApplyCorrect(levelBefore, lapseCount);

        Assert.Equal(expectedLevelAfter, result.LevelAfter);
        Assert.Equal(lapseCount, result.LapseCountAfter);
        Assert.Equal(FluentAsrsScheduler.IntervalDaysForLevel(expectedLevelAfter), result.IntervalDays);
    }

    [Fact]
    public void ReviewSettings_UsesDefaultsAndValidatesUpdates()
    {
        var settings = ReviewSettings.CreateDefault(Guid.NewGuid());

        Assert.Equal(300, settings.DailyLimit);
        Assert.True(settings.RecapAfterAnswer);

        settings.Update(120, false);
        Assert.Equal(120, settings.DailyLimit);
        Assert.False(settings.RecapAfterAnswer);
        Assert.Throws<ArgumentOutOfRangeException>(() => settings.Update(0, false));
        Assert.Throws<ArgumentOutOfRangeException>(() => settings.Update(1001, true));
    }

    [Fact]
    public void FluentAsrsScheduler_ResetsToLevelZeroOnWrongAndIncrementsLapsesAboveLevelZero()
    {
        var levelZero = FluentAsrsScheduler.ApplyWrong(0, 3);
        var levelThree = FluentAsrsScheduler.ApplyWrong(3, 3);

        Assert.Equal(0, levelZero.LevelAfter);
        Assert.Equal(3, levelZero.LapseCountAfter);
        Assert.Equal(1, levelZero.IntervalDays);
        Assert.Equal(0, levelThree.LevelAfter);
        Assert.Equal(4, levelThree.LapseCountAfter);
        Assert.Equal(1, levelThree.IntervalDays);
    }

    [Fact]
    public void WordReviewState_CreatesAndAppliesFluentAsrsState()
    {
        var nextReviewDate = DateTime.UtcNow.Date.AddDays(1);
        var state = WordReviewState.CreateLevelZero(Guid.NewGuid(), Guid.NewGuid(), nextReviewDate);

        Assert.Equal(0, state.Level);
        Assert.Equal(0, state.LapseCount);
        Assert.Equal(nextReviewDate, state.NextReviewDate);
        Assert.Null(state.LastReviewedAt);

        var reviewedAt = DateTime.UtcNow;
        state.ApplyResult(1, nextReviewDate.AddDays(1), 0, reviewedAt);

        Assert.Equal(1, state.Level);
        Assert.Equal(0, state.LapseCount);
        Assert.Equal(nextReviewDate.AddDays(1), state.NextReviewDate);
        Assert.Equal(reviewedAt, state.LastReviewedAt);
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
