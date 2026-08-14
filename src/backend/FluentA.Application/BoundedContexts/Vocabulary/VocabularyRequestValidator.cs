using FluentA.Application.BoundedContexts.Vocabulary.DTOs;
using FluentA.Domain.BoundedContexts.Vocabulary.Entities;

namespace FluentA.Application.BoundedContexts.Vocabulary;

internal static class VocabularyRequestValidator
{
    private static readonly HashSet<string> HideableColumns = ["definition", "note", "synonyms", "antonyms"];
    private static readonly string[] FixedColumnOrder = ["word", "meaningVn", "ipaPronunciation", "definition", "class", "example", "note", "synonyms", "antonyms"];
    public static Dictionary<string, string[]> ValidateBoard(string? name, string? language)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(name) || name.Trim().Length > 120)
        {
            errors["name"] = ["Board name must be between 1 and 120 characters."];
        }

        var cleanLanguage = language?.Trim() ?? string.Empty;
        if (cleanLanguage.Length is < 2 or > 8)
        {
            errors["language"] = ["Language must be a 2-8 character code."];
        }

        return errors;
    }

    public static Dictionary<string, string[]> ValidatePage(string? name)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(name) || name.Trim().Length > 120)
        {
            errors["name"] = ["Page name must be between 1 and 120 characters."];
        }

        return errors;
    }

    public static (Dictionary<string, string[]> Errors, WordClass? WordClass) ValidateWord(WordRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        ValidateRequired(errors, "word", request.Word, 240);
        ValidateRequired(errors, "meaningVn", request.MeaningVn, 1000);
        ValidateRequired(errors, "ipaPronunciation", request.IpaPronunciation, 2000);
        ValidateOptional(errors, "definition", request.Definition, 4000);
        ValidateRequired(errors, "example", request.Example, 2000);
        ValidateOptional(errors, "note", request.Note, 4000);
        ValidateOptional(errors, "synonyms", request.Synonyms, 2000);
        ValidateOptional(errors, "antonyms", request.Antonyms, 2000);

        WordClass? wordClass = null;
        if (Enum.TryParse<WordClass>(request.Class, true, out var parsedClass) && Enum.IsDefined(parsedClass))
        {
            wordClass = parsedClass;
        }
        else
        {
            errors["class"] = ["Class must be noun, verb, adj, adv, phrase, or other."];
        }

        return (errors, wordClass);
    }

    public static Dictionary<string, string[]> ValidatePreferences(UpdateBoardPreferencesRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        var hiddenColumns = request.HiddenColumns
            .Select(key => key.Trim())
            .Where(key => key.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        if (hiddenColumns.Any(key => !HideableColumns.Contains(key)))
        {
            errors["hiddenColumns"] = ["Only nullable fixed columns may be hidden."];
        }

        var columnOrder = request.ColumnOrder
            .Select(key => key.Trim())
            .Where(key => key.Length > 0)
            .ToList();
        if (columnOrder.Count != FixedColumnOrder.Length
            || columnOrder.Distinct(StringComparer.OrdinalIgnoreCase).Count() != FixedColumnOrder.Length
            || FixedColumnOrder.Except(columnOrder, StringComparer.OrdinalIgnoreCase).Any()
            || columnOrder.Except(FixedColumnOrder, StringComparer.OrdinalIgnoreCase).Any())
        {
            errors["columnOrder"] = ["Column order must include each fixed column exactly once."];
        }

        if (request.ColumnWidths.Any(pair =>
                !FixedColumnOrder.Contains(pair.Key, StringComparer.OrdinalIgnoreCase)
                || pair.Value < 80
                || pair.Value > 1200))
        {
            errors["columnWidths"] = ["Column widths must target fixed columns only and stay between 80 and 1200 pixels."];
        }

        return errors;
    }

    public static void ValidateRequired(Dictionary<string, string[]> errors, string field, string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Trim().Length > maxLength)
        {
            errors[field] = [$"{field} must be between 1 and {maxLength} characters."];
        }
    }

    public static void ValidateOptional(Dictionary<string, string[]> errors, string field, string? value, int maxLength)
    {
        if (!string.IsNullOrWhiteSpace(value) && value.Trim().Length > maxLength)
        {
            errors[field] = [$"{field} must be at most {maxLength} characters."];
        }
    }
}
