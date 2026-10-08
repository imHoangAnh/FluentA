using System.Globalization;
using FluentA.Application.BoundedContexts.Assets;
using FluentA.Domain.BoundedContexts.Assets.Enums;
using FluentA.Application.BoundedContexts.Journal.DTOs;
using FluentA.Application.Common;
using FluentA.Domain.BoundedContexts.Journal.Entities;

namespace FluentA.Application.BoundedContexts.Journal;

public sealed class JournalService : IJournalService
{
    private const string DateFormat = "yyyy-MM-dd";
    private const string MonthFormat = "yyyy-MM";
    private const int SearchQueryMaxLength = 100;
    private readonly IJournalRepository _repository;
    private readonly IJournalContentProcessor _contentProcessor;

    private readonly IAssetRepository _assets;
    private readonly IAssetObjectStorage _storage;

    public JournalService(IJournalRepository repository, IJournalContentProcessor contentProcessor, IAssetRepository assets, IAssetObjectStorage storage)
    {
        _repository = repository;
        _contentProcessor = contentProcessor;
        _assets = assets;
        _storage = storage;
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
            : OperationResult<JournalEntryDto>.Success(await ToDtoAsync(userId, entry, cancellationToken));
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

        if (await _repository.DateExistsAsync(userId, validation.Date, cancellationToken: cancellationToken))
            return OperationResult<JournalEntryDto>.Failure(JournalError.DateConflict());
        JournalProcessedContent content;
        try { content = await _contentProcessor.ProcessAsync(userId, request.Content, cancellationToken); }
        catch (JournalContentValidationException exception) { return OperationResult<JournalEntryDto>.Failure(JournalError.Validation(exception.Errors)); }
        if (content.Html.Length > 100_000)
            return OperationResult<JournalEntryDto>.Failure(ContentTooLong());
        if ((await _repository.GetAttachedAssetEntryIdsAsync(content.ReferencedAssetIds.ToArray(), cancellationToken)).Count > 0)
            return OperationResult<JournalEntryDto>.Failure(ImageAlreadyAttached());
        var entry = JournalEntry.Create(userId, request.Title, validation.Date, content.Html);
        await _repository.AddAsync(entry, cancellationToken);
        await _repository.ReplaceEntryAssetLinksAsync(entry.Id, content.ReferencedAssetIds, cancellationToken);
        if (!await _repository.SaveChangesAsync(cancellationToken))
            return OperationResult<JournalEntryDto>.Failure(JournalError.DateConflict());
        return OperationResult<JournalEntryDto>.Success(await ToDtoAsync(userId, entry, cancellationToken));
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

        if (validation.Date is not null && await _repository.DateExistsAsync(userId, validation.Date.Value, journalId, cancellationToken))
            return OperationResult<JournalEntryDto>.Failure(JournalError.DateConflict());
        if (request.Content is not null)
        {
            JournalProcessedContent processed;
            try { processed = await _contentProcessor.ProcessAsync(userId, request.Content, cancellationToken); }
            catch (JournalContentValidationException exception) { return OperationResult<JournalEntryDto>.Failure(JournalError.Validation(exception.Errors)); }
            if (processed.Html.Length > 100_000)
                return OperationResult<JournalEntryDto>.Failure(ContentTooLong());
            var attached = await _repository.GetAttachedAssetEntryIdsAsync(processed.ReferencedAssetIds.ToArray(), cancellationToken);
            if (attached.Any(link => link.Value != entry.Id))
                return OperationResult<JournalEntryDto>.Failure(ImageAlreadyAttached());
            var oldIds = await _repository.GetEntryAssetIdsAsync(entry.Id, cancellationToken);
            entry.UpdateContent(processed.Html);
            await _repository.ReplaceEntryAssetLinksAsync(entry.Id, processed.ReferencedAssetIds, cancellationToken);
            foreach (var asset in await _assets.GetOwnedAsync(userId, oldIds.Except(processed.ReferencedAssetIds).ToArray(), cancellationToken))
                asset.MarkDeleted(DateTime.UtcNow);
        }
        if (request.Title is not null) entry.Rename(request.Title);
        if (validation.Date is not null) entry.UpdateDate(validation.Date.Value);
        await _repository.UpdateAsync(entry, cancellationToken);
        if (!await _repository.SaveChangesAsync(cancellationToken))
            return OperationResult<JournalEntryDto>.Failure(JournalError.DateConflict());
        return OperationResult<JournalEntryDto>.Success(await ToDtoAsync(userId, entry, cancellationToken));
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
        await _repository.SaveChangesAsync(cancellationToken);
        return OperationResult<bool>.Success(true);
    }

    private static JournalError ContentTooLong() => JournalError.Validation(new Dictionary<string, string[]>
    {
        ["content"] = ["Content must be at most 100000 characters after formatting cleanup."]
    });

    private static JournalError ImageAlreadyAttached() => JournalError.Validation(new Dictionary<string, string[]>
    {
        ["content"] = ["An image can belong to only one journal."]
    });

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

    private async Task<JournalEntryDto> ToDtoAsync(Guid userId, JournalEntry entry, CancellationToken cancellationToken)
    {
        var ids = await _repository.GetEntryAssetIdsAsync(entry.Id, cancellationToken);
        var urls = new Dictionary<Guid, string>();
        foreach (var asset in await _assets.GetOwnedAsync(userId, ids.ToArray(), cancellationToken))
        {
            if (asset.Type != AssetType.JournalImage || asset.Status != AssetStatus.Ready) continue;
            try { urls[asset.Id] = _storage.CreatePresignedDownload(new AssetDownloadRequest(asset.ObjectKey, TimeSpan.FromMinutes(5))).Url; }
            catch (AssetStorageUnavailableException) { /* Return durable references when storage is unavailable. */ }
        }
        return new JournalEntryDto(
            entry.Id,
            entry.Title,
            _contentProcessor.HydrateImageSources(entry.Content, urls),
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
