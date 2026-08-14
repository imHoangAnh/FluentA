using FluentA.Application.BoundedContexts.Flashcards;
using FluentA.Application.BoundedContexts.Review;
using FluentA.Application.BoundedContexts.Vocabulary.DTOs;
using FluentA.Application.BoundedContexts.Trash;
using FluentA.Application.Common;
using FluentA.Domain.BoundedContexts.Vocabulary.Entities;

namespace FluentA.Application.BoundedContexts.Vocabulary;

public sealed class VocabularyService : IVocabularyService
{
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
        return OperationResult<IReadOnlyList<BoardSummaryDto>>.Success(boards.Select(VocabularyDtoMapper.ToSummary).ToList());
    }

    public async Task<OperationResult<BoardDetailDto>> CreateBoardAsync(Guid userId, CreateBoardRequest request, CancellationToken cancellationToken = default)
    {
        var errors = VocabularyRequestValidator.ValidateBoard(request.Name, request.Language);
        if (errors.Count > 0)
        {
            return OperationResult<BoardDetailDto>.Failure(VocabularyError.Validation(errors));
        }

        var board = VocabBoard.Create(userId, request.Name, request.Language);
        await _repository.AddBoardAsync(board, cancellationToken);
        return OperationResult<BoardDetailDto>.Success(VocabularyDtoMapper.ToDetail(board, null));
    }

    public async Task<OperationResult<BoardDetailDto>> GetBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default)
    {
        var board = await _repository.GetBoardAsync(userId, boardId, cancellationToken);
        if (board is null)
        {
            return OperationResult<BoardDetailDto>.Failure(VocabularyError.NotFound());
        }

        var preferences = await _repository.GetBoardPreferenceAsync(userId, boardId, cancellationToken);
        return OperationResult<BoardDetailDto>.Success(VocabularyDtoMapper.ToDetail(board, preferences));
    }

    public async Task<OperationResult<BoardDetailDto>> UpdateBoardAsync(Guid userId, Guid boardId, UpdateBoardRequest request, CancellationToken cancellationToken = default)
    {
        var errors = VocabularyRequestValidator.ValidateBoard(request.Name, request.Language);
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
        return OperationResult<BoardDetailDto>.Success(VocabularyDtoMapper.ToDetail(board, preferences));
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
        var errors = VocabularyRequestValidator.ValidatePage(request.Name);
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
        return OperationResult<PageDto>.Success(VocabularyDtoMapper.ToPage(page));
    }

    public async Task<OperationResult<PageDto>> UpdatePageAsync(Guid userId, Guid boardId, Guid pageId, UpdatePageRequest request, CancellationToken cancellationToken = default)
    {
        var errors = VocabularyRequestValidator.ValidatePage(request.Name);
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
        return OperationResult<PageDto>.Success(VocabularyDtoMapper.ToPage(page));
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
        return OperationResult<IReadOnlyList<WordDto>>.Success(words.Select(VocabularyDtoMapper.ToWord).ToList());
    }

    public async Task<OperationResult<WordDto>> CreateWordAsync(Guid userId, Guid boardId, Guid pageId, WordRequest request, CancellationToken cancellationToken = default)
    {
        var validation = VocabularyRequestValidator.ValidateWord(request);
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
        return OperationResult<WordDto>.Success(VocabularyDtoMapper.ToWord(word));
    }

    public async Task<OperationResult<WordDto>> UpdateWordAsync(Guid userId, Guid boardId, Guid wordId, WordRequest request, CancellationToken cancellationToken = default)
    {
        var validation = VocabularyRequestValidator.ValidateWord(request);
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
        return OperationResult<WordDto>.Success(VocabularyDtoMapper.ToWord(word));
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
        return OperationResult<WordDto>.Success(VocabularyDtoMapper.ToWord(word));
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

        var errors = VocabularyRequestValidator.ValidatePreferences(request);
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
        return OperationResult<BoardPreferencesDto>.Success(VocabularyDtoMapper.ToPreferences(preference));
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

        var validation = VocabularyRequestValidator.ValidateWord(request);
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


}
