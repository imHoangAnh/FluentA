using System.Globalization;
using System.Text.Json;
using FluentA.Application.BoundedContexts.Analytics.DTOs;
using FluentA.Application.BoundedContexts.Pronunciation.DTOs;
using FluentA.Application.BoundedContexts.Review;
using FluentA.Application.Common;
using FluentA.Domain.BoundedContexts.Review.Entities;

namespace FluentA.Application.BoundedContexts.Analytics;

public sealed class AnalyticsService : IAnalyticsService
{
    private const int ConsistencyDaysCount = 84;
    private const int MaxWeakPhonemes = 4;
    private const int MaxPhonemeExampleWords = 3;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly IAnalyticsRepository _repository;
    private readonly Func<DateTime> _utcNowProvider;

    public AnalyticsService(IAnalyticsRepository repository)
        : this(repository, () => DateTime.UtcNow)
    {
    }

    public AnalyticsService(IAnalyticsRepository repository, Func<DateTime> utcNowProvider)
    {
        _repository = repository;
        _utcNowProvider = utcNowProvider;
    }

    public async Task<OperationResult<LearningAnalyticsDto>> GetLearningAnalyticsAsync(
        Guid userId,
        string? range,
        CancellationToken cancellationToken = default)
    {
        var normalizedRange = NormalizeRange(range);
        if (normalizedRange is null)
        {
            return OperationResult<LearningAnalyticsDto>.Failure(AnalyticsError.Validation(new Dictionary<string, string[]>
            {
                ["range"] = ["Range must be one of: 30d, 90d, all."],
            }));
        }

        var source = await _repository.GetLearningAnalyticsSourceAsync(userId, cancellationToken);
        var utcToday = ReviewTime.UtcDate(_utcNowProvider());

        var retention = ComputeRetention(source.ReviewHistories, normalizedRange, utcToday);
        var mastery = ComputeMastery(source.ActiveReviewStates);
        var (streak, consistencyDays) = ComputeStreakAndConsistency(
            source.ReviewHistories,
            source.PracticeActivityTimestampsUtc,
            utcToday);
        var forecast = ComputeForecast(source.ActiveReviewStates, utcToday);
        var weakPhonemes = ComputeWeakPhonemes(source.RecentPronunciationAttempts);

        return OperationResult<LearningAnalyticsDto>.Success(new LearningAnalyticsDto(
            normalizedRange,
            utcToday,
            retention,
            mastery,
            streak,
            forecast,
            consistencyDays,
            weakPhonemes));
    }

    private static string? NormalizeRange(string? range)
    {
        if (string.IsNullOrWhiteSpace(range))
        {
            return "90d";
        }

        var trimmed = range.Trim().ToLowerInvariant();
        return trimmed is "30d" or "90d" or "all" ? trimmed : null;
    }

    private static RetentionMetricDto ComputeRetention(
        IReadOnlyList<ReviewHistorySnapshot> histories,
        string range,
        DateOnly utcToday)
    {
        if (range == "all")
        {
            var allTotal = 0;
            var allCorrect = 0;

            foreach (var history in histories)
            {
                var date = ReviewTime.UtcDate(history.ReviewedAtUtc);
                if (date > utcToday)
                {
                    continue;
                }

                allTotal++;
                if (history.Result == FluentAsrsReviewResult.Correct)
                {
                    allCorrect++;
                }
            }

            double? allRate = allTotal == 0
                ? null
                : Math.Round(100.0 * allCorrect / allTotal, 1, MidpointRounding.AwayFromZero);

            return new RetentionMetricDto(allRate, null, allTotal, allCorrect, null);
        }

        var periodDays = range == "30d" ? 30 : 90;
        var currentStart = utcToday.AddDays(-(periodDays - 1));
        var priorStart = utcToday.AddDays(-(periodDays * 2 - 1));
        var priorEnd = utcToday.AddDays(-periodDays);

        var currentTotal = 0;
        var currentCorrect = 0;
        var priorTotal = 0;
        var priorCorrect = 0;

        foreach (var history in histories)
        {
            var date = ReviewTime.UtcDate(history.ReviewedAtUtc);
            if (date >= currentStart && date <= utcToday)
            {
                currentTotal++;
                if (history.Result == FluentAsrsReviewResult.Correct)
                {
                    currentCorrect++;
                }
            }
            else if (date >= priorStart && date <= priorEnd)
            {
                priorTotal++;
                if (history.Result == FluentAsrsReviewResult.Correct)
                {
                    priorCorrect++;
                }
            }
        }

        double? currentRate = currentTotal == 0
            ? null
            : Math.Round(100.0 * currentCorrect / currentTotal, 1, MidpointRounding.AwayFromZero);

        double? delta = null;
        if (currentTotal > 0 && priorTotal > 0)
        {
            var exactCurrent = 100.0 * currentCorrect / currentTotal;
            var exactPrior = 100.0 * priorCorrect / priorTotal;
            delta = Math.Round(exactCurrent - exactPrior, 1, MidpointRounding.AwayFromZero);
        }

        return new RetentionMetricDto(currentRate, delta, currentTotal, currentCorrect, periodDays);
    }

    private static MasteryMetricDto ComputeMastery(IReadOnlyList<ActiveReviewStateSnapshot> states)
    {
        var counts = new int[6];
        foreach (var state in states)
        {
            if (state.Level is >= 0 and <= 5)
            {
                counts[state.Level]++;
            }
        }

        var levels = new MasteryLevelCountDto[6];
        for (var level = 0; level <= 5; level++)
        {
            levels[level] = new MasteryLevelCountDto(level, counts[level]);
        }

        var totalWords = states.Count;
        var masteredCount = counts[4] + counts[5];
        var masteredPercent = totalWords == 0
            ? 0
            : (int)Math.Round(100.0 * masteredCount / totalWords, MidpointRounding.AwayFromZero);

        return new MasteryMetricDto(masteredCount, totalWords, masteredPercent, levels);
    }

    private static (StudyStreakDto Streak, IReadOnlyList<StudyConsistencyDayDto> ConsistencyDays) ComputeStreakAndConsistency(
        IReadOnlyList<ReviewHistorySnapshot> reviewHistories,
        IReadOnlyList<DateTime> practiceTimestampsUtc,
        DateOnly utcToday)
    {
        var activityByDate = new Dictionary<DateOnly, int>();

        foreach (var history in reviewHistories)
        {
            var date = ReviewTime.UtcDate(history.ReviewedAtUtc);
            if (date <= utcToday)
            {
                activityByDate[date] = activityByDate.GetValueOrDefault(date) + 1;
            }
        }

        foreach (var timestamp in practiceTimestampsUtc)
        {
            var date = ReviewTime.UtcDate(timestamp);
            if (date <= utcToday)
            {
                activityByDate[date] = activityByDate.GetValueOrDefault(date) + 1;
            }
        }

        var currentDays = 0;
        var cursor = activityByDate.ContainsKey(utcToday)
            ? utcToday
            : activityByDate.ContainsKey(utcToday.AddDays(-1))
                ? utcToday.AddDays(-1)
                : (DateOnly?)null;

        while (cursor is not null && activityByDate.ContainsKey(cursor.Value))
        {
            currentDays++;
            cursor = cursor.Value.AddDays(-1);
        }

        var longestDays = 0;
        if (activityByDate.Count > 0)
        {
            var orderedDates = activityByDate.Keys.OrderBy(d => d).ToArray();
            var run = 1;
            longestDays = 1;
            for (var i = 1; i < orderedDates.Length; i++)
            {
                if (orderedDates[i] == orderedDates[i - 1].AddDays(1))
                {
                    run++;
                    if (run > longestDays)
                    {
                        longestDays = run;
                    }
                }
                else
                {
                    run = 1;
                }
            }
        }

        var consistencyDays = new StudyConsistencyDayDto[ConsistencyDaysCount];
        var windowStart = utcToday.AddDays(-(ConsistencyDaysCount - 1));
        for (var offset = 0; offset < ConsistencyDaysCount; offset++)
        {
            var date = windowStart.AddDays(offset);
            var count = activityByDate.GetValueOrDefault(date);
            consistencyDays[offset] = new StudyConsistencyDayDto(date, count, GetIntensityLevel(count));
        }

        return (new StudyStreakDto(currentDays, longestDays), consistencyDays);
    }

    private static int GetIntensityLevel(int count) => count switch
    {
        <= 0 => 0,
        <= 4 => 1,
        <= 12 => 2,
        <= 24 => 3,
        _ => 4,
    };

    private static ReviewForecastDto ComputeForecast(
        IReadOnlyList<ActiveReviewStateSnapshot> states,
        DateOnly utcToday)
    {
        var tomorrow = utcToday.AddDays(1);
        var midStart = utcToday.AddDays(2);
        var midEnd = utcToday.AddDays(4);
        var endStart = utcToday.AddDays(5);
        var endEnd = utcToday.AddDays(6);

        var todayCount = 0;
        var tomorrowCount = 0;
        var midCount = 0;
        var endCount = 0;

        foreach (var state in states)
        {
            var due = state.NextReviewDate;
            if (due <= utcToday)
            {
                todayCount++;
            }
            else if (due == tomorrow)
            {
                tomorrowCount++;
            }
            else if (due >= midStart && due <= midEnd)
            {
                midCount++;
            }
            else if (due >= endStart && due <= endEnd)
            {
                endCount++;
            }
        }

        var midLabel = $"{ShortWeekday(midStart)} – {ShortWeekday(midEnd)}";
        var endLabel = endStart.DayOfWeek == DayOfWeek.Saturday && endEnd.DayOfWeek == DayOfWeek.Sunday
            ? "Weekend"
            : $"{ShortWeekday(endStart)} – {ShortWeekday(endEnd)}";

        var buckets = new ReviewForecastBucketDto[]
        {
            new("today", "Today", utcToday, utcToday, todayCount),
            new("tomorrow", "Tomorrow", tomorrow, tomorrow, tomorrowCount),
            new("mid", midLabel, midStart, midEnd, midCount),
            new("end", endLabel, endStart, endEnd, endCount),
        };

        var totalDueNext7Days = todayCount + tomorrowCount + midCount + endCount;
        var averagePerDay = Math.Round(totalDueNext7Days / 7.0, 1, MidpointRounding.AwayFromZero);

        return new ReviewForecastDto(totalDueNext7Days, averagePerDay, buckets);
    }

    private static string ShortWeekday(DateOnly date) =>
        date.ToDateTime(TimeOnly.MinValue).ToString("ddd", CultureInfo.InvariantCulture);

    private static IReadOnlyList<WeakPhonemeDto> ComputeWeakPhonemes(
        IReadOnlyList<PronunciationAttemptSnapshot> attempts)
    {
        var statsByPhoneme = new Dictionary<string, PhonemeAccumulator>(StringComparer.OrdinalIgnoreCase);

        foreach (var attempt in attempts)
        {
            if (string.IsNullOrWhiteSpace(attempt.AssessmentJson))
            {
                continue;
            }

            PronunciationAssessmentDto? assessment;
            try
            {
                assessment = JsonSerializer.Deserialize<PronunciationAssessmentDto>(attempt.AssessmentJson, JsonOptions);
            }
            catch (JsonException)
            {
                continue;
            }

            if (assessment?.Words is null || assessment.Words.Count == 0)
            {
                continue;
            }

            foreach (var wordFeedback in assessment.Words)
            {
                var phonemeUnits = ExtractPhonemeUnits(assessment.FeedbackMode, wordFeedback);
                foreach (var unit in phonemeUnits)
                {
                    if (string.IsNullOrWhiteSpace(unit.Text)
                        || unit.AccuracyScore is null
                        || !double.IsFinite(unit.AccuracyScore.Value))
                    {
                        continue;
                    }

                    var normalized = unit.Text.Trim().Trim('/');
                    if (string.IsNullOrEmpty(normalized))
                    {
                        continue;
                    }

                    if (!statsByPhoneme.TryGetValue(normalized, out var accumulator))
                    {
                        accumulator = new PhonemeAccumulator(normalized);
                        statsByPhoneme[normalized] = accumulator;
                    }

                    accumulator.Add(unit.AccuracyScore.Value, attempt.Word);
                }
            }
        }

        return statsByPhoneme.Values
            .Select(acc => new
            {
                Acc = acc,
                AverageScore = acc.SumScore / acc.Count,
            })
            .OrderBy(item => item.AverageScore)
            .ThenByDescending(item => item.Acc.Count)
            .ThenBy(item => item.Acc.PhonemeKey, StringComparer.Ordinal)
            .Take(MaxWeakPhonemes)
            .Select(item => new WeakPhonemeDto(
                $"/{item.Acc.PhonemeKey}/",
                item.Acc.ExampleWords,
                (int)Math.Round(item.AverageScore, MidpointRounding.AwayFromZero),
                item.Acc.Count))
            .ToArray();
    }

    private static IEnumerable<PronunciationUnitFeedbackDto> ExtractPhonemeUnits(
        string? feedbackMode,
        PronunciationWordFeedbackDto wordFeedback)
    {
        if (wordFeedback.Syllables is { Count: > 0 } syllables
            && syllables.Any(syllable => syllable.Phonemes is { Count: > 0 }))
        {
            return syllables
                .Where(syllable => syllable.Phonemes is not null)
                .SelectMany(syllable => syllable.Phonemes);
        }

        if (string.Equals(feedbackMode, "phoneme", StringComparison.OrdinalIgnoreCase)
            && wordFeedback.Units is { Count: > 0 })
        {
            return wordFeedback.Units;
        }

        return [];
    }

    private sealed class PhonemeAccumulator
    {
        private readonly HashSet<string> _seenWords = new(StringComparer.OrdinalIgnoreCase);
        private readonly List<string> _exampleWords = [];

        public PhonemeAccumulator(string phonemeKey)
        {
            PhonemeKey = phonemeKey;
        }

        public string PhonemeKey { get; }
        public double SumScore { get; private set; }
        public int Count { get; private set; }
        public IReadOnlyList<string> ExampleWords => _exampleWords;

        public void Add(double score, string word)
        {
            SumScore += score;
            Count++;

            var trimmedWord = word.Trim();
            if (!string.IsNullOrEmpty(trimmedWord)
                && _exampleWords.Count < MaxPhonemeExampleWords
                && _seenWords.Add(trimmedWord))
            {
                _exampleWords.Add(trimmedWord);
            }
        }
    }
}
