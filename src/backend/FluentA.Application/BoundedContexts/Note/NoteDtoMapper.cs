using System.Globalization;
using FluentA.Application.BoundedContexts.Note.DTOs;
using FluentA.Domain.BoundedContexts.Note.Entities;

namespace FluentA.Application.BoundedContexts.Note;

internal static class NoteDtoMapper
{
    private const string DateFormat = "yyyy-MM-dd";
    public static NoteBoardSummaryDto ToBoardSummaryDto(NoteBoard board)
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

    public static NotePageSummaryDto ToPageSummaryDto(NotePage page)
    {
        return new NotePageSummaryDto(
            page.Id,
            page.BoardId,
            page.Name,
            page.Date.ToString(DateFormat, CultureInfo.InvariantCulture),
            page.CreatedAt,
            page.UpdatedAt);
    }
}
