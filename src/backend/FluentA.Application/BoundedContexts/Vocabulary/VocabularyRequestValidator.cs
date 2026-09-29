using FluentA.Application.BoundedContexts.Vocabulary.DTOs;
using FluentA.Domain.BoundedContexts.Vocabulary.Entities;

namespace FluentA.Application.BoundedContexts.Vocabulary;

internal static class VocabularyRequestValidator
{
    private static readonly HashSet<string> HideableColumns = ["context", "synonyms", "antonyms"];
    internal static IReadOnlyList<string> FixedColumnOrder { get; } = Array.AsReadOnly(
        new[] { "word", "meaning", "ipaPronunciation", "context", "type", "example", "synonyms", "antonyms" });

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

    public static Dictionary<string, string[]> ValidateCreateBoard(CreateBoardRequest request)
    {
        var errors = ValidateBoard(request.Name, request.Language);
        ValidateIncludedOptionalColumns(errors, request.IncludedOptionalColumns);

        return errors;
    }

    public static Dictionary<string, string[]> ValidateUpdateBoard(UpdateBoardRequest request)
    {
        var errors = ValidateBoard(request.Name, request.Language);
        ValidateIncludedOptionalColumns(errors, request.IncludedOptionalColumns);

        return errors;
    }

    private static void ValidateIncludedOptionalColumns(Dictionary<string, string[]> errors, IReadOnlyList<string>? includedOptionalColumns)
    {
        if (includedOptionalColumns is not null
            && includedOptionalColumns.Any(key =>
                string.IsNullOrWhiteSpace(key) || !HideableColumns.Contains(key.Trim())))
        {
            errors["includedOptionalColumns"] = ["Only optional vocabulary columns may be selected."];
        }
    }

    public static IReadOnlyList<string> GetHiddenOptionalColumns(IReadOnlyList<string> includedOptionalColumns)
    {
        var included = includedOptionalColumns
            .Select(key => key.Trim())
            .ToHashSet(StringComparer.Ordinal);
        return HideableColumns.Where(key => !included.Contains(key)).ToList();
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

    public static (Dictionary<string, string[]> Errors, WordType? WordType) ValidateWord(WordRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        ValidateRequired(errors, "word", request.Word, 240);
        ValidateRequired(errors, "meaning", request.Meaning, 1000);
        ValidateRequired(errors, "ipaPronunciation", request.IpaPronunciation, 2000);
        ValidateOptional(errors, "context", request.Context, 4000);
        ValidateRequired(errors, "example", request.Example, 2000);
        ValidateOptional(errors, "synonyms", request.Synonyms, 2000);
        ValidateOptional(errors, "antonyms", request.Antonyms, 2000);

        WordType? wordType = null;
        if (TryParseWordType(request.Type, out var parsedType))
        {
            wordType = parsedType;
        }
        else
        {
            errors["type"] = ["Type must be a supported vocabulary type."];
        }

        return (errors, wordType);
    }

    public static (Dictionary<string, string[]> Errors, WordType? WordType) ValidateWordPatch(WordPatchRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        ValidateIfProvided(errors, "word", request.Word, 240);
        ValidateIfProvided(errors, "meaning", request.Meaning, 1000);
        ValidateIfProvided(errors, "ipaPronunciation", request.IpaPronunciation, 2000);
        ValidateOptional(errors, "context", request.Context, 4000);
        ValidateIfProvided(errors, "example", request.Example, 2000);
        ValidateOptional(errors, "synonyms", request.Synonyms, 2000);
        ValidateOptional(errors, "antonyms", request.Antonyms, 2000);

        WordType? wordType = null;
        if (request.Type is not null)
        {
            if (TryParseWordType(request.Type, out var parsedType))
            {
                wordType = parsedType;
            }
            else
            {
                errors["type"] = ["Type must be a supported vocabulary type."];
            }
        }

        return (errors, wordType);
    }

    private static bool TryParseWordType(string? value, out WordType wordType)
    {
        var normalizedValue = value?.Trim().ToLowerInvariant() switch
        {
            "adj" => nameof(WordType.Adjective),
            "adv" => nameof(WordType.Adverb),
            "proverb" => nameof(WordType.Expression),
            _ => value
        };

        return Enum.TryParse(normalizedValue, true, out wordType) && Enum.IsDefined(wordType);
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
        if (columnOrder.Count != FixedColumnOrder.Count
            || columnOrder.Distinct(StringComparer.OrdinalIgnoreCase).Count() != FixedColumnOrder.Count
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

    private static void ValidateIfProvided(Dictionary<string, string[]> errors, string field, string? value, int maxLength)
    {
        if (value is not null)
        {
            ValidateRequired(errors, field, value, maxLength);
        }
    }
}
