using System.Globalization;
using FluentA.Application.BoundedContexts.Assets;
using FluentA.Application.BoundedContexts.Note.DTOs;
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

    public NoteService(INoteRepository repository, INoteContentProcessor contentProcessor, IAssetRepository assets, IAssetObjectStorage storage)
    {
        _repository = repository;
        _contentProcessor = contentProcessor;
        _assets = assets;
        _storage = storage;
    }

    public async Task<OperationResult<IReadOnlyList<NoteBoardSummaryDto>>> ListBoardsAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var boards = await _repository.ListBoardsAsync(userId, cancellationToken);
        return OperationResult<IReadOnlyList<NoteBoardSummaryDto>>.Success(
            boards.Select(ToBoardSummaryDto).ToList());
    }

    public async Task<OperationResult<NoteBoardSummaryDto>> CreateBoardAsync(
        Guid userId,
        CreateNoteBoardRequest request,
        CancellationToken cancellationToken = default)
    {
        var validation = ValidateBoardName(request.Name);
        if (validation is not null)
        {
            return OperationResult<NoteBoardSummaryDto>.Failure(validation);
        }

        var board = NoteBoard.Create(userId, request.Name);
        await _repository.AddBoardAsync(board, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return OperationResult<NoteBoardSummaryDto>.Success(ToBoardSummaryDto(board));
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

        var validation = ValidateBoardName(request.Name);
        if (validation is not null)
        {
            return OperationResult<NoteBoardSummaryDto>.Failure(validation);
        }

        board.Rename(request.Name);
        await _repository.UpdateBoardAsync(board, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return OperationResult<NoteBoardSummaryDto>.Success(ToBoardSummaryDto(board));
    }

    public async Task<OperationResult<bool>> DeleteBoardAsync(
        Guid userId,
        Guid boardId,
        CancellationToken cancellationToken = default)
    {
        var board = await _repository.GetBoardAsync(userId, boardId, cancellationToken);
        if (board is null)
        {
            return OperationResult<bool>.Failure(NoteError.BoardNotFound());
        }

        var pageIds = board.Pages.Where(page => page.DeletedAt is null).Select(page => page.Id).ToArray();
        var assetIds = new HashSet<Guid>();
        foreach (var pageId in pageIds)
        {
            assetIds.UnionWith(await _repository.GetPageAssetIdsAsync(pageId, cancellationToken));
        }

        var assets = await _assets.GetOwnedAsync(userId, assetIds.ToArray(), cancellationToken);
        foreach (var asset in assets.Where(asset => asset.Type == AssetType.NoteImage && asset.Status == AssetStatus.Ready))
        {
            asset.Archive(DateTime.UtcNow, TimeSpan.FromDays(30));
        }

        await _repository.SoftDeleteBoardAsync(board, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return OperationResult<bool>.Success(true);
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

        var validation = ValidatePageFields(request.Name, null);
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

        var validation = ValidatePageFields(request.Name, request.Content);
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

    public async Task<OperationResult<bool>> DeletePageAsync(
        Guid userId,
        Guid pageId,
        CancellationToken cancellationToken = default)
    {
        var page = await _repository.GetPageAsync(userId, pageId, cancellationToken);
        if (page is null)
        {
            return OperationResult<bool>.Failure(NoteError.PageNotFound());
        }

        var assetIds = await _repository.GetPageAssetIdsAsync(page.Id, cancellationToken);
        var assets = await _assets.GetOwnedAsync(userId, assetIds.ToArray(), cancellationToken);
        foreach (var asset in assets.Where(asset => asset.Type == AssetType.NoteImage && asset.Status == AssetStatus.Ready))
        {
            asset.Archive(DateTime.UtcNow, TimeSpan.FromDays(30));
        }

        await _repository.SoftDeletePageAsync(page, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return OperationResult<bool>.Success(true);
    }

    private static NoteError? ValidateBoardName(string name)
    {
        var cleaned = name.Trim();
        if (cleaned.Length is < 1 or > 120)
        {
            return NoteError.Validation(new Dictionary<string, string[]>
            {
                ["name"] = ["Board name must be between 1 and 120 characters."]
            });
        }

        return null;
    }

    private static NoteError? ValidatePageFields(string? name, string? content)
    {
        var errors = new Dictionary<string, string[]>();

        if (name is not null)
        {
            var cleanedName = name.Trim();
            if (cleanedName.Length is < 1 or > 240)
            {
                errors["name"] = ["Page name must be between 1 and 240 characters."];
            }
        }

        if (content is not null && content.Length > 100_000)
        {
            errors["content"] = ["Content must be at most 100000 characters."];
        }

        return errors.Count > 0 ? NoteError.Validation(errors) : null;
    }

    private static NoteBoardSummaryDto ToBoardSummaryDto(NoteBoard board)
    {
        var pages = board.Pages
            .Where(page => page.DeletedAt is null)
            .OrderByDescending(page => page.CreatedAt)
            .ThenByDescending(page => page.Id)
            .Select(ToPageSummaryDto)
            .ToList();

        return new NoteBoardSummaryDto(
            board.Id,
            board.Name,
            pages,
            board.CreatedAt,
            board.UpdatedAt);
    }

    private static NotePageSummaryDto ToPageSummaryDto(NotePage page)
    {
        return new NotePageSummaryDto(
            page.Id,
            page.BoardId,
            page.Name,
            page.Date.ToString(DateFormat, CultureInfo.InvariantCulture),
            page.CreatedAt,
            page.UpdatedAt);
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
