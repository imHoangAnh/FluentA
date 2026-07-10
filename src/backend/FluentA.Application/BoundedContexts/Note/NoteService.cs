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

    public NoteService(INoteRepository repository, INoteContentProcessor contentProcessor, IAssetRepository assets)
    {
        _repository = repository;
        _contentProcessor = contentProcessor;
        _assets = assets;
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

        return OperationResult<NotePageDto>.Success(ToPageDto(page));
    }

    public async Task<OperationResult<NotePageDto>> GetPageAsync(
        Guid userId,
        Guid pageId,
        CancellationToken cancellationToken = default)
    {
        var page = await _repository.GetPageAsync(userId, pageId, cancellationToken);
        return page is null
            ? OperationResult<NotePageDto>.Failure(NoteError.PageNotFound())
            : OperationResult<NotePageDto>.Success(ToPageDto(page));
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
            NoteProcessedContent processedContent;
            try
            {
                processedContent = await _contentProcessor.ProcessAsync(userId, request.Content, cancellationToken);
            }
            catch (NoteContentValidationException exception)
            {
                return OperationResult<NotePageDto>.Failure(NoteError.Validation(exception.Errors));
            }

            var previouslyReferenced = _contentProcessor.ExtractReferencedAssetIds(page.Content);
            page.UpdateContent(processedContent.Html);
            await MarkRemovedAssetsForCleanupAsync(
                userId,
                page.Id,
                previouslyReferenced,
                processedContent.ReferencedAssetIds,
                cancellationToken);
        }

        await _repository.UpdatePageAsync(page, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return OperationResult<NotePageDto>.Success(ToPageDto(page));
    }

    private async Task MarkRemovedAssetsForCleanupAsync(
        Guid userId,
        Guid pageId,
        IReadOnlySet<Guid> previousAssetIds,
        IReadOnlySet<Guid> nextAssetIds,
        CancellationToken cancellationToken)
    {
        foreach (var assetId in previousAssetIds.Except(nextAssetIds))
        {
            if (await _repository.IsAssetReferencedAsync(userId, assetId, pageId, cancellationToken))
            {
                continue;
            }

            var asset = await _assets.GetOwnedAsync(userId, assetId, cancellationToken);
            if (asset is null || asset.Type != AssetType.NoteImage || asset.Status != AssetStatus.Finalized)
            {
                continue;
            }

            asset.MarkDeleted(DateTime.UtcNow);
            await _assets.UpdateAsync(asset, cancellationToken);
        }
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

    private static NotePageDto ToPageDto(NotePage page)
    {
        return new NotePageDto(
            page.Id,
            page.BoardId,
            page.Name,
            page.Content,
            page.Date.ToString(DateFormat, CultureInfo.InvariantCulture),
            page.CreatedAt,
            page.UpdatedAt);
    }
}
