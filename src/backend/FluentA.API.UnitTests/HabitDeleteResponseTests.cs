using System.Security.Claims;
using System.Text.Json;
using FluentA.API.Controllers;
using FluentA.Application.BoundedContexts.Habit;
using FluentA.Application.BoundedContexts.Habit.DTOs;
using FluentA.Application.Common;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace FluentA.API.UnitTests;

public sealed class HabitDeleteResponseTests
{
    [Theory]
    [InlineData(true, 200)]
    [InlineData(false, 404)]
    public async Task Delete_UsesAuthenticatedOwner_AndReturnsDeletionOrNotFound(bool found, int expectedStatus)
    {
        var owner = Guid.NewGuid();
        var id = Guid.NewGuid();
        var service = new DeleteOnlyHabitService(found);
        var controller = new HabitsController(service)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, owner.ToString())], "test"))
                }
            }
        };

        var response = Assert.IsAssignableFrom<ObjectResult>(await controller.Delete(id, CancellationToken.None));
        Assert.Equal(owner, service.Owner);
        Assert.Equal(id, service.HabitId);
        Assert.Equal(expectedStatus, response.StatusCode);
        using var json = JsonDocument.Parse(JsonSerializer.Serialize(response.Value, new JsonSerializerOptions(JsonSerializerDefaults.Web)));
        if (found)
        {
            var data = json.RootElement.GetProperty("data");
            Assert.True(data.GetProperty("deleted").GetBoolean());
            Assert.False(data.TryGetProperty("entityKind", out _));
        }
        else
        {
            Assert.Contains("HABIT_NOT_FOUND", json.RootElement.GetRawText());
        }
    }

    private sealed class DeleteOnlyHabitService(bool found) : IHabitService
    {
        public Guid Owner { get; private set; }
        public Guid HabitId { get; private set; }

        public Task<OperationResult<bool>> DeleteAsync(Guid userId, Guid habitId, CancellationToken cancellationToken = default)
        {
            Owner = userId;
            HabitId = habitId;
            return Task.FromResult(found ? OperationResult<bool>.Success(true) : OperationResult<bool>.Failure(HabitError.NotFound()));
        }

        public Task<OperationResult<IReadOnlyList<HabitDto>>> ListAsync(Guid userId, string? timeZoneId, string? month = null, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<OperationResult<HabitDto>> CreateAsync(Guid userId, CreateHabitRequest request, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<OperationResult<HabitDto>> UpdateAsync(Guid userId, Guid habitId, UpdateHabitRequest request, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<OperationResult<IReadOnlyList<HabitEntryDto>>> ListEntriesAsync(Guid userId, Guid habitId, string? month, string? timeZoneId, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<OperationResult<HabitEntryToggleDto>> ToggleEntryAsync(Guid userId, Guid habitId, ToggleHabitEntryRequest request, CancellationToken cancellationToken = default) => throw new NotSupportedException();
    }
}
