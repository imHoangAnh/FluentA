using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class HabitSimplification : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_habits_reminder_due",
                table: "habits");

            migrationBuilder.DropColumn(
                name: "last_reminder_sent_on",
                table: "habits");

            migrationBuilder.DropColumn(
                name: "reminder_enabled",
                table: "habits");

            migrationBuilder.DropColumn(
                name: "reminder_time",
                table: "habits");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "last_reminder_sent_on",
                table: "habits",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "reminder_enabled",
                table: "habits",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "reminder_time",
                table: "habits",
                type: "time(0) without time zone",
                precision: 0,
                nullable: false,
                defaultValue: new TimeOnly(0, 0, 0));

            migrationBuilder.CreateIndex(
                name: "ix_habits_reminder_due",
                table: "habits",
                columns: new[] { "reminder_enabled", "reminder_time", "last_reminder_sent_on" });
        }
    }
}
