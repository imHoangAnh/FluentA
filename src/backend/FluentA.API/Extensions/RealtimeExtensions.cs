using FluentA.API.Hubs;
using FluentA.Application.BoundedContexts.Flashcards;
using FluentA.Application.BoundedContexts.Habit;
using FluentA.Application.BoundedContexts.Pomodoro;
using FluentA.Application.BoundedContexts.Project;
using FluentA.Application.BoundedContexts.Todo;

namespace FluentA.API.Extensions;

public static class RealtimeExtensions
{
    public static IServiceCollection AddFluentARealtime(this IServiceCollection services)
    {
        services.AddSignalR();
        services.AddScoped<IFlashcardSyncNotifier, SignalRFlashcardSyncNotifier>();
        services.AddScoped<ITodoSyncNotifier, SignalRTodoSyncNotifier>();
        services.AddScoped<IHabitSyncNotifier, SignalRHabitSyncNotifier>();
        services.AddScoped<IProjectSyncNotifier, SignalRProjectSyncNotifier>();
        services.AddScoped<IPomodoroSyncNotifier, SignalRPomodoroSyncNotifier>();
        return services;
    }
}
