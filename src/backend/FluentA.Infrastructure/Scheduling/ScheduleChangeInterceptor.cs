using System.Data.Common;
using System.Runtime.CompilerServices;
using FluentA.Domain.BoundedContexts.Countdown.Entities;
using FluentA.Domain.BoundedContexts.Habit.Entities;
using FluentA.Domain.BoundedContexts.Todo.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using CountdownEvent = FluentA.Domain.BoundedContexts.Countdown.Entities.CountdownEvent;

namespace FluentA.Infrastructure.Scheduling;

public sealed class ScheduleChangeInterceptor(ScheduleChangeSignal signal) : SaveChangesInterceptor
{
    private sealed class PendingChange;
    private readonly ConditionalWeakTable<DbContext, PendingChange> _pending = new();

    private void Capture(DbContext? context)
    {
        if (context is not null && context.ChangeTracker.Entries().Any(entry =>
            entry.State is EntityState.Added or EntityState.Modified or EntityState.Deleted
            && entry.Entity is TodoItem or Habit or HabitEntry or CountdownEvent or CountdownAlert))
            _pending.GetValue(context, _ => new PendingChange());
    }

    internal void Committed(DbContext? context)
    {
        if (context is not null && _pending.Remove(context)) signal.Notify();
    }

    internal void Discard(DbContext? context)
    {
        if (context is not null) _pending.Remove(context);
    }

    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        Capture(eventData.Context);
        return result;
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData,
        InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        Capture(eventData.Context);
        return ValueTask.FromResult(result);
    }

    public override int SavedChanges(SaveChangesCompletedEventData eventData, int result)
    {
        if (eventData.Context?.Database.CurrentTransaction is null) Committed(eventData.Context);
        return result;
    }

    public override ValueTask<int> SavedChangesAsync(SaveChangesCompletedEventData eventData, int result,
        CancellationToken cancellationToken = default)
    {
        if (eventData.Context?.Database.CurrentTransaction is null) Committed(eventData.Context);
        return ValueTask.FromResult(result);
    }

    public override void SaveChangesFailed(DbContextErrorEventData eventData) => Discard(eventData.Context);

    public override Task SaveChangesFailedAsync(DbContextErrorEventData eventData, CancellationToken cancellationToken = default)
    {
        Discard(eventData.Context);
        return Task.CompletedTask;
    }
}

/// <summary>SavedChanges is not a commit when the caller owns an explicit transaction.</summary>
public sealed class ScheduleTransactionInterceptor(ScheduleChangeInterceptor changes) : DbTransactionInterceptor
{
    public override void TransactionCommitted(DbTransaction transaction, TransactionEndEventData eventData)
        => changes.Committed(eventData.Context);

    public override Task TransactionCommittedAsync(DbTransaction transaction, TransactionEndEventData eventData,
        CancellationToken cancellationToken = default)
    {
        changes.Committed(eventData.Context);
        return Task.CompletedTask;
    }

    public override void TransactionRolledBack(DbTransaction transaction, TransactionEndEventData eventData)
        => changes.Discard(eventData.Context);

    public override Task TransactionRolledBackAsync(DbTransaction transaction, TransactionEndEventData eventData,
        CancellationToken cancellationToken = default)
    {
        changes.Discard(eventData.Context);
        return Task.CompletedTask;
    }
}
