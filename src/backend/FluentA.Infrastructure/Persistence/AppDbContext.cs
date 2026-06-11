using FluentA.Domain.BoundedContexts.Auth.Entities;
using FluentA.Domain.BoundedContexts.Flashcards.Entities;
using FluentA.Domain.BoundedContexts.Todo.Entities;
using FluentA.Domain.BoundedContexts.Vocabulary.Entities;
using Microsoft.EntityFrameworkCore;
using CountdownEventEntity = FluentA.Domain.BoundedContexts.Countdown.Entities.CountdownEvent;

namespace FluentA.Infrastructure.Persistence;

public sealed class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<VocabBoard> Boards => Set<VocabBoard>();
    public DbSet<VocabPage> Pages => Set<VocabPage>();
    public DbSet<VocabWord> Words => Set<VocabWord>();
    public DbSet<VocabCustomColumn> VocabCustomColumns => Set<VocabCustomColumn>();
    public DbSet<VocabCustomValue> VocabCustomValues => Set<VocabCustomValue>();
    public DbSet<VocabColumnVisibility> VocabColumnVisibility => Set<VocabColumnVisibility>();
    public DbSet<FlashcardDeck> FlashcardDecks => Set<FlashcardDeck>();
    public DbSet<FlashcardCard> FlashcardCards => Set<FlashcardCard>();
    public DbSet<CardReview> CardReviews => Set<CardReview>();
    public DbSet<ReviewSettings> ReviewSettings => Set<ReviewSettings>();
    public DbSet<TodoItem> TodoItems => Set<TodoItem>();
    public DbSet<CountdownEventEntity> CountdownEvents => Set<CountdownEventEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
