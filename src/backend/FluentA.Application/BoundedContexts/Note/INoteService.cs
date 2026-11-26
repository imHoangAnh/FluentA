using FluentA.Application.BoundedContexts.Note.DTOs;
using FluentA.Application.Common;

namespace FluentA.Application.BoundedContexts.Note;

public interface INoteService
{
    Task<OperationResult<IReadOnlyList<NoteBoardSummaryDto>>> ListBoardsAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<OperationResult<NoteBoardSummaryDto>> CreateBoardAsync(Guid userId, CreateNoteBoardRequest request, CancellationToken cancellationToken = default);
    Task<OperationResult<NoteBoardSummaryDto>> UpdateBoardAsync(Guid userId, Guid boardId, UpdateNoteBoardRequest request, CancellationToken cancellationToken = default);
    Task<OperationResult<bool>> DeleteBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default);
    Task<OperationResult<NotePageDto>> CreatePageAsync(Guid userId, Guid boardId, CreateNotePageRequest request, CancellationToken cancellationToken = default);
    Task<OperationResult<NotePageDto>> GetPageAsync(Guid userId, Guid pageId, CancellationToken cancellationToken = default);
    Task<OperationResult<NotePageDto>> UpdatePageAsync(Guid userId, Guid pageId, UpdateNotePageRequest request, CancellationToken cancellationToken = default);
    Task<OperationResult<bool>> DeletePageAsync(Guid userId, Guid pageId, CancellationToken cancellationToken = default);
}
