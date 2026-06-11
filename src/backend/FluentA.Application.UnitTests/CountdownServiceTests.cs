using FluentA.Application.BoundedContexts.Countdown;
using FluentA.Application.BoundedContexts.Countdown.DTOs;
using CountdownEventEntity = FluentA.Domain.BoundedContexts.Countdown.Entities.CountdownEvent;

namespace FluentA.Application.UnitTests;

public sealed class CountdownServiceTests
{
    [Fact]
    public async Task CreateAsync_ValidatesInputAndPersistsCountdown()
    {
        var repository = new FakeCountdownRepository();
        var service = new CountdownService(repository);
        var userId = Guid.NewGuid();
        var target = DateTime.UtcNow.AddDays(12).ToString("O");

        var result = await service.CreateAsync(userId, new CreateCountdownEventRequest(" IELTS Exam ", target, "#4F46E5", "IELTS"));

        Assert.True(result.IsSuccess);
        Assert.Equal("IELTS Exam", result.Value!.Name);
        Assert.Equal("#4F46E5", result.Value.Color);
        Assert.Single(repository.Events);
        Assert.Equal(userId, repository.Events[0].UserId);
    }

    [Fact]
    public async Task CreateAsync_ReturnsValidationErrors()
    {
        var service = new CountdownService(new FakeCountdownRepository());

        var result = await service.CreateAsync(Guid.NewGuid(), new CreateCountdownEventRequest("", "not-a-date", "blue", new string('x', 17)));

        Assert.False(result.IsSuccess);
        var error = Assert.IsType<CountdownError>(result.Error);
        Assert.Equal("VALIDATION_ERROR", error.Code);
        Assert.Equal(422, error.StatusCode);
    }

    [Fact]
    public async Task ListAsync_ReturnsRepositoryOrderAndCompletedState()
    {
        var repository = new FakeCountdownRepository();
        var userId = Guid.NewGuid();
        var later = CountdownEventEntity.Create(userId, "Later", DateTime.UtcNow.AddDays(5));
        var past = CountdownEventEntity.Create(userId, "Past", DateTime.UtcNow.AddMinutes(-1));
        repository.Events.Add(later);
        repository.Events.Add(past);
        var service = new CountdownService(repository);

        var result = await service.ListAsync(userId);

        Assert.True(result.IsSuccess);
        var items = result.Value!;
        Assert.Equal(["Past", "Later"], items.Select(item => item.Name).ToArray());
        Assert.True(items[0].IsCompleted);
    }

    [Fact]
    public async Task UpdateAsync_UpdatesOnlySuppliedFields()
    {
        var repository = new FakeCountdownRepository();
        var userId = Guid.NewGuid();
        var countdownEvent = CountdownEventEntity.Create(userId, "Exam", DateTime.UtcNow.AddDays(1), "#4F46E5", "IELTS");
        repository.Events.Add(countdownEvent);
        var service = new CountdownService(repository);

        var result = await service.UpdateAsync(userId, countdownEvent.Id, new UpdateCountdownEventRequest(Name: "Final exam"));

        Assert.True(result.IsSuccess);
        Assert.Equal("Final exam", result.Value!.Name);
        Assert.Equal("#4F46E5", result.Value.Color);
        Assert.Equal("IELTS", result.Value.Icon);
    }

    [Fact]
    public async Task UpdateAndDeleteAsync_ReturnNotFoundForForeignCountdowns()
    {
        var repository = new FakeCountdownRepository();
        var ownerId = Guid.NewGuid();
        var foreignId = Guid.NewGuid();
        var countdownEvent = CountdownEventEntity.Create(ownerId, "Exam", DateTime.UtcNow.AddDays(1));
        repository.Events.Add(countdownEvent);
        var service = new CountdownService(repository);

        var update = await service.UpdateAsync(foreignId, countdownEvent.Id, new UpdateCountdownEventRequest(Name: "Nope"));
        var delete = await service.DeleteAsync(foreignId, countdownEvent.Id);

        Assert.False(update.IsSuccess);
        Assert.Equal("COUNTDOWN_NOT_FOUND", Assert.IsType<CountdownError>(update.Error).Code);
        Assert.False(delete.IsSuccess);
        Assert.Equal("COUNTDOWN_NOT_FOUND", Assert.IsType<CountdownError>(delete.Error).Code);
    }

    [Fact]
    public async Task DeleteAsync_SoftDeletesOwnedCountdown()
    {
        var repository = new FakeCountdownRepository();
        var userId = Guid.NewGuid();
        var countdownEvent = CountdownEventEntity.Create(userId, "Exam", DateTime.UtcNow.AddDays(1));
        repository.Events.Add(countdownEvent);
        var service = new CountdownService(repository);

        var result = await service.DeleteAsync(userId, countdownEvent.Id);

        Assert.True(result.IsSuccess);
        Assert.NotNull(countdownEvent.DeletedAt);
    }

    private sealed class FakeCountdownRepository : ICountdownRepository
    {
        public List<CountdownEventEntity> Events { get; } = [];

        public Task<IReadOnlyList<CountdownEventEntity>> ListAsync(Guid userId, CancellationToken cancellationToken = default)
        {
            IReadOnlyList<CountdownEventEntity> events = Events
                .Where(countdownEvent => countdownEvent.UserId == userId && countdownEvent.DeletedAt is null)
                .OrderBy(countdownEvent => countdownEvent.TargetDate)
                .ThenBy(countdownEvent => countdownEvent.CreatedAt)
                .ToList();
            return Task.FromResult(events);
        }

        public Task<CountdownEventEntity?> GetAsync(Guid userId, Guid countdownId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Events.FirstOrDefault(countdownEvent =>
                countdownEvent.UserId == userId
                && countdownEvent.Id == countdownId
                && countdownEvent.DeletedAt is null));
        }

        public Task AddAsync(CountdownEventEntity countdownEvent, CancellationToken cancellationToken = default)
        {
            Events.Add(countdownEvent);
            return Task.CompletedTask;
        }

        public Task UpdateAsync(CountdownEventEntity countdownEvent, CancellationToken cancellationToken = default)
        {
            return Task.CompletedTask;
        }
    }
}
