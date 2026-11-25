using FluentA.Application.BoundedContexts.Practice;
using FluentA.Application.BoundedContexts.Practice.DTOs;
using FluentA.Application.BoundedContexts.Pronunciation.DTOs;
using FluentA.Application.Common;
using FluentA.Domain.BoundedContexts.Practice.Entities;

namespace FluentA.Application.UnitTests;

public sealed class PracticeRecoveryTests
{
    [Fact]
    public async Task Recap_StagesBothChangesAndCommitsOnce()
    {
        var fixture = new Fixture();
        var result = await fixture.Save();
        Assert.True(result.IsSuccess);
        Assert.Equal(["begin", "context", "stage-review", "stage-progress", "save", "commit"], fixture.Events);
    }

    [Fact]
    public async Task Recap_AdvanceConflictRollsBackWithoutCommit()
    {
        var fixture = new Fixture { AdvanceConflict = true };
        var result = await fixture.Save();
        Assert.False(result.IsSuccess);
        Assert.Equal("PRACTICE_SESSION_CONFLICT", result.Error!.Code);
        Assert.Equal(["begin", "context", "stage-review", "stage-progress", "rollback"], fixture.Events);
    }

    [Fact]
    public async Task Recap_InfrastructureFailurePropagatesAndRollsBack()
    {
        var fixture = new Fixture { FailSave = true };
        await Assert.ThrowsAsync<IOException>(() => fixture.Save());
        Assert.Equal("rollback", fixture.Events.Last());
        Assert.DoesNotContain("commit", fixture.Events);
    }

    [Fact]
    public async Task Recap_ReplayDoesNotEnrollOrAdvanceAgain()
    {
        var fixture = new Fixture { Replay = true };
        var result = await fixture.Save();
        Assert.True(result.IsSuccess);
        Assert.Equal(1, result.Value!.CurrentItemIndex);
        Assert.Equal(["begin", "context", "commit"], fixture.Events);
    }

    [Fact]
    public async Task ActiveReview_UsesAlreadyActiveResultWithoutResettingItsSchedule()
    {
        var fixture = new Fixture { AlreadyActive = true };
        var result = await fixture.Save();
        Assert.True(result.IsSuccess);
        Assert.Equal("alreadyInReview", result.Value!.Status);
    }

    private sealed class Fixture : IPracticeRepository, IPracticeSessionRepository, IReviewEnrollmentPort, IPracticeTransaction
    {
        public List<string> Events { get; } = [];
        public bool AdvanceConflict, FailSave, Replay, AlreadyActive;
        public Task<OperationResult<PracticeReviewLevelResultDto>> Save() =>
            new PracticeService(this, this, null!, this).SetReviewLevelAsync(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), new(3));

        public async Task<OperationResult<T>> ExecuteAsync<T>(Guid userId, Guid sessionId, Func<CancellationToken, Task<OperationResult<T>>> operation, CancellationToken cancellationToken = default)
        {
            Events.Add("begin");
            try
            {
                var result = await operation(cancellationToken);
                Events.Add(result.IsSuccess ? "commit" : "rollback");
                return result;
            }
            catch { Events.Add("rollback"); throw; }
        }
        public Task SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            Events.Add("save");
            if (FailSave) throw new IOException("Injected commit failure");
            return Task.CompletedTask;
        }
        public Task<PracticeRepositoryOperationResult<PracticeReviewEnrollmentContextDto>> GetReviewEnrollmentContextAsync(Guid userId, Guid sessionId, Guid wordId, CancellationToken cancellationToken = default)
        {
            Events.Add("context");
            return Task.FromResult(new PracticeRepositoryOperationResult<PracticeReviewEnrollmentContextDto>(PracticeRepositoryOperationStatus.Success,
                new(Guid.NewGuid(), wordId, Replay ? new("added", true, 1) : null)));
        }
        public Task<AddPracticeWordsToReviewDto?> StagePracticeWordEnrollmentAsync(Guid userId, Guid pageId, Guid wordId, DateTime utcNow, int initialLevel, CancellationToken cancellationToken = default)
        {
            Events.Add("stage-review");
            return Task.FromResult<AddPracticeWordsToReviewDto?>(new(pageId, wordId, AlreadyActive ? "alreadyInReview" : "added", new(2026, 10, 18)));
        }
        public Task<PracticeRepositoryOperationResult<PracticeReviewLevelResultDto>> AdvanceAfterReviewEnrollmentAsync(Guid userId, Guid sessionId, Guid wordId, int selectedLevel, bool alreadyActive, DateTime utcNow, CancellationToken cancellationToken = default)
        {
            Events.Add("stage-progress");
            return Task.FromResult(new PracticeRepositoryOperationResult<PracticeReviewLevelResultDto>(AdvanceConflict ? PracticeRepositoryOperationStatus.Conflict : PracticeRepositoryOperationStatus.Success,
                AdvanceConflict ? null : new(alreadyActive ? "alreadyInReview" : "added", true, 1)));
        }
        public Task<AddPracticeWordsToReviewDto?> EnrollMissingPracticeWordsAsync(Guid userId, Guid pageId, Guid wordId, DateTime utcNow, CancellationToken cancellationToken = default) => throw new NotSupportedException("Recap must stage, not independently save enrollment.");
        public Task<PracticeDeckQueryResult> GetDecksAsync(Guid userId, Guid boardId, string? search, int page, int pageSize, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<PracticeRepositoryOperationResult<PracticeSessionDto>> CreateSessionAsync(Guid userId, Guid pageId, DateTime utcNow, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<PracticeRepositoryOperationResult<PracticeSessionDto>> GetSessionAsync(Guid userId, Guid sessionId, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<PracticeRepositoryOperationResult<PracticeAnswerResultDto>> SubmitAnswerAsync(Guid userId, Guid sessionId, Guid itemId, PracticeStep submittedStep, string? answerText, Guid? answerSlotId, bool skip, long durationMs, DateTime utcNow, CancellationToken cancellationToken = default, Guid? requestId = null) => throw new NotSupportedException();
        public Task<PracticeRepositoryOperationResult<PracticePronunciationAttemptResultDto>?> GetPronunciationReplayAsync(Guid userId, Guid sessionId, Guid itemId, Guid? requestId, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<PracticeRepositoryOperationResult<PracticePronunciationTargetDto>> GetPronunciationTargetAsync(Guid userId, Guid sessionId, Guid itemId, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<PracticeRepositoryOperationResult<PracticePronunciationAttemptResultDto>> RecordPronunciationAttemptAsync(Guid userId, Guid sessionId, Guid itemId, PronunciationAssessmentDto assessment, long durationMs, DateTime utcNow, CancellationToken cancellationToken = default, Guid? requestId = null) => throw new NotSupportedException();
        public Task<PracticeRepositoryOperationResult<PracticeRetryStepResultDto>> RetryStepAsync(Guid userId, Guid sessionId, Guid itemId, PracticeStep step, Guid attemptId, DateTime utcNow, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<PracticeRepositoryOperationResult<PracticeSessionDto>> CompleteSessionAsync(Guid userId, Guid sessionId, DateTime utcNow, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<PracticeSessionSummarySaveResult> CreatePracticeSessionSummaryAsync(Guid userId, Guid pageId, PracticeMode mode, int totalCards, int correctCards, int wrongCards, DateTime utcNow, CancellationToken cancellationToken = default) => throw new NotSupportedException();
    }
}
