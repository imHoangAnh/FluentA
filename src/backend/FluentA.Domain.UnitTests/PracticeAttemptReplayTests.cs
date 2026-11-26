using FluentA.Domain.BoundedContexts.Practice.Entities;

namespace FluentA.Domain.UnitTests;

public sealed class PracticeAttemptReplayTests
{
    [Fact]
    public void AttemptUsesRequestIdentifierAsPersistedPrimaryKey()
    {
        var id = Guid.NewGuid();
        var attempt = Create(id);
        Assert.Equal(id, attempt.Id);
    }

    [Fact]
    public void EmptyRequestIdentifierIsRejected() => Assert.Throws<ArgumentException>(() => Create(Guid.Empty));

    private static PracticeAttempt Create(Guid requestId) => PracticeAttempt.Create(Guid.NewGuid(), Guid.NewGuid(),
        PracticeStep.Dictation, PracticeAttemptKind.Answer, "alpha", null, false, 0, null, null, null, null, DateTime.UtcNow, requestId);
}
