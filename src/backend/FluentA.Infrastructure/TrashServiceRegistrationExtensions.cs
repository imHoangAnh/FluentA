using FluentA.Application.BoundedContexts.Countdown;
using FluentA.Application.BoundedContexts.Habit;
using FluentA.Application.BoundedContexts.Journal;
using FluentA.Application.BoundedContexts.Note;
using FluentA.Application.BoundedContexts.Project;
using FluentA.Application.BoundedContexts.Review;
using FluentA.Application.BoundedContexts.Trash;
using FluentA.Application.BoundedContexts.Vocabulary;
using FluentA.Application.BoundedContexts.Todo;
using FluentA.Infrastructure.Persistence.Repositories.Review;
using FluentA.Infrastructure.Persistence.Repositories.Trash;
using FluentA.Infrastructure.Persistence.Transactions;
using Microsoft.Extensions.DependencyInjection;

namespace FluentA.Infrastructure;

internal static class TrashServiceRegistrationExtensions
{
    public static IServiceCollection AddFluentATrashServices(this IServiceCollection services)
    {
        services.AddScoped<ITrashRepository, EfTrashRepository>();
        services.AddScoped<ITrashTransaction, EfTrashTransaction>();
        services.AddScoped<ITrashParticipant, TodoTrashParticipant>();
        services.AddScoped<ITrashParticipant, NoteTrashParticipant>();
        services.AddScoped<ITrashParticipant, VocabularyTrashParticipant>();
        services.AddScoped<ITrashParticipant, LevelFiveTrashParticipant>();
        services.AddScoped<ITrashParticipant, CountdownTrashParticipant>();
        services.AddScoped<ITrashParticipant, HabitTrashParticipant>();
        services.AddScoped<ITrashParticipant, JournalTrashParticipant>();
        services.AddScoped<ITrashParticipant, ProjectTrashParticipant>();
        services.AddScoped<ITrashService, TrashService>();
        return services;
    }
}
