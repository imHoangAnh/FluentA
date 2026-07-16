using FluentA.Domain.BoundedContexts.Assets.Entities;
using FluentA.Domain.BoundedContexts.Auth.Entities;
using FluentA.Domain.BoundedContexts.Flashcards.Entities;
using FluentA.Domain.BoundedContexts.Journal.Entities;
using FluentA.Domain.BoundedContexts.Kanban.Entities;
using FluentA.Domain.BoundedContexts.Note.Entities;
using FluentA.Domain.BoundedContexts.Notification.Entities;
using FluentA.Domain.BoundedContexts.Pomodoro.Entities;
using FluentA.Domain.BoundedContexts.Practice.Entities;
using FluentA.Domain.BoundedContexts.Review.Entities;
using FluentA.Domain.BoundedContexts.Todo.Entities;
using FluentA.Domain.BoundedContexts.Vocabulary.Entities;
using Microsoft.EntityFrameworkCore;
using CountdownEventEntity = FluentA.Domain.BoundedContexts.Countdown.Entities.CountdownEvent;
using HabitEntity = FluentA.Domain.BoundedContexts.Habit.Entities.Habit;
using HabitEntryEntity = FluentA.Domain.BoundedContexts.Habit.Entities.HabitEntry;

namespace FluentA.Infrastructure.Persistence;

public sealed class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Asset> Assets => Set<Asset>();
    public DbSet<LegacyAssetDeletionQueueItem> LegacyAssetDeletionQueue => Set<LegacyAssetDeletionQueueItem>();
    public DbSet<VocabBoard> Boards => Set<VocabBoard>();
    public DbSet<VocabPage> Pages => Set<VocabPage>();
    public DbSet<VocabWord> Words => Set<VocabWord>();
    public DbSet<VocabBoardPreference> VocabBoardPreferences => Set<VocabBoardPreference>();
    public DbSet<FlashcardDeck> FlashcardDecks => Set<FlashcardDeck>();
    public DbSet<FlashcardCard> FlashcardCards => Set<FlashcardCard>();
    public DbSet<WordReviewState> WordReviewStates => Set<WordReviewState>();
    public DbSet<WordReviewHistory> WordReviewHistories => Set<WordReviewHistory>();
    public DbSet<ReviewSession> ReviewSessions => Set<ReviewSession>();
    public DbSet<ReviewSessionItem> ReviewSessionItems => Set<ReviewSessionItem>();
    public DbSet<PracticeSessionSummary> PracticeSessionSummaries => Set<PracticeSessionSummary>();
    public DbSet<PracticeSettings> PracticeSettings => Set<PracticeSettings>();
    public DbSet<ReviewSettings> ReviewSettings => Set<ReviewSettings>();
    public DbSet<HabitEntity> Habits => Set<HabitEntity>();
    public DbSet<HabitEntryEntity> HabitEntries => Set<HabitEntryEntity>();
    public DbSet<TodoItem> TodoItems => Set<TodoItem>();
    public DbSet<CountdownEventEntity> CountdownEvents => Set<CountdownEventEntity>();
    public DbSet<FluentA.Domain.BoundedContexts.Countdown.Entities.CountdownAlert> CountdownAlerts => Set<FluentA.Domain.BoundedContexts.Countdown.Entities.CountdownAlert>();
    public DbSet<JournalEntry> JournalEntries => Set<JournalEntry>();
    public DbSet<NoteBoard> NoteBoards => Set<NoteBoard>();
    public DbSet<NotePage> NotePages => Set<NotePage>();
    public DbSet<NotePageAsset> NotePageAssets => Set<NotePageAsset>();
    public DbSet<KanbanBoard> KanbanBoards => Set<KanbanBoard>();
    public DbSet<KanbanColumn> KanbanColumns => Set<KanbanColumn>();
    public DbSet<KanbanCard> KanbanCards => Set<KanbanCard>();
    public DbSet<PomodoroConfig> PomodoroConfigs => Set<PomodoroConfig>();
    public DbSet<PomodoroSession> PomodoroSessions => Set<PomodoroSession>();
    public DbSet<Notification> Notifications => Set<Notification>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
