using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddProductivityJobIdempotency : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "last_reminder_sent_on",
                table: "habits",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "alerted_at",
                table: "countdown_events",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "last_reminder_sent_on",
                table: "habits");

            migrationBuilder.DropColumn(
                name: "alerted_at",
                table: "countdown_events");
        }
    }
}
