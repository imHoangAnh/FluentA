using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class CountdownsRedesign : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_countdown_events",
                table: "countdown_events");

            migrationBuilder.DropColumn(
                name: "alerted_at",
                table: "countdown_events");

            migrationBuilder.DropColumn(
                name: "color",
                table: "countdown_events");

            migrationBuilder.DropColumn(
                name: "icon",
                table: "countdown_events");

            migrationBuilder.RenameTable(
                name: "countdown_events",
                newName: "countdowns");

            migrationBuilder.RenameIndex(
                name: "IX_countdown_events_user_id_target_date",
                table: "countdowns",
                newName: "IX_countdowns_user_id_target_date");

            migrationBuilder.AddColumn<DateTime>(
                name: "target_date_v2",
                table: "countdowns",
                type: "date",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE countdowns
                SET target_date_v2 = (target_date AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
                """);

            migrationBuilder.DropColumn(
                name: "target_date",
                table: "countdowns");

            migrationBuilder.RenameColumn(
                name: "target_date_v2",
                table: "countdowns",
                newName: "target_date");

            migrationBuilder.AlterColumn<DateTime>(
                name: "target_date",
                table: "countdowns",
                type: "date",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "date",
                oldNullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "cover_asset_id",
                table: "countdowns",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_countdowns",
                table: "countdowns",
                column: "id");

            migrationBuilder.CreateTable(
                name: "countdown_alerts",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    countdown_id = table.Column<Guid>(type: "uuid", nullable: false),
                    alert_day = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    alert_time = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                    scheduled_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    fired_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
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
                name: "IX_countdown_alerts_countdown_id_scheduled_at_utc",
                table: "countdown_alerts",
                columns: new[] { "countdown_id", "scheduled_at_utc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "countdown_alerts");

            migrationBuilder.DropPrimaryKey(
                name: "PK_countdowns",
                table: "countdowns");

            migrationBuilder.DropColumn(
                name: "cover_asset_id",
                table: "countdowns");

            migrationBuilder.RenameTable(
                name: "countdowns",
                newName: "countdown_events");

            migrationBuilder.RenameIndex(
                name: "IX_countdowns_user_id_target_date",
                table: "countdown_events",
                newName: "IX_countdown_events_user_id_target_date");

            migrationBuilder.AddColumn<DateTime>(
                name: "target_date_v2",
                table: "countdown_events",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE countdown_events
                SET target_date_v2 = target_date::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh';
                """);

            migrationBuilder.DropColumn(
                name: "target_date",
                table: "countdown_events");

            migrationBuilder.RenameColumn(
                name: "target_date_v2",
                table: "countdown_events",
                newName: "target_date");

            migrationBuilder.AlterColumn<DateTime>(
                name: "target_date",
                table: "countdown_events",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "alerted_at",
                table: "countdown_events",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "color",
                table: "countdown_events",
                type: "character varying(7)",
                maxLength: 7,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "icon",
                table: "countdown_events",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_countdown_events",
                table: "countdown_events",
                column: "id");
        }
    }
}
