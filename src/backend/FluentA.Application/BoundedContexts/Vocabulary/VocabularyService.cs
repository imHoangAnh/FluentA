using FluentA.Application.BoundedContexts.Flashcards;
using FluentA.Application.BoundedContexts.Vocabulary.DTOs;
using FluentA.Application.Common;
using FluentA.Domain.BoundedContexts.Flashcards.Entities;
using FluentA.Domain.BoundedContexts.Vocabulary.Entities;

namespace FluentA.Application.BoundedContexts.Vocabulary;

public sealed class VocabularyService : IVocabularyService
{
    private readonly IVocabularyRepository _repository;
    private readonly IFlashcardSyncNotifier _flashcardSyncNotifier;

    public VocabularyService(IVocabularyRepository repository, IFlashcardSyncNotifier? flashcardSyncNotifier = null)
    {
        _repository = repository;
        _flashcardSyncNotifier = flashcardSyncNotifier ?? NullFlashcardSyncNotifier.Instance;
    }

    public async Task<OperationResult<IReadOnlyList<BoardSummaryDto>>> ListBoardsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var boards = await _repository.ListBoardsAsync(userId, cancellationToken);
        return OperationResult<IReadOnlyList<BoardSummaryDto>>.Success(boards.Select(ToSummary).ToList());
    }

    public async Task<OperationResult<BoardDetailDto>> CreateBoardAsync(Guid userId, CreateBoardRequest request, CancellationToken cancellationToken = default)
    {
        var errors = ValidateBoard(request.Name, request.Language);
        if (errors.Count > 0)
        {
            return OperationResult<BoardDetailDto>.Failure(VocabularyError.Validation(errors));
        }

        var sortOrder = await _repository.NextBoardSortOrderAsync(userId, cancellationToken);
        var board = VocabBoard.Create(userId, request.Name, request.Language, sortOrder);
        var deck = FlashcardDeck.CreateAllWords(userId, board.Id, board.Name);
        await _repository.AddBoardWithDeckAsync(board, deck, cancellationToken);

        return OperationResult<BoardDetailDto>.Success(ToDetail(board));
    }

    public async Task<OperationResult<BoardDetailDto>> GetBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default)
    {
        var board = await _repository.GetBoardAsync(userId, boardId, cancellationToken);
        return board is null
            ? OperationResult<BoardDetailDto>.Failure(VocabularyError.NotFound())
            : OperationResult<BoardDetailDto>.Success(ToDetail(board));
    }

    public async Task<OperationResult<BoardDetailDto>> UpdateBoardAsync(Guid userId, Guid boardId, UpdateBoardRequest request, CancellationToken cancellationToken = default)
    {
        var errors = ValidateBoard(request.Name, request.Language);
        if (errors.Count > 0)
        {
            return OperationResult<BoardDetailDto>.Failure(VocabularyError.Validation(errors));
        }

        var board = await _repository.GetBoardAsync(userId, boardId, cancellationToken);
        if (board is null)
        {
            return OperationResult<BoardDetailDto>.Failure(VocabularyError.NotFound());
        }

        board.Update(request.Name, request.Language, request.SortOrder ?? board.SortOrder);
        await _repository.UpdateBoardAsync(board, cancellationToken);
        return OperationResult<BoardDetailDto>.Success(ToDetail(board));
    }

    public async Task<OperationResult<bool>> DeleteBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default)
    {
        var board = await _repository.GetBoardAsync(userId, boardId, cancellationToken);
        if (board is null)
        {
            return OperationResult<bool>.Failure(VocabularyError.NotFound());
        }

        await _repository.SoftDeleteBoardAsync(board, cancellationToken);
        return OperationResult<bool>.Success(true);
    }

    public async Task<OperationResult<IReadOnlyList<PageDto>>> ListPagesAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default)
    {
        var board = await _repository.GetBoardAsync(userId, boardId, cancellationToken);
        return board is null
            ? OperationResult<IReadOnlyList<PageDto>>.Failure(VocabularyError.NotFound())
            : OperationResult<IReadOnlyList<PageDto>>.Success(ToPages(board));
    }

    public async Task<OperationResult<PageDto>> CreatePageAsync(Guid userId, Guid boardId, CreatePageRequest request, CancellationToken cancellationToken = default)
    {
        var errors = ValidatePage(request.Name);
        if (errors.Count > 0)
        {
            return OperationResult<PageDto>.Failure(VocabularyError.Validation(errors));
        }

        var board = await _repository.GetBoardAsync(userId, boardId, cancellationToken);
        if (board is null)
        {
            return OperationResult<PageDto>.Failure(VocabularyError.NotFound());
        }

        var sortOrder = request.SortOrder ?? await _repository.NextPageSortOrderAsync(boardId, cancellationToken);
        var page = VocabPage.Create(board.Id, request.Name, sortOrder);
        var deck = FlashcardDeck.CreatePageDeck(userId, board.Id, page.Id, board.Name, page.Name);
        await _repository.AddPageWithDeckAsync(page, deck, cancellationToken);

        return OperationResult<PageDto>.Success(ToPage(page));
    }

    public async Task<OperationResult<PageDto>> UpdatePageAsync(Guid userId, Guid boardId, Guid pageId, UpdatePageRequest request, CancellationToken cancellationToken = default)
    {
        var errors = ValidatePage(request.Name);
        if (errors.Count > 0)
        {
            return OperationResult<PageDto>.Failure(VocabularyError.Validation(errors));
        }

        var page = await _repository.GetPageAsync(userId, boardId, pageId, cancellationToken);
        if (page is null)
        {
            return OperationResult<PageDto>.Failure(VocabularyError.NotFound());
        }

        page.Update(request.Name, request.SortOrder ?? page.SortOrder);
        await _repository.UpdatePageAsync(page, cancellationToken);
        return OperationResult<PageDto>.Success(ToPage(page));
    }

    public async Task<OperationResult<bool>> DeletePageAsync(Guid userId, Guid boardId, Guid pageId, CancellationToken cancellationToken = default)
    {
        var page = await _repository.GetPageAsync(userId, boardId, pageId, cancellationToken);
        if (page is null)
        {
            return OperationResult<bool>.Failure(VocabularyError.NotFound());
        }

        await _repository.SoftDeletePageAsync(page, cancellationToken);
        return OperationResult<bool>.Success(true);
    }

    public async Task<OperationResult<IReadOnlyList<WordDto>>> ListWordsAsync(Guid userId, Guid boardId, Guid pageId, CancellationToken cancellationToken = default)
    {
        var page = await _repository.GetPageAsync(userId, boardId, pageId, cancellationToken);
        if (page is null)
        {
            return OperationResult<IReadOnlyList<WordDto>>.Failure(VocabularyError.NotFound());
        }

        var words = await _repository.ListWordsAsync(userId, boardId, pageId, cancellationToken);
        return OperationResult<IReadOnlyList<WordDto>>.Success(words.Select(ToWord).ToList());
    }

    public async Task<OperationResult<WordDto>> CreateWordAsync(Guid userId, Guid boardId, Guid pageId, WordRequest request, CancellationToken cancellationToken = default)
    {
        var validation = ValidateWord(request);
        if (validation.Errors.Count > 0)
        {
            return OperationResult<WordDto>.Failure(VocabularyError.Validation(validation.Errors));
        }

        var page = await _repository.GetPageAsync(userId, boardId, pageId, cancellationToken);
        if (page is null)
        {
            return OperationResult<WordDto>.Failure(VocabularyError.NotFound());
        }

        var word = VocabWord.Create(
            page.Id,
            request.Word,
            request.MeaningVn,
            request.MeaningEn,
            validation.WordClass!.Value,
            request.Example,
            request.Thesaurus,
            request.Collocation,
            request.Note);
        await _repository.AddWordAsync(word, cancellationToken);
        await NotifyWordSavedAsync(userId, boardId, word, cancellationToken);
        return OperationResult<WordDto>.Success(ToWord(word));
    }

    public async Task<OperationResult<WordDto>> UpdateWordAsync(Guid userId, Guid boardId, Guid wordId, WordRequest request, CancellationToken cancellationToken = default)
    {
        var validation = ValidateWord(request);
        if (validation.Errors.Count > 0)
        {
            return OperationResult<WordDto>.Failure(VocabularyError.Validation(validation.Errors));
        }

        var word = await _repository.GetWordAsync(userId, boardId, wordId, cancellationToken);
        if (word is null)
        {
            return OperationResult<WordDto>.Failure(VocabularyError.NotFound());
        }

        word.Update(
            request.Word,
            request.MeaningVn,
            request.MeaningEn,
            validation.WordClass!.Value,
            request.Example,
            request.Thesaurus,
            request.Collocation,
            request.Note);
        await _repository.UpdateWordAsync(word, cancellationToken);
        await NotifyWordSavedAsync(userId, boardId, word, cancellationToken);
        return OperationResult<WordDto>.Success(ToWord(word));
    }

    public async Task<OperationResult<bool>> DeleteWordAsync(Guid userId, Guid boardId, Guid wordId, CancellationToken cancellationToken = default)
    {
        var word = await _repository.GetWordAsync(userId, boardId, wordId, cancellationToken);
        if (word is null)
        {
            return OperationResult<bool>.Failure(VocabularyError.NotFound());
        }

        await _repository.SoftDeleteWordAsync(word, cancellationToken);
        await NotifyDecksUpdatedAsync(userId, boardId, word.PageId, cancellationToken);
        return OperationResult<bool>.Success(true);
    }

    private async Task NotifyWordSavedAsync(Guid userId, Guid boardId, VocabWord word, CancellationToken cancellationToken)
    {
        await _flashcardSyncNotifier.WordSavedAsync(userId, word.Id, word.PageId, cancellationToken);
        await NotifyDecksUpdatedAsync(userId, boardId, word.PageId, cancellationToken);
    }

    private async Task NotifyDecksUpdatedAsync(Guid userId, Guid boardId, Guid pageId, CancellationToken cancellationToken)
    {
        var deckIds = await _repository.ListActiveDeckIdsAsync(boardId, pageId, cancellationToken);
        await _flashcardSyncNotifier.DecksUpdatedAsync(userId, boardId, deckIds, cancellationToken);
    }

    private static BoardSummaryDto ToSummary(VocabBoard board)
    {
        return new BoardSummaryDto(
            board.Id,
            board.Name,
            board.Language,
            board.SortOrder,
            board.Pages.Count(page => page.DeletedAt is null),
            board.CreatedAt,
            board.UpdatedAt);
    }

    private static BoardDetailDto ToDetail(VocabBoard board)
    {
        return new BoardDetailDto(
            board.Id,
            board.Name,
            board.Language,
            board.SortOrder,
            ToPages(board),
            board.CreatedAt,
            board.UpdatedAt);
    }

    private static IReadOnlyList<PageDto> ToPages(VocabBoard board)
    {
        return board.Pages
            .Where(page => page.DeletedAt is null)
            .OrderBy(page => page.SortOrder)
            .ThenBy(page => page.CreatedAt)
            .Select(ToPage)
            .ToList();
    }

    private static PageDto ToPage(VocabPage page)
    {
        return new PageDto(page.Id, page.BoardId, page.Name, page.SortOrder, page.CreatedAt, page.UpdatedAt);
    }

    private static WordDto ToWord(VocabWord word)
    {
        return new WordDto(
            word.Id,
            word.PageId,
            word.Word,
            word.MeaningVn,
            word.MeaningEn,
            word.Class.ToString().ToLowerInvariant(),
            word.Example,
            word.Thesaurus,
            word.Collocation,
            word.Note,
            word.CreatedAt,
            word.UpdatedAt);
    }

    private static Dictionary<string, string[]> ValidateBoard(string? name, string? language)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(name) || name.Trim().Length > 120)
        {
            errors["name"] = ["Board name must be between 1 and 120 characters."];
        }

        var cleanLanguage = language?.Trim() ?? string.Empty;
        if (cleanLanguage.Length is < 2 or > 8)
        {
            errors["language"] = ["Language must be a 2-8 character code."];
        }

        return errors;
    }

    private static Dictionary<string, string[]> ValidatePage(string? name)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(name) || name.Trim().Length > 120)
        {
            errors["name"] = ["Page name must be between 1 and 120 characters."];
        }

        return errors;
    }

    private static (Dictionary<string, string[]> Errors, WordClass? WordClass) ValidateWord(WordRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        ValidateRequired(errors, "word", request.Word, 240);
        ValidateRequired(errors, "meaningVn", request.MeaningVn, 1000);
        ValidateRequired(errors, "meaningEn", request.MeaningEn, 2000);
        ValidateRequired(errors, "example", request.Example, 2000);
        ValidateOptional(errors, "thesaurus", request.Thesaurus, 2000);
        ValidateOptional(errors, "collocation", request.Collocation, 2000);
        ValidateOptional(errors, "note", request.Note, 4000);

        WordClass? wordClass = null;
        if (Enum.TryParse<WordClass>(request.Class, true, out var parsedClass) && Enum.IsDefined(parsedClass))
        {
            wordClass = parsedClass;
        }
        else
        {
            errors["class"] = ["Class must be noun, verb, adj, adv, phrase, or other."];
        }

        return (errors, wordClass);
    }

    private static void ValidateRequired(Dictionary<string, string[]> errors, string field, string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Trim().Length > maxLength)
        {
            errors[field] = [$"{field} must be between 1 and {maxLength} characters."];
        }
    }

    private static void ValidateOptional(Dictionary<string, string[]> errors, string field, string? value, int maxLength)
    {
        if (!string.IsNullOrWhiteSpace(value) && value.Trim().Length > maxLength)
        {
            errors[field] = [$"{field} must be at most {maxLength} characters."];
        }
    }
}
