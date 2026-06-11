using System.Globalization;
using FluentA.Application.BoundedContexts.Journal.DTOs;
using FluentA.Application.Common;
using FluentA.Domain.BoundedContexts.Journal.Entities;

namespace FluentA.Application.BoundedContexts.Journal;

public sealed class JournalService : IJournalService
{
    private const string DateFormat = "yyyy-MM-dd";
    private readonly IJournalRepository _repository;

    public JournalService(IJournalRepository repository)
    {
        _repository = repository;
    }

    public async Task<OperationResult<IReadOnlyList<JournalEntrySummaryDto>>> ListAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var entries = await _repository.ListAsync(userId, cancellationToken);
        return OperationResult<IReadOnlyList<JournalEntrySummaryDto>>.Success(entries.Select(ToSummaryDto).ToList());
    }

    public async Task<OperationResult<JournalEntryDto>> GetAsync(
        Guid userId,
        Guid journalId,
        CancellationToken cancellationToken = default)
    {
        var entry = await _repository.GetAsync(userId, journalId, cancellationToken);
        return entry is null
            ? OperationResult<JournalEntryDto>.Failure(JournalError.NotFound())
            : OperationResult<JournalEntryDto>.Success(ToDto(entry));
    }

    public async Task<OperationResult<JournalEntryDto>> CreateAsync(
        Guid userId,
        CreateJournalEntryRequest request,
        CancellationToken cancellationToken = default)
    {
        var validation = ValidateCreate(request);
        if (validation.Errors.Count > 0)
        {
            return OperationResult<JournalEntryDto>.Failure(JournalError.Validation(validation.Errors));
        }

        var entry = JournalEntry.Create(userId, request.Title, request.Content, validation.LearningDate);
        await _repository.AddAsync(entry, cancellationToken);
        return OperationResult<JournalEntryDto>.Success(ToDto(entry));
    }

    public async Task<OperationResult<JournalEntryDto>> UpdateAsync(
        Guid userId,
        Guid journalId,
        UpdateJournalEntryRequest request,
        CancellationToken cancellationToken = default)
    {
        var entry = await _repository.GetAsync(userId, journalId, cancellationToken);
        if (entry is null)
        {
            return OperationResult<JournalEntryDto>.Failure(JournalError.NotFound());
        }

        var validation = ValidateUpdate(request);
        if (validation.Errors.Count > 0)
        {
            return OperationResult<JournalEntryDto>.Failure(JournalError.Validation(validation.Errors));
        }

        if (request.Title is not null)
        {
            entry.Rename(request.Title);
        }

        if (request.Content is not null)
        {
            entry.UpdateContent(request.Content);
        }

        if (request.LearningDate is not null)
        {
            entry.UpdateLearningDate(validation.LearningDate);
        }

        await _repository.UpdateAsync(entry, cancellationToken);
        return OperationResult<JournalEntryDto>.Success(ToDto(entry));
    }

    public async Task<OperationResult<bool>> DeleteAsync(
        Guid userId,
        Guid journalId,
        CancellationToken cancellationToken = default)
    {
        var entry = await _repository.GetAsync(userId, journalId, cancellationToken);
        if (entry is null)
        {
            return OperationResult<bool>.Failure(JournalError.NotFound());
        }

        entry.SoftDelete();
        await _repository.UpdateAsync(entry, cancellationToken);
        return OperationResult<bool>.Success(true);
    }

    private static (Dictionary<string, string[]> Errors, DateTime? LearningDate) ValidateCreate(CreateJournalEntryRequest request)
    {
        var errors = ValidateFields(request.Title, request.Content);
        var learningDate = ParseLearningDate(request.LearningDate, errors);
        return (errors, learningDate);
    }

    private static (Dictionary<string, string[]> Errors, DateTime? LearningDate) ValidateUpdate(UpdateJournalEntryRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        if (request.Title is not null)
        {
            Merge(errors, ValidateFields(request.Title, null));
        }

        if (request.Content?.Length > 100_000)
        {
            errors["content"] = ["Content must be at most 100000 characters."];
        }

        var learningDate = request.LearningDate is null ? null : ParseLearningDate(request.LearningDate, errors);
        return (errors, learningDate);
    }

    private static Dictionary<string, string[]> ValidateFields(string title, string? content)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(title))
        {
            errors["title"] = ["Title is required."];
        }
        else if (title.Trim().Length > 240)
        {
            errors["title"] = ["Title must be at most 240 characters."];
        }

        if (content?.Length > 100_000)
        {
            errors["content"] = ["Content must be at most 100000 characters."];
        }

        return errors;
    }

    private static DateTime? ParseLearningDate(string? value, Dictionary<string, string[]> errors)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        if (!DateTime.TryParseExact(value, DateFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
        {
            errors["learningDate"] = ["Learning date must be a date in YYYY-MM-DD format."];
            return null;
        }

        return DateTime.SpecifyKind(parsed.Date, DateTimeKind.Utc);
    }

    private static void Merge(Dictionary<string, string[]> target, Dictionary<string, string[]> source)
    {
        foreach (var (key, value) in source)
        {
            target[key] = value;
        }
    }

    private static JournalEntryDto ToDto(JournalEntry entry)
    {
        return new JournalEntryDto(
            entry.Id,
            entry.Title,
            entry.Content,
            entry.Preview,
            entry.LearningDate?.ToString(DateFormat, CultureInfo.InvariantCulture),
            entry.CreatedAt,
            entry.UpdatedAt);
    }

    private static JournalEntrySummaryDto ToSummaryDto(JournalEntryListItem entry)
    {
        return new JournalEntrySummaryDto(
            entry.Id,
            entry.Title,
            entry.Preview,
            entry.LearningDate?.ToString(DateFormat, CultureInfo.InvariantCulture),
            entry.CreatedAt,
            entry.UpdatedAt);
    }
}
