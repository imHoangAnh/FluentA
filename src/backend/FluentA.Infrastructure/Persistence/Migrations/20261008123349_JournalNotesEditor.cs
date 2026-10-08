using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class JournalNotesEditor : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_journal_user_id_date",
                table: "journal");

            migrationBuilder.CreateTable(
                name: "journal_entry_assets",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    journal_entry_id = table.Column<Guid>(type: "uuid", nullable: false),
                    asset_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_journal_entry_assets", x => x.id);
                    table.ForeignKey(
                        name: "FK_journal_entry_assets_assets_asset_id",
                        column: x => x.asset_id,
                        principalTable: "assets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_journal_entry_assets_journal_journal_entry_id",
                        column: x => x.journal_entry_id,
                        principalTable: "journal",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ux_journal_user_date_active",
                table: "journal",
                columns: new[] { "user_id", "date" },
                unique: true,
                filter: "deleted_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_journal_entry_assets_asset_id",
                table: "journal_entry_assets",
                column: "asset_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_journal_entry_assets_journal_entry_id_deleted_at",
                table: "journal_entry_assets",
                columns: new[] { "journal_entry_id", "deleted_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "journal_entry_assets");

            migrationBuilder.DropIndex(
                name: "ux_journal_user_date_active",
                table: "journal");

            migrationBuilder.CreateIndex(
                name: "IX_journal_user_id_date",
                table: "journal",
                columns: new[] { "user_id", "date" });
        }
    }
}
