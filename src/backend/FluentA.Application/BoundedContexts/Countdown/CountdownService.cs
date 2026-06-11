using System.Globalization;
using System.Text.RegularExpressions;
using FluentA.Application.BoundedContexts.Countdown.DTOs;
using FluentA.Application.Common;
using CountdownEventEntity = FluentA.Domain.BoundedContexts.Countdown.Entities.CountdownEvent;

namespace FluentA.Application.BoundedContexts.Countdown;

public sealed partial class CountdownService : ICountdownService
{
    private readonly ICountdownRepository _repository;

    public CountdownService(ICountdownRepository repository)
    {
        _repository = repository;
    }

    public async Task<OperationResult<IReadOnlyList<CountdownEventDto>>> ListAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var events = await _repository.ListAsync(userId, cancellationToken);
        return OperationResult<IReadOnlyList<CountdownEventDto>>.Success(events.Select(ToDto).ToList());
    }

    public async Task<OperationResult<CountdownEventDto>> CreateAsync(
        Guid userId,
        CreateCountdownEventRequest request,
        CancellationToken cancellationToken = default)
    {
        var validation = ValidateCreate(request);
        if (validation.Errors.Count > 0)
        {
            return OperationResult<CountdownEventDto>.Failure(CountdownError.Validation(validation.Errors));
        }

        var countdownEvent = CountdownEventEntity.Create(userId, request.Name, validation.TargetDate, request.Color, request.Icon);
        await _repository.AddAsync(countdownEvent, cancellationToken);
        return OperationResult<CountdownEventDto>.Success(ToDto(countdownEvent));
    }

    public async Task<OperationResult<CountdownEventDto>> UpdateAsync(
        Guid userId,
        Guid countdownId,
        UpdateCountdownEventRequest request,
        CancellationToken cancellationToken = default)
    {
        var countdownEvent = await _repository.GetAsync(userId, countdownId, cancellationToken);
        if (countdownEvent is null)
        {
            return OperationResult<CountdownEventDto>.Failure(CountdownError.NotFound());
        }

        var validation = ValidateUpdate(request);
        if (validation.Errors.Count > 0)
        {
            return OperationResult<CountdownEventDto>.Failure(CountdownError.Validation(validation.Errors));
        }

        if (request.Name is not null)
        {
            countdownEvent.Rename(request.Name);
        }

        if (validation.TargetDate is not null)
        {
            countdownEvent.Reschedule(validation.TargetDate.Value);
        }

        if (request.Color is not null)
        {
            countdownEvent.UpdateColor(request.Color);
        }

        if (request.Icon is not null)
        {
            countdownEvent.UpdateIcon(request.Icon);
        }

        await _repository.UpdateAsync(countdownEvent, cancellationToken);
        return OperationResult<CountdownEventDto>.Success(ToDto(countdownEvent));
    }

    public async Task<OperationResult<bool>> DeleteAsync(Guid userId, Guid countdownId, CancellationToken cancellationToken = default)
    {
        var countdownEvent = await _repository.GetAsync(userId, countdownId, cancellationToken);
        if (countdownEvent is null)
        {
            return OperationResult<bool>.Failure(CountdownError.NotFound());
        }

        countdownEvent.SoftDelete();
        await _repository.UpdateAsync(countdownEvent, cancellationToken);
        return OperationResult<bool>.Success(true);
    }

    private static (Dictionary<string, string[]> Errors, DateTime TargetDate) ValidateCreate(CreateCountdownEventRequest request)
    {
        var errors = ValidateNameColorIcon(request.Name, request.Color, request.Icon);
        if (!TryParseTargetDate(request.TargetDate, out var targetDate, out var targetDateErrors))
        {
            errors["targetDate"] = targetDateErrors["targetDate"];
        }

        return (errors, targetDate);
    }

    private static (Dictionary<string, string[]> Errors, DateTime? TargetDate) ValidateUpdate(UpdateCountdownEventRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        if (request.Name is not null)
        {
            Merge(errors, ValidateName(request.Name));
        }

        if (request.Color is not null)
        {
            Merge(errors, ValidateColor(request.Color));
        }

        if (request.Icon is not null)
        {
            Merge(errors, ValidateIcon(request.Icon));
        }

        DateTime? targetDate = null;
        if (request.TargetDate is not null)
        {
            if (TryParseTargetDate(request.TargetDate, out var parsed, out var targetDateErrors))
            {
                targetDate = parsed;
            }
            else
            {
                errors["targetDate"] = targetDateErrors["targetDate"];
            }
        }

        return (errors, targetDate);
    }

    private static Dictionary<string, string[]> ValidateNameColorIcon(string name, string? color, string? icon)
    {
        var errors = ValidateName(name);
        Merge(errors, ValidateColor(color));
        Merge(errors, ValidateIcon(icon));
        return errors;
    }

    private static Dictionary<string, string[]> ValidateName(string name)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(name))
        {
            errors["name"] = ["Name is required."];
        }
        else if (name.Trim().Length > 180)
        {
            errors["name"] = ["Name must be at most 180 characters."];
        }

        return errors;
    }

    private static Dictionary<string, string[]> ValidateColor(string? color)
    {
        var errors = new Dictionary<string, string[]>();
        if (!string.IsNullOrWhiteSpace(color) && !HexColorRegex().IsMatch(color.Trim()))
        {
            errors["color"] = ["Color must be a hex value like #4F46E5."];
        }

        return errors;
    }

    private static Dictionary<string, string[]> ValidateIcon(string? icon)
    {
        var errors = new Dictionary<string, string[]>();
        if (!string.IsNullOrWhiteSpace(icon) && icon.Trim().Length > 16)
        {
            errors["icon"] = ["Icon must be at most 16 characters."];
        }

        return errors;
    }

    private static bool TryParseTargetDate(string? value, out DateTime targetDate, out Dictionary<string, string[]> errors)
    {
        errors = [];
        if (!DateTimeOffset.TryParse(
            value,
            CultureInfo.InvariantCulture,
            DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
            out var parsed))
        {
            targetDate = default;
            errors["targetDate"] = ["targetDate must be an ISO date-time value."];
            return false;
        }

        targetDate = parsed.UtcDateTime;
        return true;
    }

    private static void Merge(Dictionary<string, string[]> target, Dictionary<string, string[]> source)
    {
        foreach (var (key, value) in source)
        {
            target[key] = value;
        }
    }

    private static CountdownEventDto ToDto(CountdownEventEntity countdownEvent)
    {
        return new CountdownEventDto(
            countdownEvent.Id,
            countdownEvent.Name,
            countdownEvent.TargetDate.ToString("O", CultureInfo.InvariantCulture),
            countdownEvent.Color,
            countdownEvent.Icon,
            countdownEvent.IsCompleted,
            countdownEvent.CreatedAt,
            countdownEvent.UpdatedAt);
    }

    [GeneratedRegex("^#[0-9a-fA-F]{6}$")]
    private static partial Regex HexColorRegex();
}
