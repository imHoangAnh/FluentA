using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddNotePageAssetOwnership : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "note_page_assets",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    note_page_id = table.Column<Guid>(type: "uuid", nullable: false),
                    asset_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_note_page_assets", x => x.id);
                    table.ForeignKey(
                        name: "FK_note_page_assets_assets_asset_id",
                        column: x => x.asset_id,
                        principalTable: "assets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_note_page_assets_note_pages_note_page_id",
                        column: x => x.note_page_id,
                        principalTable: "note_pages",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_note_page_assets_asset_id",
                table: "note_page_assets",
                column: "asset_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_note_page_assets_note_page_id_deleted_at",
                table: "note_page_assets",
                columns: new[] { "note_page_id", "deleted_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "note_page_assets");
        }
    }
}
