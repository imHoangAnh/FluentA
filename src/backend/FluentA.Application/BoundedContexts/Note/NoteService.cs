using System.Globalization;
using FluentA.Application.BoundedContexts.Assets;
using FluentA.Application.BoundedContexts.Note.DTOs;
using FluentA.Application.BoundedContexts.Trash;
using FluentA.Application.Common;
using FluentA.Domain.BoundedContexts.Assets.Enums;
using FluentA.Domain.BoundedContexts.Note.Entities;

namespace FluentA.Application.BoundedContexts.Note;

public sealed class NoteService : INoteService
{
    private const string DateFormat = "yyyy-MM-dd";
    private readonly INoteRepository _repository;
    private readonly INoteContentProcessor _contentProcessor;
    private readonly IAssetRepository _assets;
    private readonly IAssetObjectStorage _storage;
    private readonly ITrashService? _trashService;

    public NoteService(INoteRepository repository, INoteContentProcessor contentProcessor, IAssetRepository assets, IAssetObjectStorage storage, ITrashService? trashService = null)
    {
        _repository = repository;
        _contentProcessor = contentProcessor;
        _assets = assets;
        _storage = storage;
        _trashService = trashService;
    }

    public async Task<OperationResult<IReadOnlyList<NoteBoardSummaryDto>>> ListBoardsAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var boards = await _repository.ListBoardsAsync(userId, cancellationToken);
        return OperationResult<IReadOnlyList<NoteBoardSummaryDto>>.Success(
            boards.Select(NoteDtoMapper.ToBoardSummaryDto).ToList());
    }

    public async Task<OperationResult<NoteBoardSummaryDto>> CreateBoardAsync(
        Guid userId,
        CreateNoteBoardRequest request,
        CancellationToken cancellationToken = default)
    {
        var validation = NoteRequestValidator.ValidateBoardName(request.Name);
        if (validation is not null)
        {
            return OperationResult<NoteBoardSummaryDto>.Failure(validation);
        }

        var board = NoteBoard.Create(userId, request.Name);
        await _repository.AddBoardAsync(board, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return OperationResult<NoteBoardSummaryDto>.Success(NoteDtoMapper.ToBoardSummaryDto(board));
    }

    public async Task<OperationResult<NoteBoardSummaryDto>> UpdateBoardAsync(
        Guid userId,
        Guid boardId,
        UpdateNoteBoardRequest request,
        CancellationToken cancellationToken = default)
    {
        var board = await _repository.GetBoardAsync(userId, boardId, cancellationToken);
        if (board is null)
        {
            return OperationResult<NoteBoardSummaryDto>.Failure(NoteError.BoardNotFound());
        }

        var validation = NoteRequestValidator.ValidateBoardName(request.Name);
        if (validation is not null)
        {
            return OperationResult<NoteBoardSummaryDto>.Failure(validation);
        }

        board.Rename(request.Name);
        await _repository.UpdateBoardAsync(board, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return OperationResult<NoteBoardSummaryDto>.Success(NoteDtoMapper.ToBoardSummaryDto(board));
    }

    public async Task<OperationResult<TrashEntryDto>> DeleteBoardAsync(
        Guid userId,
        Guid boardId,
        CancellationToken cancellationToken = default)
    {
        if (_trashService is not null)
        {
            return await _trashService.TrashNoteBoardAsync(userId, boardId, cancellationToken);
        }

        var board = await _repository.GetBoardAsync(userId, boardId, cancellationToken);
        if (board is null)
        {
            return OperationResult<TrashEntryDto>.Failure(NoteError.BoardNotFound());
        }

        var nowUtc = DateTime.UtcNow;
        await _repository.SoftDeleteBoardAsync(board, nowUtc, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return OperationResult<TrashEntryDto>.Success(new TrashEntryDto(Guid.Empty, "Note", board.Id, board.Name, "Notes", nowUtc, nowUtc.AddDays(30)));
    }

    public async Task<OperationResult<NotePageDto>> CreatePageAsync(
        Guid userId,
        Guid boardId,
        CreateNotePageRequest request,
        CancellationToken cancellationToken = default)
    {
        var board = await _repository.GetBoardAsync(userId, boardId, cancellationToken);
        if (board is null)
        {
            return OperationResult<NotePageDto>.Failure(NoteError.BoardNotFound());
        }

        var validation = NoteRequestValidator.ValidatePageFields(request.Name, null);
        if (validation is not null)
        {
            return OperationResult<NotePageDto>.Failure(validation);
        }

        var page = board.AddPage(request.Name, string.Empty, DateTime.UtcNow);
        await _repository.AddPageAsync(page, cancellationToken);
        await _repository.UpdateBoardAsync(board, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return OperationResult<NotePageDto>.Success(await ToPageDtoAsync(userId, page, cancellationToken));
    }

    public async Task<OperationResult<NotePageDto>> GetPageAsync(
        Guid userId,
        Guid pageId,
        CancellationToken cancellationToken = default)
    {
        var page = await _repository.GetPageAsync(userId, pageId, cancellationToken);
        return page is null
            ? OperationResult<NotePageDto>.Failure(NoteError.PageNotFound())
            : OperationResult<NotePageDto>.Success(await ToPageDtoAsync(userId, page, cancellationToken));
    }

    public async Task<OperationResult<NotePageDto>> UpdatePageAsync(
        Guid userId,
        Guid pageId,
        UpdateNotePageRequest request,
        CancellationToken cancellationToken = default)
    {
        var page = await _repository.GetPageAsync(userId, pageId, cancellationToken);
        if (page is null)
        {
            return OperationResult<NotePageDto>.Failure(NoteError.PageNotFound());
        }

        var validation = NoteRequestValidator.ValidatePageFields(request.Name, request.Content);
        if (validation is not null)
        {
            return OperationResult<NotePageDto>.Failure(validation);
        }

        if (request.Name is not null)
        {
            page.Rename(request.Name);
        }

        if (request.Content is not null)
        {
            var existingAssetIds = await _repository.GetPageAssetIdsAsync(page.Id, cancellationToken);
            NoteProcessedContent processedContent;
            try
            {
                processedContent = await _contentProcessor.ProcessAsync(userId, request.Content, cancellationToken);
            }
            catch (NoteContentValidationException exception)
            {
                return OperationResult<NotePageDto>.Failure(NoteError.Validation(exception.Errors));
            }

            var attachedPages = await _repository.GetAttachedAssetPageIdsAsync(processedContent.ReferencedAssetIds.ToArray(), cancellationToken);
            if (attachedPages.Any(link => link.Value != page.Id))
            {
                return OperationResult<NotePageDto>.Failure(NoteError.Validation(new Dictionary<string, string[]>
                {
                    ["content"] = ["A note image can belong to only one page."]
                }));
            }

            page.UpdateContent(processedContent.Html);
            await _repository.ReplacePageAssetLinksAsync(page.Id, processedContent.ReferencedAssetIds, cancellationToken);

            var removedAssetIds = existingAssetIds.Except(processedContent.ReferencedAssetIds).ToArray();
            var removedAssets = await _assets.GetOwnedAsync(userId, removedAssetIds, cancellationToken);
            foreach (var removedAsset in removedAssets.Where(asset => asset.Type == AssetType.NoteImage && asset.Status == AssetStatus.Ready))
            {
                removedAsset.Archive(DateTime.UtcNow, TimeSpan.FromDays(30));
            }
        }

        await _repository.UpdatePageAsync(page, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return OperationResult<NotePageDto>.Success(await ToPageDtoAsync(userId, page, cancellationToken));
    }

    public async Task<OperationResult<TrashEntryDto>> DeletePageAsync(
        Guid userId,
        Guid pageId,
        CancellationToken cancellationToken = default)
    {
        if (_trashService is not null)
        {
            return await _trashService.TrashNotePageAsync(userId, pageId, cancellationToken);
        }

        var page = await _repository.GetPageAsync(userId, pageId, cancellationToken);
        if (page is null)
        {
            return OperationResult<TrashEntryDto>.Failure(NoteError.PageNotFound());
        }

        var nowUtc = DateTime.UtcNow;
        await _repository.SoftDeletePageAsync(page, nowUtc, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return OperationResult<TrashEntryDto>.Success(new TrashEntryDto(Guid.Empty, "Note", page.Id, page.Name, "Notes", nowUtc, nowUtc.AddDays(30)));
    }

    private async Task<NotePageDto> ToPageDtoAsync(Guid userId, NotePage page, CancellationToken cancellationToken)
    {
        var assetIds = await _repository.GetPageAssetIdsAsync(page.Id, cancellationToken);
        var assets = await _assets.GetOwnedAsync(userId, assetIds.ToArray(), cancellationToken);
        var urls = new Dictionary<Guid, string>();
        foreach (var asset in assets.Where(asset => asset.Type == AssetType.NoteImage && asset.Status == AssetStatus.Ready))
        {
            try
            {
                urls[asset.Id] = _storage.CreatePresignedDownload(new AssetDownloadRequest(asset.ObjectKey, TimeSpan.FromMinutes(5))).Url;
            }
            catch (AssetStorageUnavailableException)
            {
                // Fail closed: return the durable reference without a provider URL.
            }
        }

        return new NotePageDto(
            page.Id,
            page.BoardId,
            page.Name,
            _contentProcessor.HydrateImageSources(page.Content, urls),
            page.Date.ToString(DateFormat, CultureInfo.InvariantCulture),
            page.CreatedAt,
            page.UpdatedAt);
    }
}
