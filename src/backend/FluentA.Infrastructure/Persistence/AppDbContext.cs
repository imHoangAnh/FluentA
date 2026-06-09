using FluentA.Domain.BoundedContexts.Auth.Entities;
using FluentA.Domain.BoundedContexts.Flashcards.Entities;
using FluentA.Domain.BoundedContexts.Vocabulary.Entities;
using Microsoft.EntityFrameworkCore;

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
    public DbSet<FlashcardDeck> FlashcardDecks => Set<FlashcardDeck>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
