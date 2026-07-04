using System.Globalization;
using FluentA.Application.BoundedContexts.Kanban.DTOs;
using FluentA.Application.Common;
using FluentA.Domain.BoundedContexts.Kanban.Entities;
using FluentA.Domain.BoundedContexts.Kanban.Enums;

namespace FluentA.Application.BoundedContexts.Kanban;

public sealed class KanbanService : IKanbanService
{
    private const string DateFormat = "yyyy-MM-dd";
    private readonly IKanbanRepository _repository;
    private readonly IKanbanSyncNotifier _syncNotifier;

    public KanbanService(IKanbanRepository repository, IKanbanSyncNotifier? syncNotifier = null)
    {
        _repository = repository;
        _syncNotifier = syncNotifier ?? NullKanbanSyncNotifier.Instance;
    }

    public async Task<OperationResult<IReadOnlyList<KanbanBoardSummaryDto>>> ListBoardsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var boards = await _repository.ListBoardsAsync(userId, cancellationToken);
        return OperationResult<IReadOnlyList<KanbanBoardSummaryDto>>.Success(boards.Select(ToSummary).ToList());
    }

    public async Task<OperationResult<KanbanBoardDetailDto>> CreateBoardAsync(Guid userId, CreateKanbanBoardRequest request, CancellationToken cancellationToken = default)
    {
        var errors = ValidateName(request.Name, "name", 180);
        if (errors.Count > 0)
        {
            return OperationResult<KanbanBoardDetailDto>.Failure(KanbanError.Validation(errors));
        }

        var board = KanbanBoard.Create(userId, request.Name);
        await _repository.AddBoardAsync(board, cancellationToken);
        return OperationResult<KanbanBoardDetailDto>.Success(ToDetail(board));
    }

    public async Task<OperationResult<KanbanBoardDetailDto>> GetBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default)
    {
        var board = await _repository.GetBoardAsync(userId, boardId, cancellationToken);
        return board is null
            ? OperationResult<KanbanBoardDetailDto>.Failure(KanbanError.NotFound())
            : OperationResult<KanbanBoardDetailDto>.Success(ToDetail(board));
    }

    public async Task<OperationResult<bool>> DeleteBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default)
    {
        var board = await _repository.GetBoardAsync(userId, boardId, cancellationToken);
        if (board is null)
        {
            return OperationResult<bool>.Failure(KanbanError.NotFound());
        }

        board.SoftDelete();
        await _repository.UpdateBoardAsync(board, cancellationToken);
        return OperationResult<bool>.Success(true);
    }

    public async Task<OperationResult<KanbanColumnDto>> CreateColumnAsync(
        Guid userId,
        Guid boardId,
        CreateKanbanColumnRequest request,
        CancellationToken cancellationToken = default)
    {
        var board = await _repository.GetBoardAsync(userId, boardId, cancellationToken);
        if (board is null)
        {
            return OperationResult<KanbanColumnDto>.Failure(KanbanError.NotFound());
        }

        var errors = ValidateName(request.Name, "name", 180);
        if (errors.Count > 0)
        {
            return OperationResult<KanbanColumnDto>.Failure(KanbanError.Validation(errors));
        }

        var sortOrder = await _repository.NextColumnSortOrderAsync(boardId, cancellationToken);
        var column = KanbanColumn.Create(boardId, request.Name, sortOrder);
        await _repository.AddColumnAsync(column, cancellationToken);
        return OperationResult<KanbanColumnDto>.Success(ToColumnDto(column));
    }

    public async Task<OperationResult<KanbanColumnDto>> UpdateColumnAsync(
        Guid userId,
        Guid boardId,
        Guid columnId,
        UpdateKanbanColumnRequest request,
        CancellationToken cancellationToken = default)
    {
        var column = await _repository.GetColumnAsync(userId, boardId, columnId, cancellationToken);
        if (column is null)
        {
            return OperationResult<KanbanColumnDto>.Failure(KanbanError.NotFound());
        }

        var errors = new Dictionary<string, string[]>();
        if (request.Name is not null)
        {
            foreach (var error in ValidateName(request.Name, "name", 180))
            {
                errors[error.Key] = error.Value;
            }
        }

        if (request.SortOrder is < 0)
        {
            errors["sortOrder"] = ["Sort order must be zero or greater."];
        }

        if (errors.Count > 0)
        {
            return OperationResult<KanbanColumnDto>.Failure(KanbanError.Validation(errors));
        }

        if (request.Name is not null)
        {
            column.Rename(request.Name);
        }

        if (request.SortOrder is not null)
        {
            column.Reorder(request.SortOrder.Value);
        }

        await _repository.UpdateColumnAsync(column, cancellationToken);
        return OperationResult<KanbanColumnDto>.Success(ToColumnDto(column));
    }

    public async Task<OperationResult<bool>> DeleteColumnAsync(Guid userId, Guid boardId, Guid columnId, CancellationToken cancellationToken = default)
    {
        var column = await _repository.GetColumnAsync(userId, boardId, columnId, cancellationToken);
        if (column is null)
        {
            return OperationResult<bool>.Failure(KanbanError.NotFound());
        }

        if (column.HasActiveCards())
        {
            return OperationResult<bool>.Failure(KanbanError.ColumnNotEmpty());
        }

        column.SoftDelete();
        await _repository.UpdateColumnAsync(column, cancellationToken);
        return OperationResult<bool>.Success(true);
    }

    public async Task<OperationResult<KanbanCardDto>> CreateCardAsync(
        Guid userId,
        Guid boardId,
        CreateKanbanCardRequest request,
        CancellationToken cancellationToken = default)
    {
        var column = await _repository.GetColumnAsync(userId, boardId, request.ColumnId, cancellationToken);
        if (column is null)
        {
            return OperationResult<KanbanCardDto>.Failure(KanbanError.NotFound());
        }

        var validation = ValidateCardCreate(request);
        if (validation.Errors.Count > 0)
        {
            return OperationResult<KanbanCardDto>.Failure(KanbanError.Validation(validation.Errors));
        }

        var sortOrder = await _repository.NextCardSortOrderAsync(column.Id, cancellationToken);
        var card = KanbanCard.Create(column.Id, request.Title, request.Description, validation.Priority, validation.Deadline, sortOrder, request.Tags ?? []);
        await _repository.AddCardAsync(card, cancellationToken);
        return OperationResult<KanbanCardDto>.Success(ToCardDto(card));
    }

    public async Task<OperationResult<KanbanCardDto>> UpdateCardAsync(Guid userId, Guid cardId, UpdateKanbanCardRequest request, CancellationToken cancellationToken = default)
    {
        var card = await _repository.GetCardAsync(userId, cardId, cancellationToken);
        if (card is null)
        {
            return OperationResult<KanbanCardDto>.Failure(KanbanError.NotFound());
        }

        var validation = ValidateCardUpdate(request);
        if (validation.Errors.Count > 0)
        {
            return OperationResult<KanbanCardDto>.Failure(KanbanError.Validation(validation.Errors));
        }

        card.Update(request.Title, request.Description, validation.Priority, validation.Deadline, request.Tags, request.Deadline == string.Empty);
        await _repository.UpdateCardAsync(card, cancellationToken);
        return OperationResult<KanbanCardDto>.Success(ToCardDto(card));
    }

    public async Task<OperationResult<KanbanCardDto>> MoveCardAsync(Guid userId, Guid cardId, MoveKanbanCardRequest request, CancellationToken cancellationToken = default)
    {
        var errors = new Dictionary<string, string[]>();
        if (request.ColumnId == Guid.Empty)
        {
            errors["columnId"] = ["Column id is required."];
        }

        if (request.SortOrder < 0)
        {
            errors["sortOrder"] = ["Sort order must be zero or greater."];
        }

        if (errors.Count > 0)
        {
            return OperationResult<KanbanCardDto>.Failure(KanbanError.Validation(errors));
        }

        var card = await _repository.GetCardAsync(userId, cardId, cancellationToken);
        var targetColumn = await _repository.GetColumnForCardAsync(userId, request.ColumnId, cancellationToken);
        if (card is null || targetColumn is null)
        {
            return OperationResult<KanbanCardDto>.Failure(KanbanError.NotFound());
        }

        var fromColumnId = card.ColumnId;
        card.MoveToColumn(request.ColumnId, request.SortOrder);
        await _repository.UpdateCardAsync(card, cancellationToken);
        await _syncNotifier.CardMovedAsync(userId, targetColumn.BoardId, card.Id, fromColumnId, request.ColumnId, request.SortOrder, cancellationToken);
        return OperationResult<KanbanCardDto>.Success(ToCardDto(card));
    }

    public async Task<OperationResult<bool>> DeleteCardAsync(Guid userId, Guid cardId, CancellationToken cancellationToken = default)
    {
        var card = await _repository.GetCardAsync(userId, cardId, cancellationToken);
        if (card is null)
        {
            return OperationResult<bool>.Failure(KanbanError.NotFound());
        }

        card.SoftDelete();
        await _repository.UpdateCardAsync(card, cancellationToken);
        return OperationResult<bool>.Success(true);
    }

    private static (Dictionary<string, string[]> Errors, CardPriority Priority, DateTime? Deadline) ValidateCardCreate(CreateKanbanCardRequest request)
    {
        var errors = ValidateCardCommon(request.Title, request.Description, request.Priority, request.Deadline, request.Tags, titleRequired: true, out var priority, out var deadline);
        if (request.ColumnId == Guid.Empty)
        {
            errors["columnId"] = ["Column id is required."];
        }

        return (errors, priority ?? CardPriority.Medium, deadline);
    }

    private static (Dictionary<string, string[]> Errors, CardPriority? Priority, DateTime? Deadline) ValidateCardUpdate(UpdateKanbanCardRequest request)
    {
        var errors = ValidateCardCommon(request.Title, request.Description, request.Priority, request.Deadline, request.Tags, titleRequired: false, out var priority, out var deadline);
        return (errors, priority, deadline);
    }

    private static Dictionary<string, string[]> ValidateCardCommon(
        string? title,
        string? description,
        string? priorityText,
        string? deadlineText,
        IReadOnlyList<string>? tags,
        bool titleRequired,
        out CardPriority? priority,
        out DateTime? deadline)
    {
        var errors = new Dictionary<string, string[]>();
        priority = null;
        deadline = null;

        if (titleRequired || title is not null)
        {
            if (string.IsNullOrWhiteSpace(title))
            {
                errors["title"] = ["Title is required."];
            }
            else if (title.Trim().Length > 240)
            {
                errors["title"] = ["Title must be at most 240 characters."];
            }
        }

        if (description is not null && description.Trim().Length > 4000)
        {
            errors["description"] = ["Description must be at most 4000 characters."];
        }

        if (!string.IsNullOrWhiteSpace(priorityText))
        {
            if (Enum.TryParse<CardPriority>(priorityText, ignoreCase: true, out var parsed))
            {
                priority = parsed;
            }
            else
            {
                errors["priority"] = ["Priority must be Low, Medium, High, or Critical."];
            }
        }

        if (!string.IsNullOrWhiteSpace(deadlineText))
        {
            if (DateTime.TryParseExact(deadlineText, DateFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
            {
                deadline = DateTime.SpecifyKind(parsed.Date, DateTimeKind.Utc);
            }
            else
            {
                errors["deadline"] = ["Deadline must be a date in YYYY-MM-DD format."];
            }
        }

        if (tags is not null)
        {
            var cleanedTags = tags.Select(tag => tag.Trim()).Where(tag => tag.Length > 0).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
            if (cleanedTags.Count > 12)
            {
                errors["tags"] = ["A card can have at most 12 tags."];
            }
            else if (cleanedTags.Any(tag => tag.Length > 40))
            {
                errors["tags"] = ["Tags must be at most 40 characters."];
            }
        }

        return errors;
    }

    private static Dictionary<string, string[]> ValidateName(string name, string field, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return new Dictionary<string, string[]> { [field] = [$"{field} is required."] };
        }

        if (name.Trim().Length > maxLength)
        {
            return new Dictionary<string, string[]> { [field] = [$"{field} must be at most {maxLength} characters."] };
        }

        return [];
    }

    private static KanbanBoardSummaryDto ToSummary(KanbanBoard board)
    {
        var activeColumns = board.Columns.Where(column => column.DeletedAt is null).ToList();
        return new KanbanBoardSummaryDto(
            board.Id,
            board.Name,
            activeColumns.Count,
            activeColumns.Sum(column => column.Cards.Count(card => card.DeletedAt is null)),
            board.CreatedAt,
            board.UpdatedAt);
    }

    private static KanbanBoardDetailDto ToDetail(KanbanBoard board)
    {
        return new KanbanBoardDetailDto(
            board.Id,
            board.Name,
            board.Columns
                .Where(column => column.DeletedAt is null)
                .OrderBy(column => column.SortOrder)
                .ThenBy(column => column.CreatedAt)
                .Select(ToColumnDto)
                .ToList(),
            board.CreatedAt,
            board.UpdatedAt);
    }

    private static KanbanColumnDto ToColumnDto(KanbanColumn column)
    {
        return new KanbanColumnDto(
            column.Id,
            column.Name,
            column.SortOrder,
            column.Cards
                .Where(card => card.DeletedAt is null)
                .OrderBy(card => card.SortOrder)
                .ThenBy(card => card.CreatedAt)
                .Select(ToCardDto)
                .ToList(),
            column.CreatedAt,
            column.UpdatedAt);
    }

    private static KanbanCardDto ToCardDto(KanbanCard card)
    {
        return new KanbanCardDto(
            card.Id,
            card.ColumnId,
            card.Title,
            card.Description,
            card.Priority.ToString(),
            card.Deadline is null ? null : card.Deadline.Value.ToString(DateFormat, CultureInfo.InvariantCulture),
            card.SortOrder,
            card.Tags,
            card.CreatedAt,
            card.UpdatedAt);
    }
}
