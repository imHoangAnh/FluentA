using FluentA.API.Hubs;
using FluentA.Application.BoundedContexts.Pomodoro;

namespace FluentA.API.Extensions;

public static class RealtimeExtensions
{
    public static IServiceCollection AddFluentARealtime(this IServiceCollection services)
    {
        services.AddSignalR();
        services.AddScoped<IPomodoroSyncNotifier, SignalRPomodoroSyncNotifier>();
        return services;
    }
}
