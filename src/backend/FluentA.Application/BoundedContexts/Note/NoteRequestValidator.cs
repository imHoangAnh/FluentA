using FluentA.Application.BoundedContexts.Note.DTOs;

namespace FluentA.Application.BoundedContexts.Note;

internal static class NoteRequestValidator
{
    public const int RawContentMaxLength = 1_000_000;

    public static NoteError? ValidateBoardName(string name)
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

    public static NoteError? ValidatePageFields(string? name, string? content)
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

        if (content is not null && content.Length > RawContentMaxLength)
        {
            errors["content"] = [$"Content payload must be at most {RawContentMaxLength} characters before formatting cleanup."];
        }

        return errors.Count > 0 ? NoteError.Validation(errors) : null;
    }
}

