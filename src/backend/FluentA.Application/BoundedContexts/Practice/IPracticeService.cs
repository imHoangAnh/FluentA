using FluentA.Application.BoundedContexts.Practice.DTOs;
using FluentA.Application.Common;

namespace FluentA.Application.BoundedContexts.Practice;

public interface IPracticeService
{
    Task<OperationResult<PracticeSessionSummaryDto>> CreatePracticeSessionSummaryAsync(
        Guid userId,
        CreatePracticeSessionSummaryRequest request,
        CancellationToken cancellationToken = default);

    Task<OperationResult<AddPracticeWordsToReviewDto>> AddPracticeWordsToReviewAsync(
        Guid userId,
        AddPracticeWordsToReviewRequest request,
        CancellationToken cancellationToken = default);

    Task<PracticeSettingsDto> GetPracticeSettingsAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<OperationResult<PracticeSettingsDto>> UpdatePracticeSettingsAsync(
        Guid userId,
        UpdatePracticeSettingsRequest request,
        CancellationToken cancellationToken = default);
}
