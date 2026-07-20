using FluentA.Application.BoundedContexts.Pronunciation.DTOs;
using FluentA.Application.Common;

namespace FluentA.Application.BoundedContexts.Pronunciation;

public interface IPronunciationService
{
    Task<OperationResult<PronunciationAssessmentDto>> AssessAsync(
        Guid userId,
        Guid wordId,
        ReadOnlyMemory<byte> wavAudio,
        CancellationToken cancellationToken = default);
}
