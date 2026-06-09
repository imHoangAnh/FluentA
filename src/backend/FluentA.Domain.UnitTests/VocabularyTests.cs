using FluentA.Domain.BoundedContexts.Flashcards.Entities;
using FluentA.Domain.BoundedContexts.Vocabulary.Entities;

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
}
