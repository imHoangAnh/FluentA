using System.Globalization;
using FluentA.Application.BoundedContexts.Project.DTOs;
using FluentA.Application.BoundedContexts.Trash;
using FluentA.Application.Common;
using FluentA.Domain.BoundedContexts.Project.Entities;
using FluentA.Domain.BoundedContexts.Project.Enums;

namespace FluentA.Application.BoundedContexts.Project;

public sealed class ProjectService : IProjectService
{
    private const string DateFormat = "yyyy-MM-dd";
    private readonly IProjectRepository _repository;
    private readonly IProjectSyncNotifier _syncNotifier;
    private readonly ITrashService? _trashService;

    public ProjectService(IProjectRepository repository, IProjectSyncNotifier? syncNotifier = null, ITrashService? trashService = null)
    {
        _repository = repository;
        _syncNotifier = syncNotifier ?? NullProjectSyncNotifier.Instance;
        _trashService = trashService;
    }

    public async Task<OperationResult<IReadOnlyList<ProjectBoardSummaryDto>>> ListBoardsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var boards = await _repository.ListBoardsAsync(userId, cancellationToken);
        return OperationResult<IReadOnlyList<ProjectBoardSummaryDto>>.Success(boards.Select(ToSummary).ToList());
    }

    public async Task<OperationResult<ProjectBoardDetailDto>> CreateBoardAsync(Guid userId, CreateProjectBoardRequest request, CancellationToken cancellationToken = default)
    {
        var errors = ValidateName(request.Name, "name", 180);
        if (errors.Count > 0)
        {
            return OperationResult<ProjectBoardDetailDto>.Failure(ProjectError.Validation(errors));
        }

        var board = ProjectBoard.Create(userId, request.Name);
        await _repository.AddBoardAsync(board, cancellationToken);
        return OperationResult<ProjectBoardDetailDto>.Success(ToDetail(board));
    }

    public async Task<OperationResult<ProjectBoardDetailDto>> GetBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default)
    {
        var board = await _repository.GetBoardAsync(userId, boardId, cancellationToken);
        return board is null
            ? OperationResult<ProjectBoardDetailDto>.Failure(ProjectError.NotFound())
            : OperationResult<ProjectBoardDetailDto>.Success(ToDetail(board));
    }

    public async Task<OperationResult<ProjectBoardDetailDto>> UpdateBoardAsync(Guid userId, Guid boardId, UpdateProjectBoardRequest request, CancellationToken cancellationToken = default)
    {
        var board = await _repository.GetBoardAsync(userId, boardId, cancellationToken);
        if (board is null)
        {
            return OperationResult<ProjectBoardDetailDto>.Failure(ProjectError.NotFound());
        }

        if (request.Name is not null)
        {
            var errors = ValidateName(request.Name, "name", 180);
            if (errors.Count > 0)
            {
                return OperationResult<ProjectBoardDetailDto>.Failure(ProjectError.Validation(errors));
            }

            board.Rename(request.Name);
        }

        await _repository.UpdateBoardAsync(board, cancellationToken);
        return OperationResult<ProjectBoardDetailDto>.Success(ToDetail(board));
    }

    public async Task<OperationResult<TrashEntryDto>> DeleteBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default)
    {
        if (_trashService is not null) return await _trashService.TrashProjectAsync(userId, boardId, cancellationToken);
        var board = await _repository.GetBoardAsync(userId, boardId, cancellationToken);
        if (board is null)
        {
            return OperationResult<TrashEntryDto>.Failure(ProjectError.NotFound());
        }

        var nowUtc = DateTime.UtcNow;
        board.SoftDelete(nowUtc);
        await _repository.UpdateBoardAsync(board, cancellationToken);
        return OperationResult<TrashEntryDto>.Success(new TrashEntryDto(Guid.Empty, "Project", board.Id, board.Name, "Project board", nowUtc, nowUtc.AddDays(30)));
    }

    public async Task<OperationResult<ProjectColumnDto>> CreateColumnAsync(
        Guid userId,
        Guid boardId,
        CreateProjectColumnRequest request,
        CancellationToken cancellationToken = default)
    {
        var board = await _repository.GetBoardAsync(userId, boardId, cancellationToken);
        if (board is null)
        {
            return OperationResult<ProjectColumnDto>.Failure(ProjectError.NotFound());
        }

        var errors = ValidateName(request.Name, "name", 180);
        if (errors.Count > 0)
        {
            return OperationResult<ProjectColumnDto>.Failure(ProjectError.Validation(errors));
        }

        var sortOrder = await _repository.NextColumnSortOrderAsync(boardId, cancellationToken);
        var column = ProjectColumn.Create(boardId, request.Name, sortOrder);
        await _repository.AddColumnAsync(column, cancellationToken);
        return OperationResult<ProjectColumnDto>.Success(ToColumnDto(column));
    }

    public async Task<OperationResult<ProjectColumnDto>> UpdateColumnAsync(
        Guid userId,
        Guid boardId,
        Guid columnId,
        UpdateProjectColumnRequest request,
        CancellationToken cancellationToken = default)
    {
        var column = await _repository.GetColumnAsync(userId, boardId, columnId, cancellationToken);
        if (column is null)
        {
            return OperationResult<ProjectColumnDto>.Failure(ProjectError.NotFound());
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
            return OperationResult<ProjectColumnDto>.Failure(ProjectError.Validation(errors));
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
        return OperationResult<ProjectColumnDto>.Success(ToColumnDto(column));
    }

    public async Task<OperationResult<TrashEntryDto>> DeleteColumnAsync(Guid userId, Guid boardId, Guid columnId, CancellationToken cancellationToken = default)
    {
        var column = await _repository.GetColumnAsync(userId, boardId, columnId, cancellationToken);
        if (column is null)
        {
            return OperationResult<TrashEntryDto>.Failure(ProjectError.NotFound());
        }

        if (column.HasActiveCards())
        {
            return OperationResult<TrashEntryDto>.Failure(ProjectError.ColumnNotEmpty());
        }

        if (_trashService is not null) return await _trashService.TrashProjectAsync(userId, columnId, cancellationToken);
        var nowUtc = DateTime.UtcNow;
        column.SoftDelete(nowUtc);
        await _repository.UpdateColumnAsync(column, cancellationToken);
        return OperationResult<TrashEntryDto>.Success(new TrashEntryDto(Guid.Empty, "Project", column.Id, column.Name, "Project column", nowUtc, nowUtc.AddDays(30)));
    }

    public async Task<OperationResult<ProjectCardDto>> CreateCardAsync(
        Guid userId,
        Guid boardId,
        CreateProjectCardRequest request,
        CancellationToken cancellationToken = default)
    {
        var column = await _repository.GetColumnAsync(userId, boardId, request.ColumnId, cancellationToken);
        if (column is null)
        {
            return OperationResult<ProjectCardDto>.Failure(ProjectError.NotFound());
        }

        var validation = ValidateCardCreate(request);
        if (validation.Errors.Count > 0)
        {
            return OperationResult<ProjectCardDto>.Failure(ProjectError.Validation(validation.Errors));
        }

        var sortOrder = await _repository.NextCardSortOrderAsync(column.Id, cancellationToken);
        var card = ProjectCard.Create(column.Id, request.Title, request.Description, validation.Priority, validation.Deadline, sortOrder);
        await _repository.AddCardAsync(card, cancellationToken);
        return OperationResult<ProjectCardDto>.Success(ToCardDto(card));
    }

    public async Task<OperationResult<ProjectCardDto>> UpdateCardAsync(Guid userId, Guid cardId, UpdateProjectCardRequest request, CancellationToken cancellationToken = default)
    {
        var card = await _repository.GetCardAsync(userId, cardId, cancellationToken);
        if (card is null)
        {
            return OperationResult<ProjectCardDto>.Failure(ProjectError.NotFound());
        }

        var validation = ValidateCardUpdate(request);
        if (validation.Errors.Count > 0)
        {
            return OperationResult<ProjectCardDto>.Failure(ProjectError.Validation(validation.Errors));
        }

        card.Update(request.Title, request.Description, validation.Priority, validation.Deadline, request.Deadline == string.Empty);
        await _repository.UpdateCardAsync(card, cancellationToken);
        return OperationResult<ProjectCardDto>.Success(ToCardDto(card));
    }

    public async Task<OperationResult<ProjectCardDto>> MoveCardAsync(Guid userId, Guid cardId, MoveProjectCardRequest request, CancellationToken cancellationToken = default)
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
            return OperationResult<ProjectCardDto>.Failure(ProjectError.Validation(errors));
        }

        var card = await _repository.GetCardAsync(userId, cardId, cancellationToken);
        var targetColumn = await _repository.GetColumnForCardAsync(userId, request.ColumnId, cancellationToken);
        if (card is null || targetColumn is null)
        {
            return OperationResult<ProjectCardDto>.Failure(ProjectError.NotFound());
        }

        var fromColumnId = card.ColumnId;
        card.MoveToColumn(request.ColumnId, request.SortOrder);
        await _repository.UpdateCardAsync(card, cancellationToken);
        await _syncNotifier.CardMovedAsync(userId, targetColumn.BoardId, card.Id, fromColumnId, request.ColumnId, request.SortOrder, cancellationToken);
        return OperationResult<ProjectCardDto>.Success(ToCardDto(card));
    }

    public async Task<OperationResult<TrashEntryDto>> DeleteCardAsync(Guid userId, Guid cardId, CancellationToken cancellationToken = default)
    {
        if (_trashService is not null) return await _trashService.TrashProjectAsync(userId, cardId, cancellationToken);
        var card = await _repository.GetCardAsync(userId, cardId, cancellationToken);
        if (card is null)
        {
            return OperationResult<TrashEntryDto>.Failure(ProjectError.NotFound());
        }

        var nowUtc = DateTime.UtcNow;
        card.SoftDelete(nowUtc);
        await _repository.UpdateCardAsync(card, cancellationToken);
        return OperationResult<TrashEntryDto>.Success(new TrashEntryDto(Guid.Empty, "Project", card.Id, card.Title, "Project card", nowUtc, nowUtc.AddDays(30)));
    }

    private static (Dictionary<string, string[]> Errors, CardPriority Priority, DateTime? Deadline) ValidateCardCreate(CreateProjectCardRequest request)
    {
        var errors = ValidateCardCommon(request.Title, request.Description, request.Priority, request.Deadline, titleRequired: true, out var priority, out var deadline);
        if (request.ColumnId == Guid.Empty)
        {
            errors["columnId"] = ["Column id is required."];
        }

        return (errors, priority ?? CardPriority.Medium, deadline);
    }

    private static (Dictionary<string, string[]> Errors, CardPriority? Priority, DateTime? Deadline) ValidateCardUpdate(UpdateProjectCardRequest request)
    {
        var errors = ValidateCardCommon(request.Title, request.Description, request.Priority, request.Deadline, titleRequired: false, out var priority, out var deadline);
        return (errors, priority, deadline);
    }

    private static Dictionary<string, string[]> ValidateCardCommon(
        string? title,
        string? description,
        string? priorityText,
        string? deadlineText,
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

    private static ProjectBoardSummaryDto ToSummary(ProjectBoard board)
    {
        var activeColumns = board.Columns.Where(column => column.DeletedAt is null).ToList();
        return new ProjectBoardSummaryDto(
            board.Id,
            board.Name,
            activeColumns.Count,
            activeColumns.Sum(column => column.Cards.Count(card => card.DeletedAt is null)),
            board.CreatedAt,
            board.UpdatedAt);
    }

    private static ProjectBoardDetailDto ToDetail(ProjectBoard board)
    {
        return new ProjectBoardDetailDto(
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

    private static ProjectColumnDto ToColumnDto(ProjectColumn column)
    {
        return new ProjectColumnDto(
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

    private static ProjectCardDto ToCardDto(ProjectCard card)
    {
        return new ProjectCardDto(
            card.Id,
            card.ColumnId,
            card.Title,
            card.Description,
            card.Priority.ToString(),
            card.Deadline is null ? null : card.Deadline.Value.ToString(DateFormat, CultureInfo.InvariantCulture),
            card.SortOrder,
            card.CreatedAt,
            card.UpdatedAt);
    }
}
