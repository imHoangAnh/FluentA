using FluentA.Application.BoundedContexts.Vocabulary.DTOs;
using FluentA.Domain.BoundedContexts.Vocabulary.Entities;

namespace FluentA.Application.BoundedContexts.Vocabulary;

internal static class VocabularyDtoMapper
{
    private static readonly string[] FixedColumnOrder =
    [
        "word", "meaningVn", "ipaPronunciation", "definition", "class", "example", "note", "synonyms", "antonyms"
    ];
    public static BoardSummaryDto ToSummary(VocabBoard board)
    {
        return new BoardSummaryDto(
            board.Id,
            board.Name,
            board.Language,
            board.Pages.Count(page => page.DeletedAt is null),
            board.CreatedAt,
            board.UpdatedAt);
    }

    public static BoardDetailDto ToDetail(VocabBoard board, VocabBoardPreference? preferences)
    {
        return new BoardDetailDto(
            board.Id,
            board.Name,
            board.Language,
            ToPages(board),
            ToPreferences(preferences),
            board.CreatedAt,
            board.UpdatedAt);
    }

    private static IReadOnlyList<PageDto> ToPages(VocabBoard board)
    {
        return board.Pages
            .Where(page => page.DeletedAt is null)
            .OrderByDescending(page => page.CreatedAt)
            .ThenByDescending(page => page.Id)
            .Select(ToPage)
            .ToList();
    }

    public static PageDto ToPage(VocabPage page)
    {
        return new PageDto(page.Id, page.BoardId, page.Name, page.CreatedAt, page.UpdatedAt);
    }

    public static WordDto ToWord(VocabWord word)
    {
        return new WordDto(
            word.Id,
            word.PageId,
            word.Word,
            word.MeaningVn,
            word.IpaPronunciation,
            word.Class.ToString().ToLowerInvariant(),
            word.Definition,
            word.Example,
            word.Note,
            word.Synonyms,
            word.Antonyms,
            word.CreatedAt,
            word.UpdatedAt);
    }

    public static BoardPreferencesDto ToPreferences(VocabBoardPreference? preference)
    {
        if (preference is null)
        {
            return new BoardPreferencesDto(null, [], FixedColumnOrder, new Dictionary<string, int>(), null, null);
        }

        return new BoardPreferencesDto(
            preference.Id,
            preference.HiddenColumns,
            preference.ColumnOrder.Count == 0 ? FixedColumnOrder : preference.ColumnOrder,
            preference.ColumnWidths,
            preference.CreatedAt,
            preference.UpdatedAt);
    }
}

