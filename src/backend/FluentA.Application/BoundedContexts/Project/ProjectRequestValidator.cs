using System.Globalization;
using FluentA.Application.BoundedContexts.Project.DTOs;
using FluentA.Domain.BoundedContexts.Project.Enums;
using FluentA.Domain.BoundedContexts.Project.Entities;

namespace FluentA.Application.BoundedContexts.Project;

internal static class ProjectRequestValidator
{
    private const string DateFormat = "yyyy-MM-dd";
    public static (Dictionary<string, string[]> Errors, CardPriority Priority, DateTime? Deadline) ValidateCardCreate(CreateProjectCardRequest request)
    {
        var errors = ValidateCardCommon(request.Title, request.Description, request.Priority, request.Deadline, titleRequired: true, out var priority, out var deadline);
        if (request.ColumnId == Guid.Empty)
        {
            errors["columnId"] = ["Column id is required."];
        }

        return (errors, priority ?? CardPriority.Medium, deadline);
    }

    public static (Dictionary<string, string[]> Errors, CardPriority? Priority, DateTime? Deadline) ValidateCardUpdate(UpdateProjectCardRequest request)
    {
        var errors = ValidateCardCommon(request.Title, request.Description, request.Priority, request.Deadline, titleRequired: false, out var priority, out var deadline);
        return (errors, priority, deadline);
    }

    public static Dictionary<string, string[]> ValidateCardCommon(
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

    public static Dictionary<string, string[]> ValidateName(string name, string field, int maxLength)
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
}
