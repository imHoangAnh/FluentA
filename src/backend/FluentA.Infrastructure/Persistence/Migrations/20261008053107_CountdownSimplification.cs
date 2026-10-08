using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class CountdownSimplification : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "countdown_alerts");

            migrationBuilder.DropIndex(
                name: "IX_countdowns_cover_asset_id",
                table: "countdowns");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "countdowns");

            migrationBuilder.DropColumn(
                name: "repeat_pattern",
                table: "countdowns");

            migrationBuilder.CreateIndex(
                name: "IX_countdowns_cover_asset_id",
                table: "countdowns",
                column: "cover_asset_id",
                unique: true,
                filter: "\"cover_asset_id\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_countdowns_cover_asset_id",
                table: "countdowns");

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "countdowns",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "repeat_pattern",
                table: "countdowns",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "countdown_alerts",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    alert_day = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    alert_time = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                    countdown_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    fired_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    scheduled_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_countdown_alerts", x => x.id);
                    table.ForeignKey(
                        name: "FK_countdown_alerts_countdowns_countdown_id",
                        column: x => x.countdown_id,
                        principalTable: "countdowns",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_countdowns_cover_asset_id",
                table: "countdowns",
                column: "cover_asset_id",
                unique: true,
                filter: "\"cover_asset_id\" IS NOT NULL AND \"deleted_at\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_countdown_alerts_countdown_id_scheduled_at_utc",
                table: "countdown_alerts",
                columns: new[] { "countdown_id", "scheduled_at_utc" });
        }
    }
}
