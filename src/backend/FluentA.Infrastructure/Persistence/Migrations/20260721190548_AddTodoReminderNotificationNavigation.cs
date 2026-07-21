using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTodoReminderNotificationNavigation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "reminder_scheduled_at_utc",
                table: "todo_items",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "reminder_sent_at_utc",
                table: "todo_items",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "reminder_time",
                table: "todo_items",
                type: "time without time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "reminder_time_zone_id",
                table: "todo_items",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "action_path",
                table: "notifications",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_todo_items_reminder_scheduled_at_utc",
                table: "todo_items",
                column: "reminder_scheduled_at_utc",
                filter: "reminder_scheduled_at_utc IS NOT NULL AND reminder_sent_at_utc IS NULL AND is_completed = FALSE AND deleted_at IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_todo_items_reminder_scheduled_at_utc",
                table: "todo_items");

            migrationBuilder.DropColumn(
                name: "reminder_scheduled_at_utc",
                table: "todo_items");

            migrationBuilder.DropColumn(
                name: "reminder_sent_at_utc",
                table: "todo_items");

            migrationBuilder.DropColumn(
                name: "reminder_time",
                table: "todo_items");

            migrationBuilder.DropColumn(
                name: "reminder_time_zone_id",
                table: "todo_items");

            migrationBuilder.DropColumn(
                name: "action_path",
                table: "notifications");
        }
    }
}
