using FluentA.Application.BoundedContexts.Pronunciation.DTOs;

namespace FluentA.Application.BoundedContexts.Pronunciation;

public interface IPronunciationWordRepository
{
    Task<PronunciationTarget?> FindOwnedWordAsync(Guid userId, Guid wordId, CancellationToken cancellationToken = default);
}
