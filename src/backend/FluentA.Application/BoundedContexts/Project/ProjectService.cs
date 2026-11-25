using FluentA.Application.BoundedContexts.Project.DTOs;
using FluentA.Application.Common;
using FluentA.Domain.BoundedContexts.Project.Entities;

namespace FluentA.Application.BoundedContexts.Project;

public sealed class ProjectService : IProjectService
{
    private readonly IProjectRepository _repository;

    public ProjectService(IProjectRepository repository)
    {
        _repository = repository;
    }

    public async Task<OperationResult<IReadOnlyList<ProjectBoardSummaryDto>>> ListBoardsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var boards = await _repository.ListBoardsAsync(userId, cancellationToken);
        return OperationResult<IReadOnlyList<ProjectBoardSummaryDto>>.Success(boards);
    }

    public async Task<OperationResult<ProjectBoardDetailDto>> CreateBoardAsync(Guid userId, CreateProjectBoardRequest request, CancellationToken cancellationToken = default)
    {
        var errors = ProjectRequestValidator.ValidateName(request.Name, "name", 180);
        if (errors.Count > 0)
        {
            return OperationResult<ProjectBoardDetailDto>.Failure(ProjectError.Validation(errors));
        }

        var board = ProjectBoard.Create(userId, request.Name);
        await _repository.AddBoardAsync(board, cancellationToken);
        return OperationResult<ProjectBoardDetailDto>.Success(ProjectDtoMapper.ToDetail(board));
    }

    public async Task<OperationResult<ProjectBoardDetailDto>> GetBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default)
    {
        var board = await _repository.GetBoardAsync(userId, boardId, cancellationToken);
        return board is null
            ? OperationResult<ProjectBoardDetailDto>.Failure(ProjectError.NotFound())
            : OperationResult<ProjectBoardDetailDto>.Success(ProjectDtoMapper.ToDetail(board));
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
            var errors = ProjectRequestValidator.ValidateName(request.Name, "name", 180);
            if (errors.Count > 0)
            {
                return OperationResult<ProjectBoardDetailDto>.Failure(ProjectError.Validation(errors));
            }

            board.Rename(request.Name);
        }

        await _repository.UpdateBoardAsync(board, cancellationToken);
        return OperationResult<ProjectBoardDetailDto>.Success(ProjectDtoMapper.ToDetail(board));
    }

    public async Task<OperationResult<bool>> DeleteBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default)
    {
        var board = await _repository.GetBoardAsync(userId, boardId, cancellationToken);
        if (board is null)
        {
            return OperationResult<bool>.Failure(ProjectError.NotFound());
        }

        var nowUtc = DateTime.UtcNow;
        board.SoftDelete(nowUtc);
        await _repository.UpdateBoardAsync(board, cancellationToken);
        return OperationResult<bool>.Success(true);
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

        var errors = ProjectRequestValidator.ValidateName(request.Name, "name", 180);
        if (errors.Count > 0)
        {
            return OperationResult<ProjectColumnDto>.Failure(ProjectError.Validation(errors));
        }

        var sortOrder = await _repository.NextColumnSortOrderAsync(boardId, cancellationToken);
        var column = ProjectColumn.Create(boardId, request.Name, sortOrder);
        await _repository.AddColumnAsync(column, cancellationToken);
        return OperationResult<ProjectColumnDto>.Success(ProjectDtoMapper.ToColumnDto(column));
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
            foreach (var error in ProjectRequestValidator.ValidateName(request.Name, "name", 180))
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
        return OperationResult<ProjectColumnDto>.Success(ProjectDtoMapper.ToColumnDto(column));
    }

    public async Task<OperationResult<bool>> DeleteColumnAsync(Guid userId, Guid boardId, Guid columnId, CancellationToken cancellationToken = default)
    {
        var column = await _repository.GetColumnAsync(userId, boardId, columnId, cancellationToken);
        if (column is null)
        {
            return OperationResult<bool>.Failure(ProjectError.NotFound());
        }

        if (column.HasActiveCards())
        {
            return OperationResult<bool>.Failure(ProjectError.ColumnNotEmpty());
        }

        var nowUtc = DateTime.UtcNow;
        column.SoftDelete(nowUtc);
        await _repository.UpdateColumnAsync(column, cancellationToken);
        return OperationResult<bool>.Success(true);
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

        var validation = ProjectRequestValidator.ValidateCardCreate(request);
        if (validation.Errors.Count > 0)
        {
            return OperationResult<ProjectCardDto>.Failure(ProjectError.Validation(validation.Errors));
        }

        if (request.MilestoneId is Guid milestoneId)
        {
            var milestone = await _repository.GetMilestoneAsync(userId, boardId, milestoneId, cancellationToken);
            if (milestone is null)
            {
                return OperationResult<ProjectCardDto>.Failure(ProjectError.Validation(new Dictionary<string, string[]>
                {
                    ["milestoneId"] = ["Selected milestone does not exist on this board."],
                }));
            }
        }

        if (request.LabelId is Guid labelId)
        {
            var label = await _repository.GetLabelAsync(userId, boardId, labelId, cancellationToken);
            if (label is null)
            {
                return OperationResult<ProjectCardDto>.Failure(ProjectError.Validation(new Dictionary<string, string[]>
                {
                    ["labelId"] = ["Selected label does not exist on this board."],
                }));
            }
        }

        var sortOrder = await _repository.NextCardSortOrderAsync(column.Id, cancellationToken);
        var card = ProjectCard.Create(
            column.Id,
            request.Title,
            request.Description,
            validation.Priority,
            validation.Deadline,
            sortOrder,
            request.MilestoneId,
            request.LabelId);
        await _repository.AddCardAsync(card, cancellationToken);

        if (request.ChecklistTitles is { Count: > 0 })
        {
            var items = request.ChecklistTitles
                .Select((title, index) => ProjectCardChecklistItem.Create(card.Id, title, index))
                .ToList();
            await _repository.AddChecklistItemsAsync(items, cancellationToken);
        }

        var refreshed = await _repository.GetCardAsync(userId, card.Id, cancellationToken) ?? card;
        return OperationResult<ProjectCardDto>.Success(ProjectDtoMapper.ToCardDto(refreshed));
    }

    public async Task<OperationResult<ProjectCardDto>> UpdateCardAsync(Guid userId, Guid cardId, UpdateProjectCardRequest request, CancellationToken cancellationToken = default)
    {
        var card = await _repository.GetCardAsync(userId, cardId, cancellationToken);
        if (card is null)
        {
            return OperationResult<ProjectCardDto>.Failure(ProjectError.NotFound());
        }

        var validation = ProjectRequestValidator.ValidateCardUpdate(request);
        if (validation.Errors.Count > 0)
        {
            return OperationResult<ProjectCardDto>.Failure(ProjectError.Validation(validation.Errors));
        }

        if (request.IsMilestoneIdSpecified || request.IsLabelIdSpecified)
        {
            var boardId = await _repository.GetBoardIdForCardAsync(userId, cardId, cancellationToken);
            if (boardId is null)
            {
                return OperationResult<ProjectCardDto>.Failure(ProjectError.NotFound());
            }

            if (request.IsMilestoneIdSpecified && request.MilestoneId is Guid milestoneId)
            {
                var milestone = await _repository.GetMilestoneAsync(userId, boardId.Value, milestoneId, cancellationToken);
                if (milestone is null)
                {
                    return OperationResult<ProjectCardDto>.Failure(ProjectError.Validation(new Dictionary<string, string[]>
                    {
                        ["milestoneId"] = ["Selected milestone does not exist on this board."],
                    }));
                }
            }

            if (request.IsLabelIdSpecified && request.LabelId is Guid labelId)
            {
                var label = await _repository.GetLabelAsync(userId, boardId.Value, labelId, cancellationToken);
                if (label is null)
                {
                    return OperationResult<ProjectCardDto>.Failure(ProjectError.Validation(new Dictionary<string, string[]>
                    {
                        ["labelId"] = ["Selected label does not exist on this board."],
                    }));
                }
            }
        }

        card.Update(request.Title, request.Description, validation.Priority, validation.Deadline, request.Deadline == string.Empty);
        if (request.IsMilestoneIdSpecified)
        {
            card.SetMilestone(request.MilestoneId);
        }

        if (request.IsLabelIdSpecified)
        {
            card.SetLabel(request.LabelId);
        }

        await _repository.UpdateCardAsync(card, cancellationToken);
        var refreshed = await _repository.GetCardAsync(userId, card.Id, cancellationToken) ?? card;
        return OperationResult<ProjectCardDto>.Success(ProjectDtoMapper.ToCardDto(refreshed));
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

        card.MoveToColumn(request.ColumnId, request.SortOrder);
        await _repository.UpdateCardAsync(card, cancellationToken);
        return OperationResult<ProjectCardDto>.Success(ProjectDtoMapper.ToCardDto(card));
    }

    public async Task<OperationResult<bool>> DeleteCardAsync(Guid userId, Guid cardId, CancellationToken cancellationToken = default)
    {
        var card = await _repository.GetCardAsync(userId, cardId, cancellationToken);
        if (card is null)
        {
            return OperationResult<bool>.Failure(ProjectError.NotFound());
        }

        var nowUtc = DateTime.UtcNow;
        card.SoftDelete(nowUtc);
        await _repository.UpdateCardAsync(card, cancellationToken);
        return OperationResult<bool>.Success(true);
    }

    public async Task<OperationResult<ProjectMilestoneDto>> CreateMilestoneAsync(
        Guid userId,
        Guid boardId,
        CreateProjectMilestoneRequest request,
        CancellationToken cancellationToken = default)
    {
        var board = await _repository.GetBoardAsync(userId, boardId, cancellationToken);
        if (board is null)
        {
            return OperationResult<ProjectMilestoneDto>.Failure(ProjectError.NotFound());
        }

        var errors = ProjectRequestValidator.ValidateName(request.Name, "name", 120);
        if (errors.Count > 0)
        {
            return OperationResult<ProjectMilestoneDto>.Failure(ProjectError.Validation(errors));
        }

        var normalizedName = request.Name.Trim().ToLowerInvariant();
        if (await _repository.MilestoneNameExistsAsync(boardId, normalizedName, cancellationToken: cancellationToken))
        {
            return OperationResult<ProjectMilestoneDto>.Failure(
                ProjectError.Conflict("PROJECT_MILESTONE_DUPLICATE", "A milestone with this name already exists."));
        }

        var sortOrder = await _repository.NextMilestoneSortOrderAsync(boardId, cancellationToken);
        var milestone = ProjectMilestone.Create(boardId, request.Name, sortOrder);
        await _repository.AddMilestoneAsync(milestone, cancellationToken);
        return OperationResult<ProjectMilestoneDto>.Success(ProjectDtoMapper.ToMilestoneDto(milestone));
    }

    public async Task<OperationResult<ProjectMilestoneDto>> UpdateMilestoneAsync(
        Guid userId,
        Guid boardId,
        Guid milestoneId,
        UpdateProjectMilestoneRequest request,
        CancellationToken cancellationToken = default)
    {
        var milestone = await _repository.GetMilestoneAsync(userId, boardId, milestoneId, cancellationToken);
        if (milestone is null)
        {
            return OperationResult<ProjectMilestoneDto>.Failure(
                ProjectError.NotFound("PROJECT_MILESTONE_NOT_FOUND", "The requested milestone could not be found."));
        }

        var errors = new Dictionary<string, string[]>();
        if (request.Name is not null)
        {
            foreach (var error in ProjectRequestValidator.ValidateName(request.Name, "name", 120))
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
            return OperationResult<ProjectMilestoneDto>.Failure(ProjectError.Validation(errors));
        }

        if (request.Name is not null)
        {
            var normalizedName = request.Name.Trim().ToLowerInvariant();
            if (await _repository.MilestoneNameExistsAsync(boardId, normalizedName, milestoneId, cancellationToken))
            {
                return OperationResult<ProjectMilestoneDto>.Failure(
                    ProjectError.Conflict("PROJECT_MILESTONE_DUPLICATE", "A milestone with this name already exists."));
            }

            milestone.Rename(request.Name);
        }

        if (request.SortOrder is not null)
        {
            milestone.Reorder(request.SortOrder.Value);
        }

        await _repository.UpdateMilestoneAsync(milestone, cancellationToken);
        return OperationResult<ProjectMilestoneDto>.Success(ProjectDtoMapper.ToMilestoneDto(milestone));
    }

    public async Task<OperationResult<bool>> DeleteMilestoneAsync(
        Guid userId,
        Guid boardId,
        Guid milestoneId,
        CancellationToken cancellationToken = default)
    {
        if (!await _repository.SoftDeleteMilestoneAsync(userId, boardId, milestoneId, DateTime.UtcNow, cancellationToken))
        {
            return OperationResult<bool>.Failure(
                ProjectError.NotFound("PROJECT_MILESTONE_NOT_FOUND", "The requested milestone could not be found."));
        }

        return OperationResult<bool>.Success(true);
    }

    public async Task<OperationResult<ProjectLabelDto>> CreateLabelAsync(
        Guid userId,
        Guid boardId,
        CreateProjectLabelRequest request,
        CancellationToken cancellationToken = default)
    {
        var board = await _repository.GetBoardAsync(userId, boardId, cancellationToken);
        if (board is null)
        {
            return OperationResult<ProjectLabelDto>.Failure(ProjectError.NotFound());
        }

        var errors = ProjectRequestValidator.ValidateLabelCreate(request);
        if (errors.Count > 0)
        {
            return OperationResult<ProjectLabelDto>.Failure(ProjectError.Validation(errors));
        }

        var normalizedName = request.Name.Trim().ToLowerInvariant();
        if (await _repository.LabelNameExistsAsync(boardId, normalizedName, cancellationToken: cancellationToken))
        {
            return OperationResult<ProjectLabelDto>.Failure(
                ProjectError.Conflict("PROJECT_LABEL_DUPLICATE", "A label with this name already exists."));
        }

        var label = ProjectLabel.Create(boardId, request.Name, request.Tone);
        await _repository.AddLabelAsync(label, cancellationToken);
        return OperationResult<ProjectLabelDto>.Success(ProjectDtoMapper.ToLabelDto(label));
    }

    public async Task<OperationResult<ProjectLabelDto>> UpdateLabelAsync(
        Guid userId,
        Guid boardId,
        Guid labelId,
        UpdateProjectLabelRequest request,
        CancellationToken cancellationToken = default)
    {
        var label = await _repository.GetLabelAsync(userId, boardId, labelId, cancellationToken);
        if (label is null)
        {
            return OperationResult<ProjectLabelDto>.Failure(
                ProjectError.NotFound("PROJECT_LABEL_NOT_FOUND", "The requested label could not be found."));
        }

        var errors = ProjectRequestValidator.ValidateLabelUpdate(request);
        if (errors.Count > 0)
        {
            return OperationResult<ProjectLabelDto>.Failure(ProjectError.Validation(errors));
        }

        if (request.Name is not null)
        {
            var normalizedName = request.Name.Trim().ToLowerInvariant();
            if (await _repository.LabelNameExistsAsync(boardId, normalizedName, labelId, cancellationToken))
            {
                return OperationResult<ProjectLabelDto>.Failure(
                    ProjectError.Conflict("PROJECT_LABEL_DUPLICATE", "A label with this name already exists."));
            }

            label.Rename(request.Name);
        }

        if (request.Tone is not null)
        {
            label.SetTone(request.Tone);
        }

        await _repository.UpdateLabelAsync(label, cancellationToken);
        return OperationResult<ProjectLabelDto>.Success(ProjectDtoMapper.ToLabelDto(label));
    }

    public async Task<OperationResult<bool>> DeleteLabelAsync(
        Guid userId,
        Guid boardId,
        Guid labelId,
        CancellationToken cancellationToken = default)
    {
        if (!await _repository.SoftDeleteLabelAsync(userId, boardId, labelId, DateTime.UtcNow, cancellationToken))
        {
            return OperationResult<bool>.Failure(
                ProjectError.NotFound("PROJECT_LABEL_NOT_FOUND", "The requested label could not be found."));
        }

        return OperationResult<bool>.Success(true);
    }

    public async Task<OperationResult<ProjectCardChecklistItemDto>> CreateChecklistItemAsync(
        Guid userId,
        Guid cardId,
        CreateProjectChecklistItemRequest request,
        CancellationToken cancellationToken = default)
    {
        var card = await _repository.GetCardAsync(userId, cardId, cancellationToken);
        if (card is null)
        {
            return OperationResult<ProjectCardChecklistItemDto>.Failure(ProjectError.NotFound());
        }

        var errors = ProjectRequestValidator.ValidateName(request.Title, "title", 240);
        if (errors.Count > 0)
        {
            return OperationResult<ProjectCardChecklistItemDto>.Failure(ProjectError.Validation(errors));
        }

        var sortOrder = await _repository.NextChecklistSortOrderAsync(cardId, cancellationToken);
        var item = ProjectCardChecklistItem.Create(cardId, request.Title, sortOrder);
        await _repository.AddChecklistItemAsync(item, cancellationToken);
        return OperationResult<ProjectCardChecklistItemDto>.Success(ProjectDtoMapper.ToChecklistItemDto(item));
    }

    public async Task<OperationResult<ProjectCardChecklistItemDto>> UpdateChecklistItemAsync(
        Guid userId,
        Guid cardId,
        Guid itemId,
        UpdateProjectChecklistItemRequest request,
        CancellationToken cancellationToken = default)
    {
        var item = await _repository.GetChecklistItemAsync(userId, cardId, itemId, cancellationToken);
        if (item is null)
        {
            return OperationResult<ProjectCardChecklistItemDto>.Failure(
                ProjectError.NotFound("PROJECT_CHECKLIST_ITEM_NOT_FOUND", "The requested checklist item could not be found."));
        }

        var errors = new Dictionary<string, string[]>();
        if (request.Title is not null)
        {
            foreach (var error in ProjectRequestValidator.ValidateName(request.Title, "title", 240))
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
            return OperationResult<ProjectCardChecklistItemDto>.Failure(ProjectError.Validation(errors));
        }

        if (request.Title is not null)
        {
            item.Rename(request.Title);
        }

        if (request.IsCompleted is not null)
        {
            item.SetCompleted(request.IsCompleted.Value);
        }

        if (request.SortOrder is not null)
        {
            item.Reorder(request.SortOrder.Value);
        }

        await _repository.UpdateChecklistItemAsync(item, cancellationToken);
        return OperationResult<ProjectCardChecklistItemDto>.Success(ProjectDtoMapper.ToChecklistItemDto(item));
    }

    public async Task<OperationResult<bool>> DeleteChecklistItemAsync(
        Guid userId,
        Guid cardId,
        Guid itemId,
        CancellationToken cancellationToken = default)
    {
        if (!await _repository.SoftDeleteChecklistItemAsync(userId, cardId, itemId, DateTime.UtcNow, cancellationToken))
        {
            return OperationResult<bool>.Failure(
                ProjectError.NotFound("PROJECT_CHECKLIST_ITEM_NOT_FOUND", "The requested checklist item could not be found."));
        }

        return OperationResult<bool>.Success(true);
    }
}
