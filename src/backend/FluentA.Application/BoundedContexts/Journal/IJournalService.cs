using FluentA.Application.BoundedContexts.Journal.DTOs;
using FluentA.Application.Common;

namespace FluentA.Application.BoundedContexts.Journal;

public interface IJournalService
{
    Task<OperationResult<IReadOnlyList<JournalEntrySummaryDto>>> ListAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<OperationResult<JournalEntryDto>> GetAsync(Guid userId, Guid journalId, CancellationToken cancellationToken = default);
    Task<OperationResult<JournalEntryDto>> CreateAsync(Guid userId, CreateJournalEntryRequest request, CancellationToken cancellationToken = default);
    Task<OperationResult<JournalEntryDto>> UpdateAsync(Guid userId, Guid journalId, UpdateJournalEntryRequest request, CancellationToken cancellationToken = default);
    Task<OperationResult<bool>> DeleteAsync(Guid userId, Guid journalId, CancellationToken cancellationToken = default);
}
