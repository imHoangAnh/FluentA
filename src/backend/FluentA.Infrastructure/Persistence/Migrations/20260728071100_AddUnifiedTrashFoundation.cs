using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddUnifiedTrashFoundation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "trash_entries",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    entity_kind = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    entity_id = table.Column<Guid>(type: "uuid", nullable: false),
                    display_name = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: false),
                    original_location = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    trashed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    purge_after_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    state = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_trash_entries", x => x.id);
                    table.ForeignKey(
                        name: "FK_trash_entries_auth_users_user_id",
                        column: x => x.user_id,
                        principalTable: "auth_users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_trash_entries_entity_kind_entity_id",
                table: "trash_entries",
                columns: new[] { "entity_kind", "entity_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_trash_entries_state_purge_after_at",
                table: "trash_entries",
                columns: new[] { "state", "purge_after_at" });

            migrationBuilder.CreateIndex(
                name: "IX_trash_entries_user_id_state_trashed_at",
                table: "trash_entries",
                columns: new[] { "user_id", "state", "trashed_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "trash_entries");
        }
    }
}
