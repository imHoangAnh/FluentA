using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddKanbanBoardFoundation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "kanban_boards",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_kanban_boards", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "kanban_columns",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    board_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_kanban_columns", x => x.id);
                    table.ForeignKey(
                        name: "FK_kanban_columns_kanban_boards_board_id",
                        column: x => x.board_id,
                        principalTable: "kanban_boards",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "kanban_cards",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    column_id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: false),
                    description = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    priority = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    deadline = table.Column<DateTime>(type: "date", nullable: true),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    tags = table.Column<string[]>(type: "text[]", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_kanban_cards", x => x.id);
                    table.ForeignKey(
                        name: "FK_kanban_cards_kanban_columns_column_id",
                        column: x => x.column_id,
                        principalTable: "kanban_columns",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_kanban_boards_user_id_deleted_at",
                table: "kanban_boards",
                columns: new[] { "user_id", "deleted_at" });

            migrationBuilder.CreateIndex(
                name: "IX_kanban_boards_user_id_name",
                table: "kanban_boards",
                columns: new[] { "user_id", "name" });

            migrationBuilder.CreateIndex(
                name: "IX_kanban_cards_column_id_deleted_at_sort_order",
                table: "kanban_cards",
                columns: new[] { "column_id", "deleted_at", "sort_order" });

            migrationBuilder.CreateIndex(
                name: "IX_kanban_cards_deadline",
                table: "kanban_cards",
                column: "deadline");

            migrationBuilder.CreateIndex(
                name: "IX_kanban_columns_board_id_deleted_at_sort_order",
                table: "kanban_columns",
                columns: new[] { "board_id", "deleted_at", "sort_order" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "kanban_cards");

            migrationBuilder.DropTable(
                name: "kanban_columns");

            migrationBuilder.DropTable(
                name: "kanban_boards");
        }
    }
}
