using System.Text.Json;
using FluentA.Application.BoundedContexts.Pronunciation.DTOs;
using FluentA.Application.BoundedContexts.Practice;
using FluentA.Application.BoundedContexts.Practice.DTOs;
using FluentA.Domain.BoundedContexts.Practice.Entities;
using FluentA.Domain.BoundedContexts.Review.Entities;
using FluentA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FluentA.Infrastructure.Persistence.Repositories.Practice;

public sealed partial class EfPracticeRepository
{
    public async Task<PracticeDeckQueryResult> GetDecksAsync(
        Guid userId,
        Guid boardId,
        string? search,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var boardExists = await _dbContext.Boards
            .AsNoTracking()
            .AnyAsync(board => board.Id == boardId && board.UserId == userId && board.DeletedAt == null, cancellationToken);
        if (!boardExists)
        {
            return new PracticeDeckQueryResult(PracticeRepositoryOperationStatus.NotFound, null);
        }

        var query = from pageEntity in _dbContext.Pages.AsNoTracking()
                    join board in _dbContext.Boards.AsNoTracking() on pageEntity.BoardId equals board.Id
                    where pageEntity.BoardId == boardId
                        && pageEntity.DeletedAt == null
                        && board.UserId == userId
                        && board.DeletedAt == null
                        && (search == null || pageEntity.Name.ToLower().Contains(search.ToLower()))
                    select new
                    {
                        PageId = pageEntity.Id,
                        PageName = pageEntity.Name,
                        BoardId = board.Id,
                        BoardName = board.Name,
                        WordCount = _dbContext.Words.Count(word => word.PageId == pageEntity.Id && word.DeletedAt == null),
                    };

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderBy(item => item.PageName)
            .ThenBy(item => item.PageId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(item => new PracticeDeckDto(item.PageId, item.PageName, item.BoardId, item.BoardName, item.WordCount))
            .ToArrayAsync(cancellationToken);

        return new PracticeDeckQueryResult(
            PracticeRepositoryOperationStatus.Success,
            new PracticeDeckPageDto(items, page, pageSize, totalCount));
    }

    public async Task<PracticeRepositoryOperationResult<PracticeSessionDto>> CreateSessionAsync(
        Guid userId,
        Guid pageId,
        DateTime utcNow,
        CancellationToken cancellationToken = default)
    {
        var page = await (
            from pageEntity in _dbContext.Pages.AsNoTracking()
            join board in _dbContext.Boards.AsNoTracking() on pageEntity.BoardId equals board.Id
            where pageEntity.Id == pageId
                && pageEntity.DeletedAt == null
                && board.UserId == userId
                && board.DeletedAt == null
            select new
            {
                PageId = pageEntity.Id,
                PageName = pageEntity.Name,
                BoardId = board.Id,
                BoardName = board.Name,
                BoardLanguage = board.Language,
            })
            .SingleOrDefaultAsync(cancellationToken);

        if (page is null)
        {
            return Failed<PracticeSessionDto>(PracticeRepositoryOperationStatus.NotFound);
        }

        var words = await _dbContext.Words
            .AsNoTracking()
            .Where(word => word.PageId == pageId && word.DeletedAt == null)
            .OrderBy(word => word.CreatedAt)
            .ThenBy(word => word.Id)
            .Select(word => new
            {
                word.Id,
                word.Word,
                word.Meaning,
                word.IpaPronunciation,
                word.Type,
                word.Context,
                word.Example,
                word.Synonyms,
                word.Antonyms,
            })
            .ToArrayAsync(cancellationToken);

        if (words.Length == 0)
        {
            return Failed<PracticeSessionDto>(PracticeRepositoryOperationStatus.EmptyDeck);
        }

        var boardMeanings = await (
            from word in _dbContext.Words.AsNoTracking()
            join pageEntity in _dbContext.Pages.AsNoTracking() on word.PageId equals pageEntity.Id
            where pageEntity.BoardId == page.BoardId
                && pageEntity.DeletedAt == null
                && word.DeletedAt == null
            select new MeaningCandidate(word.Word, word.Meaning))
            .ToArrayAsync(cancellationToken);

        var wordIds = words.Select(word => word.Id).ToArray();
        var activeReviewWordIds = await GetActiveReviewWordIdsAsync(userId, wordIds, cancellationToken);
        var session = PracticeSession.Create(
            userId,
            page.PageId,
            page.PageName,
            page.BoardId,
            page.BoardName,
            page.BoardLanguage,
            utcNow);
        var items = new List<PracticeSessionItem>(words.Length);

        for (var position = 0; position < words.Length; position++)
        {
            var word = words[position];
            var (choices, correctIndex) = BuildAnswerChoices(word.Word, word.Meaning, boardMeanings);
            items.Add(PracticeSessionItem.Create(
                session.Id,
                word.Id,
                position,
                word.Word,
                word.Meaning,
                word.IpaPronunciation,
                word.Type.ToString(),
                word.Context,
                word.Example,
                word.Synonyms,
                word.Antonyms,
                choices,
                correctIndex,
                activeReviewWordIds.Contains(word.Id)));
        }

        await _dbContext.Set<PracticeSession>().AddAsync(session, cancellationToken);
        await _dbContext.Set<PracticeSessionItem>().AddRangeAsync(items, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Succeeded(BuildSessionDto(session, items, activeReviewWordIds));
    }

    public async Task<PracticeRepositoryOperationResult<PracticeSessionDto>> GetSessionAsync(
        Guid userId,
        Guid sessionId,
        CancellationToken cancellationToken = default)
    {
        var session = await _dbContext.Set<PracticeSession>()
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == sessionId && item.UserId == userId && item.DeletedAt == null, cancellationToken);
        if (session is null)
        {
            return Failed<PracticeSessionDto>(PracticeRepositoryOperationStatus.NotFound);
        }

        var items = await _dbContext.Set<PracticeSessionItem>()
            .AsNoTracking()
            .Where(item => item.PracticeSessionId == sessionId && item.DeletedAt == null)
            .OrderBy(item => item.Position)
            .ToArrayAsync(cancellationToken);
        var activeReviewWordIds = await GetActiveReviewWordIdsAsync(userId, items.Select(item => item.WordId), cancellationToken);
        return Succeeded(BuildSessionDto(session, items, activeReviewWordIds));
    }

    public async Task<PracticeRepositoryOperationResult<PracticeAnswerResultDto>> SubmitAnswerAsync(
        Guid userId,
        Guid sessionId,
        Guid itemId,
        PracticeStep submittedStep,
        string? answerText,
        Guid? answerSlotId,
        bool skip,
        long durationMs,
        DateTime utcNow,
        CancellationToken cancellationToken = default)
    {
        var session = await FindOwnedSessionAsync(userId, sessionId, cancellationToken);
        if (session is null)
        {
            return Failed<PracticeAnswerResultDto>(PracticeRepositoryOperationStatus.NotFound);
        }

        var itemResult = await FindCurrentItemAsync(session, itemId, cancellationToken);
        if (itemResult.Status != PracticeRepositoryOperationStatus.Success || itemResult.Item is null)
        {
            return Failed<PracticeAnswerResultDto>(itemResult.Status);
        }

        var item = itemResult.Item;
        if (item.CurrentStep != submittedStep || item.IsCompleted)
        {
            return Failed<PracticeAnswerResultDto>(PracticeRepositoryOperationStatus.Conflict);
        }

        var correctness = false;
        if (skip)
        {
            item.SkipStep(submittedStep, utcNow);
            await _dbContext.Set<PracticeAttempt>().AddAsync(
                PracticeAttempt.Create(
                    session.Id,
                    item.Id,
                    submittedStep,
                    PracticeAttemptKind.Skip,
                    submittedAnswer: null,
                    answerSlotId: null,
                    correctness: false,
                    durationMs,
                    attemptNumber: null,
                    accuracyScore: null,
                    completenessScore: null,
                    assessmentJson: null,
                    utcNow),
                cancellationToken);

            if (item.IsCompleted)
            {
                var itemCount = await CountItemsAsync(session.Id, cancellationToken);
                session.AdvanceFrom(session.CurrentItemIndex, utcNow);
                var nextStep = session.CurrentItemIndex < itemCount ? "dictation" : null;
                await _dbContext.SaveChangesAsync(cancellationToken);
                return Succeeded(new PracticeAnswerResultDto(
                    item.Id,
                    StepName(submittedStep),
                    Correctness: false,
                    CanRetry: false,
                    nextStep,
                    session.CurrentItemIndex,
                    SessionStatusName(session.Status)));
            }
        }
        else
        {
            correctness = submittedStep switch
            {
                PracticeStep.Dictation => AnswersMatch(answerText, item.Word),
                PracticeStep.WordToMeaning => item.IsCorrectChoice(answerSlotId),
                _ => false,
            };
            item.MarkAnswer(correctness, submittedStep, utcNow);
            await _dbContext.Set<PracticeAttempt>().AddAsync(
                PracticeAttempt.Create(
                    session.Id,
                    item.Id,
                    submittedStep,
                    PracticeAttemptKind.Answer,
                    answerText,
                    answerSlotId,
                    correctness,
                    durationMs,
                    attemptNumber: null,
                    accuracyScore: null,
                    completenessScore: null,
                    assessmentJson: null,
                    utcNow),
                cancellationToken);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return Succeeded(new PracticeAnswerResultDto(
            item.Id,
            StepName(submittedStep),
            correctness,
            CanRetry: !skip && !correctness,
            NextStep: skip ? StepName(item.CurrentStep) : correctness ? StepName(item.CurrentStep) : StepName(submittedStep),
            session.CurrentItemIndex,
            SessionStatusName(session.Status)));
    }

    public async Task<PracticeRepositoryOperationResult<PracticePronunciationTargetDto>> GetPronunciationTargetAsync(
        Guid userId,
        Guid sessionId,
        Guid itemId,
        CancellationToken cancellationToken = default)
    {
        var session = await FindOwnedSessionAsync(userId, sessionId, cancellationToken);
        if (session is null)
        {
            return Failed<PracticePronunciationTargetDto>(PracticeRepositoryOperationStatus.NotFound);
        }

        var itemResult = await FindCurrentItemAsync(session, itemId, cancellationToken);
        if (itemResult.Status != PracticeRepositoryOperationStatus.Success || itemResult.Item is null)
        {
            return Failed<PracticePronunciationTargetDto>(itemResult.Status);
        }

        if (session.Status != PracticeSessionStatus.Active
            || itemResult.Item.CurrentStep != PracticeStep.Pronunciation
            || itemResult.Item.IsCompleted)
        {
            return Failed<PracticePronunciationTargetDto>(PracticeRepositoryOperationStatus.Conflict);
        }

        var attempts = await _dbContext.Set<PracticeAttempt>()
            .CountAsync(attempt => attempt.PracticeSessionItemId == itemId
                && attempt.Kind == PracticeAttemptKind.PronunciationAssessment
                && attempt.DeletedAt == null,
                cancellationToken);
        return Succeeded(new PracticePronunciationTargetDto(itemResult.Item.Word, session.BoardLanguage, attempts + 1));
    }

    public async Task<PracticeRepositoryOperationResult<PracticePronunciationAttemptResultDto>> RecordPronunciationAttemptAsync(
        Guid userId,
        Guid sessionId,
        Guid itemId,
        PronunciationAssessmentDto assessment,
        long durationMs,
        DateTime utcNow,
        CancellationToken cancellationToken = default)
    {
        var session = await FindOwnedSessionAsync(userId, sessionId, cancellationToken);
        if (session is null)
        {
            return Failed<PracticePronunciationAttemptResultDto>(PracticeRepositoryOperationStatus.NotFound);
        }

        var itemResult = await FindCurrentItemAsync(session, itemId, cancellationToken);
        if (itemResult.Status != PracticeRepositoryOperationStatus.Success || itemResult.Item is null)
        {
            return Failed<PracticePronunciationAttemptResultDto>(itemResult.Status);
        }

        var item = itemResult.Item;
        if (session.Status != PracticeSessionStatus.Active
            || item.CurrentStep != PracticeStep.Pronunciation
            || item.IsCompleted)
        {
            return Failed<PracticePronunciationAttemptResultDto>(PracticeRepositoryOperationStatus.Conflict);
        }

        var previousAttempts = await _dbContext.Set<PracticeAttempt>()
            .CountAsync(attempt => attempt.PracticeSessionItemId == itemId
                && attempt.Kind == PracticeAttemptKind.PronunciationAssessment
                && attempt.DeletedAt == null,
                cancellationToken);
        var attemptNumber = previousAttempts + 1;
        item.RecordPronunciation(assessment.Correct, utcNow);
        await _dbContext.Set<PracticeAttempt>().AddAsync(
            PracticeAttempt.Create(
                session.Id,
                item.Id,
                PracticeStep.Pronunciation,
                PracticeAttemptKind.PronunciationAssessment,
                submittedAnswer: null,
                answerSlotId: null,
                correctness: assessment.Correct,
                durationMs,
                attemptNumber,
                assessment.AccuracyScore,
                assessment.CompletenessScore,
                JsonSerializer.Serialize(assessment),
                utcNow),
            cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Succeeded(new PracticePronunciationAttemptResultDto(
            item.Id,
            assessment,
            assessment.Correct,
            attemptNumber,
            AttemptsRemaining: null,
            NextStep: assessment.Correct ? "recap" : "pronunciation",
            session.CurrentItemIndex,
            SessionStatusName(session.Status)));
    }

    public async Task<PracticeRepositoryOperationResult<PracticeReviewEnrollmentContextDto>> GetReviewEnrollmentContextAsync(
        Guid userId,
        Guid sessionId,
        Guid wordId,
        CancellationToken cancellationToken = default)
    {
        var session = await FindOwnedSessionAsync(userId, sessionId, cancellationToken);
        if (session is null)
        {
            return Failed<PracticeReviewEnrollmentContextDto>(PracticeRepositoryOperationStatus.NotFound);
        }

        var item = await _dbContext.Set<PracticeSessionItem>()
            .SingleOrDefaultAsync(candidate => candidate.PracticeSessionId == sessionId
                && candidate.Position == session.CurrentItemIndex
                && candidate.DeletedAt == null,
                cancellationToken);
        if (session.Status != PracticeSessionStatus.Active
            || item is null
            || item.WordId != wordId
            || item.CurrentStep != PracticeStep.Recap
            || item.IsCompleted)
        {
            return Failed<PracticeReviewEnrollmentContextDto>(PracticeRepositoryOperationStatus.Conflict);
        }

        return Succeeded(new PracticeReviewEnrollmentContextDto(session.PageId, item.WordId));
    }

    public async Task<PracticeRepositoryOperationResult<PracticeReviewLevelResultDto>> AdvanceAfterReviewEnrollmentAsync(
        Guid userId,
        Guid sessionId,
        Guid wordId,
        int selectedLevel,
        bool alreadyActive,
        DateTime utcNow,
        CancellationToken cancellationToken = default)
    {
        var session = await FindOwnedSessionAsync(userId, sessionId, cancellationToken);
        if (session is null)
        {
            return Failed<PracticeReviewLevelResultDto>(PracticeRepositoryOperationStatus.NotFound);
        }

        var item = await _dbContext.Set<PracticeSessionItem>()
            .SingleOrDefaultAsync(candidate => candidate.PracticeSessionId == sessionId
                && candidate.Position == session.CurrentItemIndex
                && candidate.DeletedAt == null,
                cancellationToken);
        if (session.Status != PracticeSessionStatus.Active
            || item is null
            || item.WordId != wordId
            || item.CurrentStep != PracticeStep.Recap
            || item.IsCompleted)
        {
            return Failed<PracticeReviewLevelResultDto>(PracticeRepositoryOperationStatus.Conflict);
        }

        item.SetReviewEnrollment(selectedLevel, alreadyActive, utcNow);
        session.AdvanceFrom(session.CurrentItemIndex, utcNow);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Succeeded(new PracticeReviewLevelResultDto(
            alreadyActive ? "alreadyInReview" : "added",
            ItemCompleted: true,
            session.CurrentItemIndex));
    }

    public async Task<PracticeRepositoryOperationResult<PracticeSessionDto>> CompleteSessionAsync(
        Guid userId,
        Guid sessionId,
        DateTime utcNow,
        CancellationToken cancellationToken = default)
    {
        var session = await FindOwnedSessionAsync(userId, sessionId, cancellationToken);
        if (session is null)
        {
            return Failed<PracticeSessionDto>(PracticeRepositoryOperationStatus.NotFound);
        }

        var items = await _dbContext.Set<PracticeSessionItem>()
            .Where(item => item.PracticeSessionId == sessionId && item.DeletedAt == null)
            .OrderBy(item => item.Position)
            .ToArrayAsync(cancellationToken);
        if (session.Status == PracticeSessionStatus.Completed)
        {
            var currentActiveIds = await GetActiveReviewWordIdsAsync(userId, items.Select(item => item.WordId), cancellationToken);
            return Succeeded(BuildSessionDto(session, items, currentActiveIds));
        }

        if (items.Length == 0
            || session.CurrentItemIndex < items.Length
            || items.Any(item => !item.IsCompleted))
        {
            return Failed<PracticeSessionDto>(PracticeRepositoryOperationStatus.Conflict);
        }

        var correctCount = items.Count(item => !item.HasMistake);
        var wrongCount = items.Length - correctCount;
        session.Complete(items.Length, utcNow);

        var summary = await _dbContext.PracticeSessionSummaries
            .Where(item => item.UserId == userId && item.PageId == session.PageId && item.DeletedAt == null)
            .OrderBy(item => item.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
        if (summary is null)
        {
            summary = PracticeSessionSummary.Create(
                session.UserId,
                session.PageId,
                PracticeMode.FixedSequence,
                items.Length,
                correctCount,
                wrongCount,
                utcNow);
            await _dbContext.PracticeSessionSummaries.AddAsync(summary, cancellationToken);
        }
        else
        {
            summary.UpdateCompletion(
                PracticeMode.FixedSequence,
                items.Length,
                correctCount,
                wrongCount,
                utcNow);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        var activeReviewWordIds = await GetActiveReviewWordIdsAsync(userId, items.Select(item => item.WordId), cancellationToken);
        return Succeeded(BuildSessionDto(session, items, activeReviewWordIds));
    }

    private async Task<PracticeSession?> FindOwnedSessionAsync(Guid userId, Guid sessionId, CancellationToken cancellationToken) =>
        await _dbContext.Set<PracticeSession>()
            .SingleOrDefaultAsync(session => session.Id == sessionId && session.UserId == userId && session.DeletedAt == null, cancellationToken);

    private async Task<(PracticeRepositoryOperationStatus Status, PracticeSessionItem? Item)> FindCurrentItemAsync(
        PracticeSession session,
        Guid itemId,
        CancellationToken cancellationToken)
    {
        if (session.Status != PracticeSessionStatus.Active)
        {
            return (PracticeRepositoryOperationStatus.Conflict, null);
        }

        var item = await _dbContext.Set<PracticeSessionItem>()
            .SingleOrDefaultAsync(candidate => candidate.PracticeSessionId == session.Id
                && candidate.Position == session.CurrentItemIndex
                && candidate.DeletedAt == null,
                cancellationToken);
        return item is null || item.Id != itemId
            ? (PracticeRepositoryOperationStatus.Conflict, null)
            : (PracticeRepositoryOperationStatus.Success, item);
    }

    private async Task<int> CountItemsAsync(Guid sessionId, CancellationToken cancellationToken) =>
        await _dbContext.Set<PracticeSessionItem>()
            .CountAsync(item => item.PracticeSessionId == sessionId && item.DeletedAt == null, cancellationToken);

    private async Task<HashSet<Guid>> GetActiveReviewWordIdsAsync(
        Guid userId,
        IEnumerable<Guid> wordIds,
        CancellationToken cancellationToken)
    {
        var ids = wordIds.Distinct().ToArray();
        if (ids.Length == 0)
        {
            return [];
        }

        return await _dbContext.WordReviewStates
            .AsNoTracking()
            .Where(state => state.UserId == userId
                && state.Status == WordReviewStatus.Active
                && state.DeletedAt == null
                && ids.Contains(state.WordId))
            .Select(state => state.WordId)
            .ToHashSetAsync(cancellationToken);
    }

    private static PracticeSessionDto BuildSessionDto(
        PracticeSession session,
        IReadOnlyList<PracticeSessionItem> items,
        IReadOnlySet<Guid> activeReviewWordIds) =>
        new(
            session.Id,
            session.PageId,
            session.PageName,
            session.BoardId,
            session.BoardName,
            session.BoardLanguage,
            SessionStatusName(session.Status),
            session.CurrentItemIndex,
            items.Select(item => new PracticeSessionItemDto(
                item.Id,
                item.WordId,
                item.Position,
                item.Word,
                item.Meaning,
                item.IpaPronunciation,
                item.Type,
                item.Context,
                item.Example,
                item.Synonyms,
                item.Antonyms,
                StepName(item.CurrentStep),
                activeReviewWordIds.Contains(item.WordId),
                [
                    new PracticeAnswerSlotDto(item.Choice1SlotId, item.Choice1Meaning),
                    new PracticeAnswerSlotDto(item.Choice2SlotId, item.Choice2Meaning),
                    new PracticeAnswerSlotDto(item.Choice3SlotId, item.Choice3Meaning),
                    new PracticeAnswerSlotDto(item.Choice4SlotId, item.Choice4Meaning),
                ],
                item.SelectedLevel,
                item.IsCompleted)).ToArray(),
            session.StartedAt,
            session.CompletedAt);

    private static (IReadOnlyList<string?> Choices, int CorrectIndex) BuildAnswerChoices(
        string word,
        string correctMeaning,
        IReadOnlyCollection<MeaningCandidate> boardMeanings)
    {
        var distractors = new List<string>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            correctMeaning.Trim(),
            word.Trim(),
        };

        foreach (var candidate in boardMeanings)
        {
            var meaning = candidate.Meaning.Trim();
            if (string.IsNullOrWhiteSpace(meaning)
                || string.Equals(candidate.Word.Trim(), word.Trim(), StringComparison.OrdinalIgnoreCase)
                || !seen.Add(meaning))
            {
                continue;
            }

            distractors.Add(meaning);
        }

        Shuffle(distractors);
        var choices = new List<string?>(4) { correctMeaning.Trim() };
        choices.AddRange(distractors.Take(3));
        while (choices.Count < 4)
        {
            choices.Add(null);
        }

        Shuffle(choices);
        var correctIndex = choices.FindIndex(choice => string.Equals(choice, correctMeaning.Trim(), StringComparison.Ordinal));
        return (choices, correctIndex);
    }

    private static void Shuffle<T>(IList<T> values)
    {
        for (var index = values.Count - 1; index > 0; index--)
        {
            var other = Random.Shared.Next(index + 1);
            (values[index], values[other]) = (values[other], values[index]);
        }
    }

    private static bool AnswersMatch(string? answer, string expected) =>
        string.Equals(answer?.Trim(), expected.Trim(), StringComparison.OrdinalIgnoreCase);

    private static string StepName(PracticeStep step) => step switch
    {
        PracticeStep.Dictation => "dictation",
        PracticeStep.WordToMeaning => "wordToMeaning",
        PracticeStep.Pronunciation => "pronunciation",
        PracticeStep.Recap => "recap",
        _ => throw new InvalidOperationException("Unknown practice step."),
    };

    private static string SessionStatusName(PracticeSessionStatus status) => status switch
    {
        PracticeSessionStatus.Active => "active",
        PracticeSessionStatus.Completed => "completed",
        _ => throw new InvalidOperationException("Unknown practice session status."),
    };

    private static PracticeRepositoryOperationResult<T> Succeeded<T>(T value) =>
        new(PracticeRepositoryOperationStatus.Success, value);

    private static PracticeRepositoryOperationResult<T> Failed<T>(PracticeRepositoryOperationStatus status) =>
        new(status, default);

    private sealed record MeaningCandidate(string Word, string Meaning);
}
