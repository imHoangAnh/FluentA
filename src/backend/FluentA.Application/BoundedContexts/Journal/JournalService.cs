using System.Globalization;
using FluentA.Application.BoundedContexts.Journal.DTOs;
using FluentA.Application.Common;
using FluentA.Domain.BoundedContexts.Journal.Entities;
using FluentA.Application.BoundedContexts.Trash;

namespace FluentA.Application.BoundedContexts.Journal;

public sealed class JournalService : IJournalService
{
    private const string DateFormat = "yyyy-MM-dd";
    private const string MonthFormat = "yyyy-MM";
    private const int SearchQueryMaxLength = 100;
    private readonly IJournalRepository _repository;
    private readonly IJournalContentProcessor _contentProcessor;
    private readonly ITrashService? _trash;

    public JournalService(IJournalRepository repository, IJournalContentProcessor contentProcessor, ITrashService? trash = null)
    {
        _repository = repository;
        _contentProcessor = contentProcessor;
        _trash = trash;
    }

    public async Task<OperationResult<IReadOnlyList<JournalEntrySummaryDto>>> ListAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var entries = await _repository.ListAsync(userId, cancellationToken);
        return OperationResult<IReadOnlyList<JournalEntrySummaryDto>>.Success(entries.Select(ToSummaryDto).ToList());
    }

    public async Task<OperationResult<IReadOnlyList<JournalSearchResultDto>>> SearchAsync(
        Guid userId,
        string? query,
        CancellationToken cancellationToken = default)
    {
        var cleanedQuery = query?.Trim() ?? string.Empty;
        if (cleanedQuery.Length is < 1 or > SearchQueryMaxLength)
        {
            return OperationResult<IReadOnlyList<JournalSearchResultDto>>.Failure(
                JournalError.Validation(new Dictionary<string, string[]>
                {
                    ["q"] = [$"Search query must contain between 1 and {SearchQueryMaxLength} characters."]
                }));
        }

        var entries = await _repository.SearchAsync(userId, cleanedQuery, cancellationToken);
        return OperationResult<IReadOnlyList<JournalSearchResultDto>>.Success(entries.Select(entry => ToSearchDto(entry, cleanedQuery)).ToList());
    }

    public async Task<OperationResult<IReadOnlyList<JournalCalendarDayDto>>> CalendarAsync(
        Guid userId,
        string? month,
        CancellationToken cancellationToken = default)
    {
        var errors = new Dictionary<string, string[]>();
        var monthStart = ParseMonth(month, errors);
        if (errors.Count > 0)
        {
            return OperationResult<IReadOnlyList<JournalCalendarDayDto>>.Failure(JournalError.Validation(errors));
        }

        var monthEnd = monthStart.AddMonths(1);
        var days = await _repository.CalendarAsync(userId, monthStart, monthEnd, cancellationToken);
        return OperationResult<IReadOnlyList<JournalCalendarDayDto>>.Success(days
            .Select(day => new JournalCalendarDayDto(day.Date.ToString(DateFormat, CultureInfo.InvariantCulture), day.Count))
            .ToList());
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

        var content = _contentProcessor.Process(request.Content);
        var entry = JournalEntry.Create(userId, request.Title, validation.Date, content.Html);
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
            var content = _contentProcessor.Process(request.Content);
            entry.UpdateContent(content.Html);
        }

        if (validation.Date is not null)
        {
            entry.UpdateDate(validation.Date.Value);
        }

        await _repository.UpdateAsync(entry, cancellationToken);
        return OperationResult<JournalEntryDto>.Success(ToDto(entry));
    }

    public async Task<OperationResult<TrashEntryDto>> DeleteAsync(
        Guid userId,
        Guid journalId,
        CancellationToken cancellationToken = default)
    {
        if (_trash is not null) return await _trash.TrashJournalAsync(userId, journalId, cancellationToken);
        var entry = await _repository.GetAsync(userId, journalId, cancellationToken);
        if (entry is null)
        {
            return OperationResult<TrashEntryDto>.Failure(JournalError.NotFound());
        }

        entry.SoftDelete();
        await _repository.UpdateAsync(entry, cancellationToken);
        return OperationResult<TrashEntryDto>.Success(new TrashEntryDto(Guid.Empty, "Journal", entry.Id, entry.Title, entry.Date.ToString("yyyy-MM-dd"), DateTime.UtcNow, DateTime.UtcNow));
    }

    private static (Dictionary<string, string[]> Errors, DateTime Date) ValidateCreate(CreateJournalEntryRequest request)
    {
        var errors = ValidateFields(request.Title, request.Content);
        var date = ParseDate(request.Date, "date", errors);
        return (errors, date);
    }

    private static (Dictionary<string, string[]> Errors, DateTime? Date) ValidateUpdate(UpdateJournalEntryRequest request)
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

        DateTime? date = null;
        if (request.Date is not null)
        {
            date = ParseDate(request.Date, "date", errors);
        }

        return (errors, date);
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

    private static DateTime ParseDate(string? value, string field, Dictionary<string, string[]> errors)
    {
        if (string.IsNullOrWhiteSpace(value) ||
            !DateTime.TryParseExact(value, DateFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
        {
            errors[field] = [$"{field} must be a date in YYYY-MM-DD format."];
            return DateTime.MinValue;
        }

        return DateTime.SpecifyKind(parsed.Date, DateTimeKind.Utc);
    }

    private static DateTime ParseMonth(string? value, Dictionary<string, string[]> errors)
    {
        if (string.IsNullOrWhiteSpace(value) ||
            !DateTime.TryParseExact(value, MonthFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
        {
            errors["month"] = ["Month must be in YYYY-MM format."];
            return DateTime.MinValue;
        }

        return DateTime.SpecifyKind(new DateTime(parsed.Year, parsed.Month, 1), DateTimeKind.Utc);
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
            entry.Date.ToString(DateFormat, CultureInfo.InvariantCulture),
            entry.CreatedAt,
            entry.UpdatedAt);
    }

    private static JournalEntrySummaryDto ToSummaryDto(JournalEntryListItem entry)
    {
        return new JournalEntrySummaryDto(
            entry.Id,
            entry.Title,
            entry.Date.ToString(DateFormat, CultureInfo.InvariantCulture),
            entry.CreatedAt,
            entry.UpdatedAt);
    }

    private static JournalSearchResultDto ToSearchDto(JournalEntrySearchItem entry, string query)
    {
        var matchIndex = entry.Title.IndexOf(query, StringComparison.OrdinalIgnoreCase);
        var highlights = matchIndex >= 0
            ? new List<JournalHighlightRangeDto> { new(matchIndex, query.Length) }
            : [];

        return new JournalSearchResultDto(
            entry.Id,
            entry.Title,
            highlights,
            entry.Date.ToString(DateFormat, CultureInfo.InvariantCulture),
            entry.CreatedAt,
            entry.UpdatedAt);
    }
}
