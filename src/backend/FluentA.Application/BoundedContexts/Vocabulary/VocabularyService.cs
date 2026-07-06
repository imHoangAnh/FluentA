using FluentA.Application.BoundedContexts.Flashcards;
using FluentA.Application.BoundedContexts.Review;
using FluentA.Application.BoundedContexts.Vocabulary.DTOs;
using FluentA.Application.Common;
using FluentA.Domain.BoundedContexts.Vocabulary.Entities;

namespace FluentA.Application.BoundedContexts.Vocabulary;

public sealed class VocabularyService : IVocabularyService
{
    private readonly IVocabularyRepository _repository;
    private readonly IFlashcardSyncNotifier _flashcardSyncNotifier;
    private readonly IFlashcardVocabularySyncPort _flashcardSync;
    private readonly IVocabularyReviewCleanupPort _reviewCleanup;

    public VocabularyService(
        IVocabularyRepository repository,
        IFlashcardSyncNotifier? flashcardSyncNotifier = null,
        IFlashcardVocabularySyncPort? flashcardSync = null,
        IVocabularyReviewCleanupPort? reviewCleanup = null)
    {
        _repository = repository;
        _flashcardSyncNotifier = flashcardSyncNotifier ?? NullFlashcardSyncNotifier.Instance;
        _flashcardSync = flashcardSync ?? NullFlashcardVocabularySyncPort.Instance;
        _reviewCleanup = reviewCleanup ?? NullVocabularyReviewCleanupPort.Instance;
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

        board.Update(request.Name, request.Language, board.SortOrder);
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

        var activePages = board.Pages.Where(page => page.DeletedAt is null).ToList();
        var words = new List<VocabWord>();
        foreach (var page in activePages)
        {
            var pageWords = await _repository.ListWordsAsync(userId, boardId, page.Id, cancellationToken);
            words.AddRange(pageWords);
        }

        await _repository.SoftDeleteBoardAsync(board, cancellationToken);
        var wordIds = words.Select(word => word.Id).ToList();
        await _flashcardSync.RemoveCardsForWordsAsync(wordIds, cancellationToken);
        await _reviewCleanup.RemoveWordProgressAsync(wordIds, cancellationToken);
        await _flashcardSync.SoftDeleteDecksForBoardAsync(board.Id, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);
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

        var page = VocabPage.Create(board.Id, request.Name, board.Pages.Count(page => page.DeletedAt is null));
        await _repository.AddPageAsync(page, cancellationToken);
        await _flashcardSync.CreatePageDeckAsync(userId, board.Id, page.Id, board.Name, page.Name, cancellationToken);
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

        page.Update(request.Name, page.SortOrder);
        await _repository.UpdatePageAsync(page, cancellationToken);
        var board = await _repository.GetBoardAsync(userId, boardId, cancellationToken);
        if (board is null)
        {
            return OperationResult<PageDto>.Failure(VocabularyError.NotFound());
        }

        await _flashcardSync.RenamePageDeckAsync(page.Id, board.Name, page.Name, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);
        return OperationResult<PageDto>.Success(ToPage(page));
    }

    public async Task<OperationResult<bool>> DeletePageAsync(Guid userId, Guid boardId, Guid pageId, CancellationToken cancellationToken = default)
    {
        var page = await _repository.GetPageAsync(userId, boardId, pageId, cancellationToken);
        if (page is null)
        {
            return OperationResult<bool>.Failure(VocabularyError.NotFound());
        }

        var words = await _repository.ListWordsAsync(userId, boardId, pageId, cancellationToken);
        await _repository.SoftDeletePageAsync(page, cancellationToken);
        var wordIds = words.Select(word => word.Id).ToList();
        await _flashcardSync.RemoveCardsForWordsAsync(wordIds, cancellationToken);
        await _reviewCleanup.RemoveWordProgressAsync(wordIds, cancellationToken);
        await _flashcardSync.SoftDeleteDeckForPageAsync(page.Id, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);
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
        var values = await _repository.ListCustomValuesAsync(words.Select(word => word.Id), cancellationToken);
        return OperationResult<IReadOnlyList<WordDto>>.Success(words.Select(word => ToWord(word, values)).ToList());
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
        var customValues = await BuildCustomValuesAsync(userId, boardId, word.Id, request.CustomValues, cancellationToken);
        if (customValues.Errors.Count > 0)
        {
            return OperationResult<WordDto>.Failure(VocabularyError.Validation(customValues.Errors));
        }

        await _repository.AddWordAsync(word, customValues.Values, cancellationToken);
        await _flashcardSync.UpsertCardsForWordAsync(word, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);
        word.ClearDomainEvents();
        await NotifyWordSavedAsync(userId, boardId, word, cancellationToken);
        return OperationResult<WordDto>.Success(ToWord(word, customValues.Values));
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
        var customValues = await BuildCustomValuesAsync(userId, boardId, word.Id, request.CustomValues, cancellationToken);
        if (customValues.Errors.Count > 0)
        {
            return OperationResult<WordDto>.Failure(VocabularyError.Validation(customValues.Errors));
        }

        var valuesToPersist = request.CustomValues is null ? null : customValues.Values;
        await _repository.UpdateWordAsync(word, valuesToPersist, cancellationToken);
        await _flashcardSync.UpsertCardsForWordAsync(word, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);
        word.ClearDomainEvents();
        await NotifyWordSavedAsync(userId, boardId, word, cancellationToken);
        var responseValues = valuesToPersist ?? await _repository.ListCustomValuesAsync([word.Id], cancellationToken);
        return OperationResult<WordDto>.Success(ToWord(word, responseValues));
    }

    public async Task<OperationResult<WordDto>> UpdateWordCellAsync(Guid userId, Guid boardId, Guid wordId, UpdateWordCellRequest request, CancellationToken cancellationToken = default)
    {
        var word = await _repository.GetWordAsync(userId, boardId, wordId, cancellationToken);
        if (word is null)
        {
            return OperationResult<WordDto>.Failure(VocabularyError.NotFound());
        }

        var key = request.ColumnKey.Trim();
        if (key.StartsWith("custom:", StringComparison.OrdinalIgnoreCase))
        {
            if (!Guid.TryParse(key["custom:".Length..], out var columnId))
            {
                return CellValidation("columnKey", "Custom column key is invalid.");
            }

            var column = (await _repository.ListCustomColumnsAsync(userId, boardId, cancellationToken))
                .SingleOrDefault(item => item.Id == columnId);
            if (column is null)
            {
                return OperationResult<WordDto>.Failure(VocabularyError.NotFound());
            }

            var valueResult = BuildCustomValue(word.Id, column, request.Value);
            if (valueResult.Error is not null)
            {
                return CellValidation("value", valueResult.Error);
            }

            await _repository.UpdateCustomValueAsync(word.Id, column.Id, valueResult.Value, cancellationToken);
            var values = await _repository.ListCustomValuesAsync([word.Id], cancellationToken);
            return OperationResult<WordDto>.Success(ToWord(word, values));
        }

        var updated = ApplyFixedCell(word, key, request.Value);
        if (updated is not null)
        {
            return CellValidation("value", updated);
        }

        await _repository.UpdateFixedCellAsync(word, key, cancellationToken);
        await _flashcardSync.UpsertCardsForWordAsync(word, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);
        word.ClearDomainEvents();
        await NotifyWordSavedAsync(userId, boardId, word, cancellationToken);
        var customValues = await _repository.ListCustomValuesAsync([word.Id], cancellationToken);
        return OperationResult<WordDto>.Success(ToWord(word, customValues));
    }

    public async Task<OperationResult<bool>> DeleteWordAsync(Guid userId, Guid boardId, Guid wordId, CancellationToken cancellationToken = default)
    {
        var word = await _repository.GetWordAsync(userId, boardId, wordId, cancellationToken);
        if (word is null)
        {
            return OperationResult<bool>.Failure(VocabularyError.NotFound());
        }

        await _repository.SoftDeleteWordAsync(word, cancellationToken);
        await _flashcardSync.RemoveCardsForWordsAsync([word.Id], cancellationToken);
        await _reviewCleanup.RemoveWordProgressAsync([word.Id], cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);
        word.ClearDomainEvents();
        await NotifyDecksUpdatedAsync(userId, boardId, word.PageId, cancellationToken);
        return OperationResult<bool>.Success(true);
    }

    public async Task<OperationResult<ColumnConfigurationDto>> GetColumnConfigurationAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default)
    {
        var board = await _repository.GetBoardAsync(userId, boardId, cancellationToken);
        if (board is null)
        {
            return OperationResult<ColumnConfigurationDto>.Failure(VocabularyError.NotFound());
        }

        var columns = await _repository.ListCustomColumnsAsync(userId, boardId, cancellationToken);
        var preferences = await _repository.ListColumnVisibilityAsync(userId, boardId, cancellationToken);
        return OperationResult<ColumnConfigurationDto>.Success(ToColumnConfiguration(columns, preferences));
    }

    public async Task<OperationResult<CustomColumnDto>> CreateCustomColumnAsync(Guid userId, Guid boardId, CreateCustomColumnRequest request, CancellationToken cancellationToken = default)
    {
        var board = await _repository.GetBoardAsync(userId, boardId, cancellationToken);
        if (board is null)
        {
            return OperationResult<CustomColumnDto>.Failure(VocabularyError.NotFound());
        }

        if (!Enum.TryParse<CustomColumnType>(request.Type, true, out var type) || !Enum.IsDefined(type))
        {
            return OperationResult<CustomColumnDto>.Failure(VocabularyError.Validation(new Dictionary<string, string[]>
            {
                ["type"] = ["Type must be text or number."]
            }));
        }

        var columns = await _repository.ListCustomColumnsAsync(userId, boardId, cancellationToken);
        if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Trim().Length > 120
            || columns.Any(column => string.Equals(column.Name, request.Name.Trim(), StringComparison.OrdinalIgnoreCase)))
        {
            return OperationResult<CustomColumnDto>.Failure(VocabularyError.Validation(new Dictionary<string, string[]>
            {
                ["name"] = ["Column name must be unique and between 1 and 120 characters."]
            }));
        }

        var column = VocabCustomColumn.Create(boardId, request.Name, type, columns.Count);
        await _repository.AddCustomColumnAsync(column, cancellationToken);
        return OperationResult<CustomColumnDto>.Success(ToCustomColumn(column));
    }

    public async Task<OperationResult<bool>> DeleteCustomColumnAsync(Guid userId, Guid boardId, Guid columnId, CancellationToken cancellationToken = default)
    {
        return await _repository.DeleteCustomColumnAsync(userId, boardId, columnId, cancellationToken)
            ? OperationResult<bool>.Success(true)
            : OperationResult<bool>.Failure(VocabularyError.NotFound());
    }

    public async Task<OperationResult<ColumnConfigurationDto>> UpdateColumnVisibilityAsync(Guid userId, Guid boardId, UpdateColumnVisibilityRequest request, CancellationToken cancellationToken = default)
    {
        var board = await _repository.GetBoardAsync(userId, boardId, cancellationToken);
        if (board is null)
        {
            return OperationResult<ColumnConfigurationDto>.Failure(VocabularyError.NotFound());
        }

        var columns = await _repository.ListCustomColumnsAsync(userId, boardId, cancellationToken);
        var allowedKeys = columns.Select(column => $"custom:{column.Id}".ToLowerInvariant())
            .Concat(["thesaurus", "collocation", "note"])
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        var hiddenKeys = request.HiddenColumnKeys.Select(key => key.Trim().ToLowerInvariant()).Distinct().ToList();
        if (hiddenKeys.Any(key => !allowedKeys.Contains(key)))
        {
            return OperationResult<ColumnConfigurationDto>.Failure(VocabularyError.Validation(new Dictionary<string, string[]>
            {
                ["hiddenColumnKeys"] = ["One or more column keys are invalid."]
            }));
        }

        var preferences = hiddenKeys.Select(key => VocabColumnVisibility.Create(userId, boardId, key)).ToList();
        await _repository.ReplaceColumnVisibilityAsync(userId, boardId, preferences, cancellationToken);
        return OperationResult<ColumnConfigurationDto>.Success(ToColumnConfiguration(columns, preferences));
    }

    private async Task NotifyWordSavedAsync(Guid userId, Guid boardId, VocabWord word, CancellationToken cancellationToken)
    {
        await _flashcardSyncNotifier.WordSavedAsync(userId, word.Id, word.PageId, cancellationToken);
        await NotifyDecksUpdatedAsync(userId, boardId, word.PageId, cancellationToken);
    }

    private async Task NotifyDecksUpdatedAsync(Guid userId, Guid boardId, Guid pageId, CancellationToken cancellationToken)
    {
        var deckIds = await _flashcardSync.ListActiveDeckIdsAsync(boardId, pageId, cancellationToken);
        await _flashcardSyncNotifier.DecksUpdatedAsync(userId, boardId, deckIds, cancellationToken);
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

    private static BoardDetailDto ToDetail(VocabBoard board)
    {
        return new BoardDetailDto(
            board.Id,
            board.Name,
            board.Language,
            ToPages(board),
            board.CreatedAt,
            board.UpdatedAt);
    }

    private static IReadOnlyList<PageDto> ToPages(VocabBoard board)
    {
        return board.Pages
            .Where(page => page.DeletedAt is null)
            .OrderBy(page => page.CreatedAt)
            .Select(ToPage)
            .ToList();
    }

    private static PageDto ToPage(VocabPage page)
    {
        return new PageDto(page.Id, page.BoardId, page.Name, page.CreatedAt, page.UpdatedAt);
    }

    private static WordDto ToWord(VocabWord word, IEnumerable<VocabCustomValue> values)
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
            values.Where(value => value.WordId == word.Id)
                .Select(value => new CustomValueDto(value.ColumnId, value.TextValue ?? value.NumberValue?.ToString("G29", System.Globalization.CultureInfo.InvariantCulture)))
                .ToList(),
            word.CreatedAt,
            word.UpdatedAt);
    }

    private static CustomColumnDto ToCustomColumn(VocabCustomColumn column) =>
        new(column.Id, column.Name, column.Type.ToString().ToLowerInvariant(), column.CreatedAt);

    private static ColumnConfigurationDto ToColumnConfiguration(
        IEnumerable<VocabCustomColumn> columns,
        IEnumerable<VocabColumnVisibility> preferences) =>
        new(columns.Select(ToCustomColumn).ToList(), preferences.Select(preference => preference.ColumnKey).ToList());

    private async Task<(Dictionary<string, string[]> Errors, IReadOnlyList<VocabCustomValue> Values)> BuildCustomValuesAsync(
        Guid userId,
        Guid boardId,
        Guid wordId,
        IReadOnlyList<CustomValueRequest>? requests,
        CancellationToken cancellationToken)
    {
        var errors = new Dictionary<string, string[]>();
        if (requests is null)
        {
            return (errors, []);
        }

        if (requests.GroupBy(value => value.ColumnId).Any(group => group.Count() > 1))
        {
            errors["customValues"] = ["A custom column may appear only once."];
            return (errors, []);
        }

        var columns = (await _repository.ListCustomColumnsAsync(userId, boardId, cancellationToken)).ToDictionary(column => column.Id);
        var values = new List<VocabCustomValue>();
        foreach (var request in requests.Where(request => !string.IsNullOrWhiteSpace(request.Value)))
        {
            if (!columns.TryGetValue(request.ColumnId, out var column))
            {
                errors["customValues"] = ["One or more custom columns could not be found."];
                break;
            }

            if (column.Type == CustomColumnType.Text)
            {
                if (request.Value!.Trim().Length > 4000)
                {
                    errors["customValues"] = ["Custom text values must be at most 4000 characters."];
                    break;
                }
                values.Add(VocabCustomValue.CreateText(wordId, column.Id, request.Value));
            }
            else if (decimal.TryParse(request.Value, System.Globalization.NumberStyles.Number, System.Globalization.CultureInfo.InvariantCulture, out var number)
                && decimal.Abs(number) < 100_000_000_000_000m
                && decimal.Round(number, 4) == number)
            {
                values.Add(VocabCustomValue.CreateNumber(wordId, column.Id, number));
            }
            else
            {
                errors["customValues"] = [$"{column.Name} must be a number with at most 14 whole digits and 4 decimal places."];
                break;
            }
        }

        return (errors, values);
    }

    private static (VocabCustomValue? Value, string? Error) BuildCustomValue(Guid wordId, VocabCustomColumn column, string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return (null, null);
        }

        if (column.Type == CustomColumnType.Text)
        {
            return value.Trim().Length <= 4000
                ? (VocabCustomValue.CreateText(wordId, column.Id, value), null)
                : (null, "Custom text values must be at most 4000 characters.");
        }

        return decimal.TryParse(value, System.Globalization.NumberStyles.Number, System.Globalization.CultureInfo.InvariantCulture, out var number)
            && decimal.Abs(number) < 100_000_000_000_000m
            && decimal.Round(number, 4) == number
            ? (VocabCustomValue.CreateNumber(wordId, column.Id, number), null)
            : (null, $"{column.Name} must be a number with at most 14 whole digits and 4 decimal places.");
    }

    private static string? ApplyFixedCell(VocabWord word, string key, string? value)
    {
        var request = key.ToLowerInvariant() switch
        {
            "word" => ToRequest(word) with { Word = value ?? string.Empty },
            "meaningvn" => ToRequest(word) with { MeaningVn = value ?? string.Empty },
            "meaningen" => ToRequest(word) with { MeaningEn = value ?? string.Empty },
            "class" => ToRequest(word) with { Class = value ?? string.Empty },
            "example" => ToRequest(word) with { Example = value ?? string.Empty },
            "thesaurus" => ToRequest(word) with { Thesaurus = value },
            "collocation" => ToRequest(word) with { Collocation = value },
            "note" => ToRequest(word) with { Note = value },
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

        word.Update(request.Word, request.MeaningVn, request.MeaningEn, validation.WordClass!.Value, request.Example, request.Thesaurus, request.Collocation, request.Note);
        return null;
    }

    private static WordRequest ToRequest(VocabWord word) =>
        new(word.Word, word.MeaningVn, word.MeaningEn, word.Class.ToString().ToLowerInvariant(), word.Example, word.Thesaurus, word.Collocation, word.Note);

    private static OperationResult<WordDto> CellValidation(string field, string message) =>
        OperationResult<WordDto>.Failure(VocabularyError.Validation(new Dictionary<string, string[]> { [field] = [message] }));

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
