using FluentA.Application.BoundedContexts.Vocabulary.DTOs;
using FluentA.Domain.BoundedContexts.Vocabulary.Entities;

namespace FluentA.Application.BoundedContexts.Vocabulary;

internal static class VocabularyDtoMapper
{
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
            word.Meaning,
            word.IpaPronunciation,
            word.Type.ToString().ToLowerInvariant(),
            word.Context,
            word.Example,
            word.Synonyms,
            word.Antonyms,
            word.CreatedAt,
            word.UpdatedAt);
    }

    public static BoardPreferencesDto ToPreferences(VocabBoardPreference? preference)
    {
        if (preference is null)
        {
            return new BoardPreferencesDto(null, [], VocabularyRequestValidator.FixedColumnOrder, new Dictionary<string, int>(), null, null);
        }

        return new BoardPreferencesDto(
            preference.Id,
            NormalizeHiddenColumns(preference.HiddenColumns),
            NormalizeColumnOrder(preference.ColumnOrder),
            NormalizeColumnWidths(preference.ColumnWidths),
            preference.CreatedAt,
            preference.UpdatedAt);
    }

    private static IReadOnlyList<string> NormalizeHiddenColumns(IEnumerable<string> columns)
    {
        return columns
            .Select(NormalizeColumnKey)
            .Where(key => key is "context" or "synonyms" or "antonyms")
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static IReadOnlyList<string> NormalizeColumnOrder(IEnumerable<string> columns)
    {
        var normalized = columns
            .Select(NormalizeColumnKey)
            .Where(key => VocabularyRequestValidator.FixedColumnOrder.Contains(key, StringComparer.OrdinalIgnoreCase))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        normalized.AddRange(VocabularyRequestValidator.FixedColumnOrder
            .Where(key => !normalized.Contains(key, StringComparer.OrdinalIgnoreCase)));
        return normalized;
    }

    private static IReadOnlyDictionary<string, int> NormalizeColumnWidths(IReadOnlyDictionary<string, int> widths)
    {
        var normalized = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var pair in widths)
        {
            var key = NormalizeColumnKey(pair.Key);
            if (VocabularyRequestValidator.FixedColumnOrder.Contains(key, StringComparer.OrdinalIgnoreCase))
            {
                normalized[key] = pair.Value;
            }
        }

        return normalized;
    }

    private static string NormalizeColumnKey(string key)
    {
        var trimmed = key.Trim();
        return trimmed.ToLowerInvariant() switch
        {
            "meaningvn" => "meaning",
            "definition" => "context",
            "class" => "type",
            "note" => string.Empty,
            _ => VocabularyRequestValidator.FixedColumnOrder.FirstOrDefault(
                column => string.Equals(column, trimmed, StringComparison.OrdinalIgnoreCase)) ?? trimmed
        };
    }
}

