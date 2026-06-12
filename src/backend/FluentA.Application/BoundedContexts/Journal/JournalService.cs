using System.Globalization;
using FluentA.Application.BoundedContexts.Journal.DTOs;
using FluentA.Application.Common;
using FluentA.Domain.BoundedContexts.Journal.Entities;

namespace FluentA.Application.BoundedContexts.Journal;

public sealed class JournalService : IJournalService
{
    private const string DateFormat = "yyyy-MM-dd";
    private const string MonthFormat = "yyyy-MM";
    private const int SearchQueryMaxLength = 100;
    private const int SearchPreviewLength = 160;
    private readonly IJournalRepository _repository;
    private readonly IJournalContentProcessor _contentProcessor;

    public JournalService(IJournalRepository repository, IJournalContentProcessor contentProcessor)
    {
        _repository = repository;
        _contentProcessor = contentProcessor;
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
        return OperationResult<IReadOnlyList<JournalSearchResultDto>>.Success(
            entries.Select(entry => ToSearchDto(entry, cleanedQuery)).ToList());
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
        var entry = JournalEntry.Create(userId, request.Title, content.Html, content.PlainText, validation.LearningDate);
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
            entry.UpdateContent(content.Html, content.PlainText);
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

    private static JournalSearchResultDto ToSearchDto(JournalEntrySearchItem entry, string query)
    {
        var normalized = string.Join(' ', entry.PlainTextContent.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
        var firstMatch = normalized.IndexOf(query, StringComparison.OrdinalIgnoreCase);
        var start = firstMatch <= SearchPreviewLength / 3
            ? 0
            : Math.Max(0, firstMatch - (SearchPreviewLength / 3));
        var length = Math.Min(SearchPreviewLength, normalized.Length - start);
        var body = normalized.Substring(start, length);
        var prefix = start > 0 ? "..." : string.Empty;
        var suffix = start + length < normalized.Length ? "..." : string.Empty;
        var preview = prefix + body + suffix;
        var highlights = new List<JournalHighlightRangeDto>();
        var searchFrom = 0;

        while (searchFrom < body.Length)
        {
            var match = body.IndexOf(query, searchFrom, StringComparison.OrdinalIgnoreCase);
            if (match < 0)
            {
                break;
            }

            highlights.Add(new JournalHighlightRangeDto(prefix.Length + match, query.Length));
            searchFrom = match + query.Length;
        }

        return new JournalSearchResultDto(
            entry.Id,
            entry.Title,
            preview,
            highlights,
            entry.LearningDate?.ToString(DateFormat, CultureInfo.InvariantCulture),
            entry.CreatedAt,
            entry.UpdatedAt);
    }
}
