using FluentA.Application.BoundedContexts.Vocabulary.DTOs;
using FluentA.Application.BoundedContexts.Trash;
using FluentA.Application.Common;
using FluentA.Domain.BoundedContexts.Vocabulary.Entities;

namespace FluentA.Application.BoundedContexts.Vocabulary;

public sealed class VocabularyService : IVocabularyService
{
    private readonly IVocabularyRepository _repository;
    private readonly ITrashService _trashService;

    public VocabularyService(IVocabularyRepository repository, ITrashService trashService)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        _trashService = trashService ?? throw new ArgumentNullException(nameof(trashService));
    }

    public async Task<OperationResult<IReadOnlyList<BoardSummaryDto>>> ListBoardsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var boards = await _repository.ListBoardsAsync(userId, cancellationToken);
        return OperationResult<IReadOnlyList<BoardSummaryDto>>.Success(boards.Select(VocabularyDtoMapper.ToSummary).ToList());
    }

    public async Task<OperationResult<BoardDetailDto>> CreateBoardAsync(Guid userId, CreateBoardRequest request, CancellationToken cancellationToken = default)
    {
        var errors = VocabularyRequestValidator.ValidateCreateBoard(request);
        if (errors.Count > 0)
        {
            return OperationResult<BoardDetailDto>.Failure(VocabularyError.Validation(errors));
        }

        var board = VocabBoard.Create(userId, request.Name, request.Language);

        if (request.IncludedOptionalColumns is not null)
        {
            var preferences = VocabBoardPreference.Create(
                userId,
                board.Id,
                VocabularyRequestValidator.GetHiddenOptionalColumns(request.IncludedOptionalColumns),
                VocabularyRequestValidator.FixedColumnOrder,
                new Dictionary<string, int>());
            await _repository.AddBoardAsync(board, cancellationToken);
            await _repository.AddBoardPreferenceAsync(preferences, cancellationToken);
            await _repository.SaveChangesAsync(cancellationToken);
            return OperationResult<BoardDetailDto>.Success(VocabularyDtoMapper.ToDetail(board, preferences));
        }

        await _repository.AddBoardAsync(board, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);
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
        var errors = VocabularyRequestValidator.ValidateUpdateBoard(request);
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
        if (request.IncludedOptionalColumns is not null)
        {
            var hiddenColumns = VocabularyRequestValidator.GetHiddenOptionalColumns(request.IncludedOptionalColumns);
            var preference = await _repository.GetBoardPreferenceAsync(userId, boardId, cancellationToken);
            if (preference is null)
            {
                preference = VocabBoardPreference.Create(
                    userId,
                    boardId,
                    hiddenColumns,
                    VocabularyRequestValidator.FixedColumnOrder,
                    new Dictionary<string, int>());
                await _repository.AddBoardPreferenceAsync(preference, cancellationToken);
            }
            else
            {
                var current = VocabularyDtoMapper.ToPreferences(preference);
                var newlyVisible = current.ColumnOrder
                    .Where(key => current.HiddenColumns.Contains(key) && !hiddenColumns.Contains(key))
                    .ToArray();
                var order = current.ColumnOrder.Where(key => !newlyVisible.Contains(key)).Concat(newlyVisible);
                preference.Update(hiddenColumns, order, current.ColumnWidths);
                await _repository.UpdateBoardPreferenceAsync(preference, cancellationToken);
            }
        }

        await _repository.UpdateBoardAsync(board, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);
        var preferences = await _repository.GetBoardPreferenceAsync(userId, boardId, cancellationToken);
        return OperationResult<BoardDetailDto>.Success(VocabularyDtoMapper.ToDetail(board, preferences));
    }

    public async Task<OperationResult<TrashEntryDto>> DeleteBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default)
    {
        if (await _repository.GetBoardAsync(userId, boardId, cancellationToken) is null)
        {
            return OperationResult<TrashEntryDto>.Failure(VocabularyError.NotFound());
        }

        return await _trashService.TrashVocabularyAsync(userId, boardId, cancellationToken);
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

    public async Task<OperationResult<PageDto>> UpdatePageAsync(Guid userId, Guid pageId, UpdatePageRequest request, CancellationToken cancellationToken = default)
    {
        var errors = VocabularyRequestValidator.ValidatePage(request.Name);
        if (errors.Count > 0)
        {
            return OperationResult<PageDto>.Failure(VocabularyError.Validation(errors));
        }

        var page = await _repository.GetPageAsync(userId, pageId, cancellationToken);
        if (page is null)
        {
            return OperationResult<PageDto>.Failure(VocabularyError.NotFound());
        }

        page.Update(request.Name);
        await _repository.UpdatePageAsync(page, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);
        return OperationResult<PageDto>.Success(VocabularyDtoMapper.ToPage(page));
    }

    public async Task<OperationResult<TrashEntryDto>> DeletePageAsync(Guid userId, Guid pageId, CancellationToken cancellationToken = default)
    {
        if (await _repository.GetPageAsync(userId, pageId, cancellationToken) is null)
        {
            return OperationResult<TrashEntryDto>.Failure(VocabularyError.NotFound());
        }

        return await _trashService.TrashVocabularyAsync(userId, pageId, cancellationToken);
    }

    public async Task<OperationResult<IReadOnlyList<WordDto>>> ListWordsAsync(Guid userId, Guid pageId, CancellationToken cancellationToken = default)
    {
        var page = await _repository.GetPageAsync(userId, pageId, cancellationToken);
        if (page is null)
        {
            return OperationResult<IReadOnlyList<WordDto>>.Failure(VocabularyError.NotFound());
        }

        var words = await _repository.ListWordsAsync(userId, pageId, cancellationToken);
        return OperationResult<IReadOnlyList<WordDto>>.Success(words.Select(VocabularyDtoMapper.ToWord).ToList());
    }

    public async Task<OperationResult<WordDto>> CreateWordAsync(Guid userId, Guid pageId, WordRequest request, CancellationToken cancellationToken = default)
    {
        var validation = VocabularyRequestValidator.ValidateWord(request);
        if (validation.Errors.Count > 0)
        {
            return OperationResult<WordDto>.Failure(VocabularyError.Validation(validation.Errors));
        }

        var page = await _repository.GetPageAsync(userId, pageId, cancellationToken);
        if (page is null)
        {
            return OperationResult<WordDto>.Failure(VocabularyError.NotFound());
        }

        var word = VocabWord.Create(
            page.Id,
            request.Word,
            request.Meaning,
            request.IpaPronunciation,
            validation.WordType!.Value,
            request.Context,
            request.Example,
            request.Synonyms,
            request.Antonyms);
        await _repository.AddWordAsync(word, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);
        return OperationResult<WordDto>.Success(VocabularyDtoMapper.ToWord(word));
    }

    public async Task<OperationResult<WordDto>> UpdateWordAsync(Guid userId, Guid wordId, WordPatchRequest request, CancellationToken cancellationToken = default)
    {
        var validation = VocabularyRequestValidator.ValidateWordPatch(request);
        if (validation.Errors.Count > 0)
        {
            return OperationResult<WordDto>.Failure(VocabularyError.Validation(validation.Errors));
        }

        var word = await _repository.GetWordAsync(userId, wordId, cancellationToken);
        if (word is null)
        {
            return OperationResult<WordDto>.Failure(VocabularyError.NotFound());
        }

        if (request.Word is null
            && request.Meaning is null
            && request.IpaPronunciation is null
            && request.Type is null
            && request.Context is null
            && request.Example is null
            && request.Synonyms is null
            && request.Antonyms is null)
        {
            return OperationResult<WordDto>.Success(VocabularyDtoMapper.ToWord(word));
        }

        word.Update(
            request.Word ?? word.Word,
            request.Meaning ?? word.Meaning,
            request.IpaPronunciation ?? word.IpaPronunciation,
            validation.WordType ?? word.Type,
            request.Context ?? word.Context,
            request.Example ?? word.Example,
            request.Synonyms ?? word.Synonyms,
            request.Antonyms ?? word.Antonyms);
        await _repository.UpdateWordAsync(word, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);
        return OperationResult<WordDto>.Success(VocabularyDtoMapper.ToWord(word));
    }

    public async Task<OperationResult<TrashEntryDto>> DeleteWordAsync(Guid userId, Guid wordId, CancellationToken cancellationToken = default)
    {
        if (await _repository.GetWordAsync(userId, wordId, cancellationToken) is null)
        {
            return OperationResult<TrashEntryDto>.Failure(VocabularyError.NotFound());
        }

        return await _trashService.TrashVocabularyAsync(userId, wordId, cancellationToken);
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
            var newlyVisible = preference.HiddenColumns.Where(key => !request.HiddenColumns.Contains(key)).ToArray();
            var order = request.ColumnOrder.Where(key => !newlyVisible.Contains(key)).Concat(newlyVisible);
            preference.Update(request.HiddenColumns, order, request.ColumnWidths);
            await _repository.UpdateBoardPreferenceAsync(preference, cancellationToken);
        }

        await _repository.SaveChangesAsync(cancellationToken);
        return OperationResult<BoardPreferencesDto>.Success(VocabularyDtoMapper.ToPreferences(preference));
    }

}
