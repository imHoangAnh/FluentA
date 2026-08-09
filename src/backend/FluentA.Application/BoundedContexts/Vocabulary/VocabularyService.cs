using FluentA.Application.BoundedContexts.Flashcards;
using FluentA.Application.BoundedContexts.Review;
using FluentA.Application.BoundedContexts.Vocabulary.DTOs;
using FluentA.Application.BoundedContexts.Trash;
using FluentA.Application.Common;
using FluentA.Domain.BoundedContexts.Vocabulary.Entities;

namespace FluentA.Application.BoundedContexts.Vocabulary;

public sealed class VocabularyService : IVocabularyService
{
    private static readonly string[] FixedColumnOrder =
    [
        "word",
        "meaningVn",
        "ipaPronunciation",
        "definition",
        "class",
        "example",
        "note",
        "synonyms",
        "antonyms"
    ];

    private static readonly HashSet<string> HideableColumns =
    [
        "definition",
        "note",
        "synonyms",
        "antonyms"
    ];

    private readonly IVocabularyRepository _repository;
    private readonly IFlashcardSyncNotifier _flashcardSyncNotifier;
    private readonly IVocabularyReviewCleanupPort _reviewCleanup;
    private readonly ITrashService? _trashService;

    public VocabularyService(
        IVocabularyRepository repository,
        IFlashcardSyncNotifier? flashcardSyncNotifier = null,
        IVocabularyReviewCleanupPort? reviewCleanup = null,
        ITrashService? trashService = null)
    {
        _repository = repository;
        _flashcardSyncNotifier = flashcardSyncNotifier ?? NullFlashcardSyncNotifier.Instance;
        _reviewCleanup = reviewCleanup ?? NullVocabularyReviewCleanupPort.Instance;
        _trashService = trashService;
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

        var board = VocabBoard.Create(userId, request.Name, request.Language);
        await _repository.AddBoardAsync(board, cancellationToken);
        return OperationResult<BoardDetailDto>.Success(ToDetail(board, null));
    }

    public async Task<OperationResult<BoardDetailDto>> GetBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default)
    {
        var board = await _repository.GetBoardAsync(userId, boardId, cancellationToken);
        if (board is null)
        {
            return OperationResult<BoardDetailDto>.Failure(VocabularyError.NotFound());
        }

        var preferences = await _repository.GetBoardPreferenceAsync(userId, boardId, cancellationToken);
        return OperationResult<BoardDetailDto>.Success(ToDetail(board, preferences));
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

        board.Update(request.Name, request.Language);
        await _repository.UpdateBoardAsync(board, cancellationToken);
        var preferences = await _repository.GetBoardPreferenceAsync(userId, boardId, cancellationToken);
        return OperationResult<BoardDetailDto>.Success(ToDetail(board, preferences));
    }

    public async Task<OperationResult<TrashEntryDto>> DeleteBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default)
    {
        if (_trashService is not null) return await _trashService.TrashVocabularyAsync(userId, boardId, cancellationToken);
        var board = await _repository.GetBoardAsync(userId, boardId, cancellationToken);
        if (board is null)
        {
            return OperationResult<TrashEntryDto>.Failure(VocabularyError.NotFound());
        }

        var activePages = board.Pages.Where(page => page.DeletedAt is null).ToList();
        var words = new List<VocabWord>();
        foreach (var page in activePages)
        {
            var pageWords = await _repository.ListWordsAsync(userId, boardId, page.Id, cancellationToken);
            words.AddRange(pageWords);
        }

        await _repository.SoftDeleteBoardAsync(board, DateTime.UtcNow, cancellationToken);
        var wordIds = words.Select(word => word.Id).ToList();
        await _reviewCleanup.RemoveWordProgressAsync(wordIds, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);
        return OperationResult<TrashEntryDto>.Success(new TrashEntryDto(Guid.Empty, "Vocabulary", board.Id, board.Name, "Vocabulary", DateTime.UtcNow, DateTime.UtcNow.AddDays(30)));
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

        var page = VocabPage.Create(board.Id, request.Name);
        await _repository.AddPageAsync(page, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);
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

        page.Update(request.Name);
        await _repository.UpdatePageAsync(page, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);
        return OperationResult<PageDto>.Success(ToPage(page));
    }

    public async Task<OperationResult<TrashEntryDto>> DeletePageAsync(Guid userId, Guid boardId, Guid pageId, CancellationToken cancellationToken = default)
    {
        if (_trashService is not null) return await _trashService.TrashVocabularyAsync(userId, pageId, cancellationToken);
        var page = await _repository.GetPageAsync(userId, boardId, pageId, cancellationToken);
        if (page is null)
        {
            return OperationResult<TrashEntryDto>.Failure(VocabularyError.NotFound());
        }

        var words = await _repository.ListWordsAsync(userId, boardId, pageId, cancellationToken);
        await _repository.SoftDeletePageAsync(page, DateTime.UtcNow, cancellationToken);
        var wordIds = words.Select(word => word.Id).ToList();
        await _reviewCleanup.RemoveWordProgressAsync(wordIds, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);
        return OperationResult<TrashEntryDto>.Success(new TrashEntryDto(Guid.Empty, "Vocabulary", page.Id, page.Name, "Vocabulary", DateTime.UtcNow, DateTime.UtcNow.AddDays(30)));
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
            request.IpaPronunciation,
            validation.WordClass!.Value,
            request.Definition,
            request.Example,
            request.Note,
            request.Synonyms,
            request.Antonyms);
        await _repository.AddWordAsync(word, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);
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
            request.IpaPronunciation,
            validation.WordClass!.Value,
            request.Definition,
            request.Example,
            request.Note,
            request.Synonyms,
            request.Antonyms);
        await _repository.UpdateWordAsync(word, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);
        await NotifyWordSavedAsync(userId, boardId, word, cancellationToken);
        return OperationResult<WordDto>.Success(ToWord(word));
    }

    public async Task<OperationResult<WordDto>> UpdateWordCellAsync(Guid userId, Guid boardId, Guid wordId, UpdateWordCellRequest request, CancellationToken cancellationToken = default)
    {
        var word = await _repository.GetWordAsync(userId, boardId, wordId, cancellationToken);
        if (word is null)
        {
            return OperationResult<WordDto>.Failure(VocabularyError.NotFound());
        }

        var updated = ApplyFixedCell(word, request.ColumnKey.Trim(), request.Value);
        if (updated is not null)
        {
            return CellValidation("value", updated);
        }

        await _repository.UpdateFixedCellAsync(word, request.ColumnKey, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);
        await NotifyWordSavedAsync(userId, boardId, word, cancellationToken);
        return OperationResult<WordDto>.Success(ToWord(word));
    }

    public async Task<OperationResult<TrashEntryDto>> DeleteWordAsync(Guid userId, Guid boardId, Guid wordId, CancellationToken cancellationToken = default)
    {
        if (_trashService is not null) return await _trashService.TrashVocabularyAsync(userId, wordId, cancellationToken);
        var word = await _repository.GetWordAsync(userId, boardId, wordId, cancellationToken);
        if (word is null)
        {
            return OperationResult<TrashEntryDto>.Failure(VocabularyError.NotFound());
        }

        await _repository.SoftDeleteWordAsync(word, DateTime.UtcNow, cancellationToken);
        await _reviewCleanup.RemoveWordProgressAsync([word.Id], cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);
        await NotifyDecksUpdatedAsync(userId, boardId, word.PageId, cancellationToken);
        return OperationResult<TrashEntryDto>.Success(new TrashEntryDto(Guid.Empty, "Vocabulary", word.Id, word.Word, "Vocabulary", DateTime.UtcNow, DateTime.UtcNow.AddDays(30)));
    }

    public async Task<OperationResult<BoardPreferencesDto>> UpdateBoardPreferencesAsync(Guid userId, Guid boardId, UpdateBoardPreferencesRequest request, CancellationToken cancellationToken = default)
    {
        var board = await _repository.GetBoardAsync(userId, boardId, cancellationToken);
        if (board is null)
        {
            return OperationResult<BoardPreferencesDto>.Failure(VocabularyError.NotFound());
        }

        var errors = ValidatePreferences(request);
        if (errors.Count > 0)
        {
            return OperationResult<BoardPreferencesDto>.Failure(VocabularyError.Validation(errors));
        }

        var preference = await _repository.GetBoardPreferenceAsync(userId, boardId, cancellationToken);
        if (preference is null)
        {
            preference = VocabBoardPreference.Create(userId, boardId, request.HiddenColumns, request.ColumnOrder, request.ColumnWidths);
            await _repository.AddBoardPreferenceAsync(preference, cancellationToken);
        }
        else
        {
            preference.Update(request.HiddenColumns, request.ColumnOrder, request.ColumnWidths);
            await _repository.UpdateBoardPreferenceAsync(preference, cancellationToken);
        }

        await _repository.SaveChangesAsync(cancellationToken);
        return OperationResult<BoardPreferencesDto>.Success(ToPreferences(preference));
    }

    private async Task NotifyWordSavedAsync(Guid userId, Guid boardId, VocabWord word, CancellationToken cancellationToken)
    {
        await _flashcardSyncNotifier.WordSavedAsync(userId, word.Id, word.PageId, cancellationToken);
        await NotifyDecksUpdatedAsync(userId, boardId, word.PageId, cancellationToken);
    }

    private async Task NotifyDecksUpdatedAsync(Guid userId, Guid boardId, Guid pageId, CancellationToken cancellationToken)
    {
        await _flashcardSyncNotifier.DecksUpdatedAsync(userId, boardId, [pageId], cancellationToken);
    }

    private static BoardSummaryDto ToSummary(VocabBoard board)
    {
        return new BoardSummaryDto(
            board.Id,
            board.Name,
            board.Language,
            board.Pages.Count(page => page.DeletedAt is null),
            board.CreatedAt,
            board.UpdatedAt);
    }

    private static BoardDetailDto ToDetail(VocabBoard board, VocabBoardPreference? preferences)
    {
        return new BoardDetailDto(
            board.Id,
            board.Name,
            board.Language,
            ToPages(board),
            ToPreferences(preferences),
            board.CreatedAt,
            board.UpdatedAt);
    }

    private static IReadOnlyList<PageDto> ToPages(VocabBoard board)
    {
        return board.Pages
            .Where(page => page.DeletedAt is null)
            .OrderByDescending(page => page.CreatedAt)
            .ThenByDescending(page => page.Id)
            .Select(ToPage)
            .ToList();
    }

    private static PageDto ToPage(VocabPage page)
    {
        return new PageDto(page.Id, page.BoardId, page.Name, page.CreatedAt, page.UpdatedAt);
    }

    private static WordDto ToWord(VocabWord word)
    {
        return new WordDto(
            word.Id,
            word.PageId,
            word.Word,
            word.MeaningVn,
            word.IpaPronunciation,
            word.Class.ToString().ToLowerInvariant(),
            word.Definition,
            word.Example,
            word.Note,
            word.Synonyms,
            word.Antonyms,
            word.CreatedAt,
            word.UpdatedAt);
    }

    private static BoardPreferencesDto ToPreferences(VocabBoardPreference? preference)
    {
        if (preference is null)
        {
            return new BoardPreferencesDto(null, [], FixedColumnOrder, new Dictionary<string, int>(), null, null);
        }

        return new BoardPreferencesDto(
            preference.Id,
            preference.HiddenColumns,
            preference.ColumnOrder.Count == 0 ? FixedColumnOrder : preference.ColumnOrder,
            preference.ColumnWidths,
            preference.CreatedAt,
            preference.UpdatedAt);
    }

    private static string? ApplyFixedCell(VocabWord word, string key, string? value)
    {
        var request = key.ToLowerInvariant() switch
        {
            "word" => ToRequest(word) with { Word = value ?? string.Empty },
            "meaningvn" => ToRequest(word) with { MeaningVn = value ?? string.Empty },
            "ipapronunciation" => ToRequest(word) with { IpaPronunciation = value ?? string.Empty },
            "definition" => ToRequest(word) with { Definition = value },
            "class" => ToRequest(word) with { Class = value ?? string.Empty },
            "example" => ToRequest(word) with { Example = value ?? string.Empty },
            "note" => ToRequest(word) with { Note = value },
            "synonyms" => ToRequest(word) with { Synonyms = value },
            "antonyms" => ToRequest(word) with { Antonyms = value },
            _ => null
        };
        if (request is null)
        {
            return "Column key is invalid.";
        }

        var validation = ValidateWord(request);
        if (validation.Errors.Count > 0)
        {
            return validation.Errors.Values.First()[0];
        }

        word.Update(
            request.Word,
            request.MeaningVn,
            request.IpaPronunciation,
            validation.WordClass!.Value,
            request.Definition,
            request.Example,
            request.Note,
            request.Synonyms,
            request.Antonyms);
        return null;
    }

    private static WordRequest ToRequest(VocabWord word)
    {
        return new WordRequest(
            word.Word,
            word.MeaningVn,
            word.IpaPronunciation,
            word.Class.ToString().ToLowerInvariant(),
            word.Definition,
            word.Example,
            word.Note,
            word.Synonyms,
            word.Antonyms);
    }

    private static OperationResult<WordDto> CellValidation(string field, string message)
    {
        return OperationResult<WordDto>.Failure(VocabularyError.Validation(new Dictionary<string, string[]> { [field] = [message] }));
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
        ValidateRequired(errors, "ipaPronunciation", request.IpaPronunciation, 2000);
        ValidateOptional(errors, "definition", request.Definition, 4000);
        ValidateRequired(errors, "example", request.Example, 2000);
        ValidateOptional(errors, "note", request.Note, 4000);
        ValidateOptional(errors, "synonyms", request.Synonyms, 2000);
        ValidateOptional(errors, "antonyms", request.Antonyms, 2000);

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

    private static Dictionary<string, string[]> ValidatePreferences(UpdateBoardPreferencesRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        var hiddenColumns = request.HiddenColumns
            .Select(key => key.Trim())
            .Where(key => key.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        if (hiddenColumns.Any(key => !HideableColumns.Contains(key)))
        {
            errors["hiddenColumns"] = ["Only nullable fixed columns may be hidden."];
        }

        var columnOrder = request.ColumnOrder
            .Select(key => key.Trim())
            .Where(key => key.Length > 0)
            .ToList();
        if (columnOrder.Count != FixedColumnOrder.Length
            || columnOrder.Distinct(StringComparer.OrdinalIgnoreCase).Count() != FixedColumnOrder.Length
            || FixedColumnOrder.Except(columnOrder, StringComparer.OrdinalIgnoreCase).Any()
            || columnOrder.Except(FixedColumnOrder, StringComparer.OrdinalIgnoreCase).Any())
        {
            errors["columnOrder"] = ["Column order must include each fixed column exactly once."];
        }

        if (request.ColumnWidths.Any(pair =>
                !FixedColumnOrder.Contains(pair.Key, StringComparer.OrdinalIgnoreCase)
                || pair.Value < 80
                || pair.Value > 1200))
        {
            errors["columnWidths"] = ["Column widths must target fixed columns only and stay between 80 and 1200 pixels."];
        }

        return errors;
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
