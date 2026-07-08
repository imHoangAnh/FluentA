using FluentA.Domain.BoundedContexts.Flashcards.Entities;
using FluentA.Domain.BoundedContexts.Review;
using FluentA.Domain.BoundedContexts.Review.Entities;
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

        var board = VocabBoard.Create(userId, " IELTS Vocabulary ", " EN ");

        Assert.Equal(userId, board.UserId);
        Assert.Equal("IELTS Vocabulary", board.Name);
        Assert.Equal("en", board.Language);
    }

    [Fact]
    public void AddPage_StoresBoardAndNormalizesName()
    {
        var board = VocabBoard.Create(Guid.NewGuid(), "IELTS", "en");

        var page = board.AddPage(" Unit 1 - Education ");

        Assert.Equal(board.Id, page.BoardId);
        Assert.Equal("Unit 1 - Education", page.Name);
    }

    [Fact]
    public void CreateAndUpdateWord_NormalizesFixedFieldsAndPreservesIpaSlashes()
    {
        var word = VocabWord.Create(
            Guid.NewGuid(),
            " mitigate ",
            " giam nhe ",
            " /mItIgeIt/ ",
            WordClass.Verb,
            " reduce harm ",
            " Mitigate the risk. ",
            " formal ",
            " reduce ",
            null);

        word.Update("mitigation", "su giam nhe", "/mItI'geISn/", WordClass.Noun, null, "Risk mitigation matters.", null, "reduction", "aggravation");

        Assert.Equal("mitigation", word.Word);
        Assert.Equal("/mItI'geISn/", word.IpaPronunciation);
        Assert.Equal("reduction", word.Synonyms);
        Assert.Equal("aggravation", word.Antonyms);
        Assert.Null(word.Definition);
    }

    [Fact]
    public void WordLifecycle_RaisesSynchronizationEvents()
    {
        var word = VocabWord.Create(Guid.NewGuid(), "mitigate", "giam nhe", "/mItIgeIt/", WordClass.Verb, "reduce harm", "Mitigate the risk.");

        Assert.IsType<WordAddedEvent>(Assert.Single(word.DomainEvents));

        word.ClearDomainEvents();
        word.Update("mitigation", "su giam nhe", "/mItI'geISn/", WordClass.Noun, "risk reduction", "Mitigation matters.", null, null, null);
        Assert.IsType<WordUpdatedEvent>(Assert.Single(word.DomainEvents));

        word.ClearDomainEvents();
        word.SoftDelete();
        Assert.IsType<WordDeletedEvent>(Assert.Single(word.DomainEvents));
    }

    [Fact]
    public void CardSyncFromWord_MapsDefinitionSynonymsAndAntonyms()
    {
        var word = VocabWord.Create(Guid.NewGuid(), "mitigate", "giam nhe", "/mItIgeIt/", WordClass.Verb, "reduce harm", "Mitigate the risk.", null, "reduce", "worsen");
        var card = FlashcardCard.Create(Guid.NewGuid(), word);
        var nextReview = DateTime.UtcNow.AddDays(7);
        card.RecordReviewResult(7, 2.7f, 3, nextReview, CardState.Review);

        word.Update("mitigation", "su giam nhe", "/mItI'geISn/", WordClass.Noun, "risk reduction", "Mitigation matters.", "formal", "reduction", "aggravation");
        card.SyncFromWord(word);

        Assert.Equal("risk reduction", card.MeaningEn);
        Assert.Equal("reduction", card.Thesaurus);
        Assert.Equal("aggravation", card.Collocation);
        Assert.Equal(7, card.Interval);
        Assert.Equal(CardState.Review, card.State);
    }

    [Fact]
    public void BoardPreferences_NormalizeListsAndWidths()
    {
        var preference = VocabBoardPreference.Create(
            Guid.NewGuid(),
            Guid.NewGuid(),
            [" definition ", "note", "definition"],
            ["word", "meaningVn", "ipaPronunciation"],
            new Dictionary<string, int> { [" word "] = 240 });

        Assert.Equal(["definition", "note"], preference.HiddenColumns);
        Assert.Equal(["word", "meaningVn", "ipaPronunciation"], preference.ColumnOrder);
        Assert.Equal(240, preference.ColumnWidths["word"]);
    }

    [Fact]
    public void FluentAsrsScheduler_ResetsToLevelZeroOnWrongAndIncrementsLapsesAboveLevelZero()
    {
        var levelZero = FluentAsrsScheduler.ApplyWrong(0, 3);
        var levelThree = FluentAsrsScheduler.ApplyWrong(3, 3);

        Assert.Equal(0, levelZero.LevelAfter);
        Assert.Equal(3, levelZero.LapseCountAfter);
        Assert.Equal(0, levelThree.LevelAfter);
        Assert.Equal(4, levelThree.LapseCountAfter);
    }

    [Fact]
    public void WordReviewState_CreatesAndAppliesFluentAsrsState()
    {
        var nextReviewDate = DateTime.UtcNow.Date.AddDays(1);
        var state = WordReviewState.CreateLevelZero(Guid.NewGuid(), Guid.NewGuid(), nextReviewDate);

        Assert.Equal(WordReviewStatus.Active, state.Status);

        var reviewedAt = DateTime.UtcNow;
        state.ApplyResult(1, nextReviewDate.AddDays(1), 0, reviewedAt);

        Assert.Equal(1, state.Level);
        Assert.Equal(reviewedAt, state.LastReviewedAt);
    }

    [Fact]
    public void WordReviewState_ReactivatesInactiveWordsAtLevelZero()
    {
        var nextReviewDate = DateTime.UtcNow.Date.AddDays(1);
        var reactivatedDate = nextReviewDate.AddDays(3);
        var state = WordReviewState.CreateLevelZero(Guid.NewGuid(), Guid.NewGuid(), nextReviewDate);

        state.ApplyResult(4, nextReviewDate.AddDays(10), 2, DateTime.UtcNow);
        state.Deactivate();
        state.ReactivateLevelZero(reactivatedDate);

        Assert.Equal(WordReviewStatus.Active, state.Status);
        Assert.Equal(0, state.Level);
        Assert.Equal(reactivatedDate, state.NextReviewDate);
        Assert.Null(state.LastReviewedAt);
    }

    [Fact]
    public void TodoItem_ValidatesAndTracksLifecycle()
    {
        var yesterday = DateTime.UtcNow.Date.AddDays(-1);
        var item = TodoItem.Create(Guid.NewGuid(), " Review IELTS ", yesterday, " Unit 3 ");

        item.Rename("Review HSK");
        item.UpdateNote("tones");
        item.SetCompleted(true, DateTime.UtcNow);
        item.SetCompleted(false, DateTime.UtcNow);

        Assert.Equal("Review HSK", item.Title);
        Assert.Equal("tones", item.Note);
        Assert.False(item.IsCompleted);
    }
}
