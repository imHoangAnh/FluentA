using FluentA.Domain.BoundedContexts.Vocabulary.Entities;
using FluentA.Infrastructure.Persistence;
using FluentA.Infrastructure.Persistence.Repositories.Vocabulary;
using Microsoft.EntityFrameworkCore;

namespace FluentA.Infrastructure.UnitTests;

public sealed class VocabularyRepositoryCommitTests
{
    [Fact]
    public async Task BoardAndPreferencesAreStagedUntilSaveChanges()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=127.0.0.1;Port=1;Database=staging_test;Username=test;Password=test")
            .Options;
        await using var dbContext = new AppDbContext(options);
        var repository = new VocabularyRepository(dbContext);
        var userId = Guid.NewGuid();
        var board = VocabBoard.Create(userId, "IELTS", "en");
        var preference = VocabBoardPreference.Create(userId, board.Id, [],
            ["word", "meaning", "ipaPronunciation", "context", "type", "example", "synonyms", "antonyms"],
            new Dictionary<string, int>());

        await repository.AddBoardAsync(board);
        await repository.AddBoardPreferenceAsync(preference);
        Assert.Equal(EntityState.Added, dbContext.Entry(board).State);
        Assert.Equal(EntityState.Added, dbContext.Entry(preference).State);
    }

    [Fact]
    public async Task UpdateBoardStagesChangesWithoutSaving()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=127.0.0.1;Port=1;Database=staging_test;Username=test;Password=test")
            .Options;
        await using var dbContext = new AppDbContext(options);
        var repository = new VocabularyRepository(dbContext);
        var board = VocabBoard.Create(Guid.NewGuid(), "IELTS", "en");
        dbContext.Attach(board);

        board.Update("Updated", "en");
        await repository.UpdateBoardAsync(board);
        Assert.Equal(EntityState.Modified, dbContext.Entry(board).State);
    }
}
