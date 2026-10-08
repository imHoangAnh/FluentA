using FluentA.Application.BoundedContexts.Countdown;
using FluentA.Application.BoundedContexts.Habit;
using FluentA.Application.BoundedContexts.Journal;
using FluentA.Application.BoundedContexts.Note;
using FluentA.Application.BoundedContexts.Notification;
using FluentA.Application.BoundedContexts.Pomodoro;
using FluentA.Application.BoundedContexts.Project;
using FluentA.Application.BoundedContexts.Todo;
using FluentA.Infrastructure.ContentProcessing.Journal;
using FluentA.Infrastructure.ContentProcessing.Note;
using FluentA.Infrastructure.Persistence.Repositories.Countdown;
using FluentA.Infrastructure.Persistence.Repositories.Habit;
using FluentA.Infrastructure.Persistence.Repositories.Journal;
using FluentA.Infrastructure.Persistence.Repositories.Note;
using FluentA.Infrastructure.Persistence.Repositories.Notification;
using FluentA.Infrastructure.Persistence.Repositories.Pomodoro;
using FluentA.Infrastructure.Persistence.Repositories.Project;
using FluentA.Infrastructure.Persistence.Repositories.Todo;
using FluentA.Infrastructure.RuntimeState.Pomodoro;
using Microsoft.Extensions.DependencyInjection;

namespace FluentA.Infrastructure;

internal static class ProductivityServiceRegistrationExtensions
{
    public static IServiceCollection AddFluentAProductivityServices(this IServiceCollection services)
    {
        services.AddScoped<ITodoRepository, EfTodoRepository>();
        services.AddScoped<ITodoService, TodoService>();
        services.AddScoped<ICountdownRepository, EfCountdownRepository>();
        services.AddScoped<ICountdownService, CountdownService>();
        services.AddScoped<IHabitRepository, EfHabitRepository>();
        services.AddScoped<IHabitService, HabitService>();
        services.AddScoped<IJournalRepository, EfJournalRepository>();
        services.AddSingleton<IJournalContentProcessor, JournalContentProcessor>();
        services.AddScoped<IJournalService, JournalService>();
        services.AddScoped<INoteRepository, EfNoteRepository>();
        services.AddScoped<INoteContentProcessor, NoteContentProcessor>();
        services.AddScoped<INoteService, NoteService>();
        services.AddScoped<INotificationRepository, EfNotificationRepository>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<IProjectRepository, EfProjectRepository>();
        services.AddScoped<IProjectService, ProjectService>();
        services.AddScoped<IPomodoroRepository, EfPomodoroRepository>();
        services.AddSingleton<IPomodoroCurrentStateStore, MemoryPomodoroCurrentStateStore>();
        services.AddScoped<IPomodoroService, PomodoroService>();
        return services;
    }
}
