using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddHabitGoalsRemindersAndSelectedDay : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Product-approved reset for US-HABIT-006. Keep the deletion order and
            // table scope explicit so this migration cannot cascade into other data.
            migrationBuilder.Sql("DELETE FROM habit_entries;");
            migrationBuilder.Sql("DELETE FROM habits;");

            migrationBuilder.AddColumn<int>(
                name: "goal_days",
                table: "habits",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "reminder_time",
                table: "habits",
                type: "time(0) without time zone",
                precision: 0,
                nullable: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "start_date",
                table: "habits",
                type: "date",
                nullable: false);

            migrationBuilder.CreateIndex(
                name: "ix_habits_reminder_due",
                table: "habits",
                columns: new[] { "reminder_enabled", "reminder_time", "last_reminder_sent_on" });

            migrationBuilder.AddCheckConstraint(
                name: "ck_habits_goal_days_positive",
                table: "habits",
                sql: "goal_days IS NULL OR goal_days > 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // The forward reset is intentionally irreversible. Down removes only
            // the schema additions and cannot restore deleted Habit data.
            migrationBuilder.DropIndex(
                name: "ix_habits_reminder_due",
                table: "habits");

            migrationBuilder.DropCheckConstraint(
                name: "ck_habits_goal_days_positive",
                table: "habits");

            migrationBuilder.DropColumn(
                name: "goal_days",
                table: "habits");

            migrationBuilder.DropColumn(
                name: "reminder_time",
                table: "habits");

            migrationBuilder.DropColumn(
                name: "start_date",
                table: "habits");
        }
    }
}
