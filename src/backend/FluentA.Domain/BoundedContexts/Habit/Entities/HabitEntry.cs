using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Habit.Entities;

public sealed class HabitEntry : BaseEntity
{
    private HabitEntry()
    {
    }

    private HabitEntry(Guid habitId, DateTime date)
    {
        if (habitId == Guid.Empty)
        {
            throw new ArgumentException("Habit id is required.", nameof(habitId));
        }

        HabitId = habitId;
        Date = NormalizeDate(date);
    }

    public Guid HabitId { get; private set; }
    public DateTime Date { get; private set; }

    public static HabitEntry Create(Guid habitId, DateTime date)
    {
        return new HabitEntry(habitId, date);
    }

    private static DateTime NormalizeDate(DateTime date)
    {
        return DateTime.SpecifyKind(date.Date, DateTimeKind.Utc);
    }
}
