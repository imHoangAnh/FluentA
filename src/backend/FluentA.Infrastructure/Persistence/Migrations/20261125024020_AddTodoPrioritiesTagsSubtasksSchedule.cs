using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTodoPrioritiesTagsSubtasksSchedule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "estimated_minutes",
                table: "todo_items",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "priority_id",
                table: "todo_items",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "scheduled_end_time",
                table: "todo_items",
                type: "time",
                nullable: true);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "scheduled_start_time",
                table: "todo_items",
                type: "time",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "todo_priorities",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    normalized_name = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    tone = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_todo_priorities", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "todo_subtasks",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    todo_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: false),
                    is_completed = table.Column<bool>(type: "boolean", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_todo_subtasks", x => x.id);
                    table.ForeignKey(
                        name: "FK_todo_subtasks_todo_items_todo_item_id",
                        column: x => x.todo_item_id,
                        principalTable: "todo_items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "todo_tags",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    normalized_name = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_todo_tags", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "todo_item_tags",
                columns: table => new
                {
                    todo_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    tag_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_todo_item_tags", x => new { x.todo_item_id, x.tag_id });
                    table.ForeignKey(
                        name: "FK_todo_item_tags_todo_items_todo_item_id",
                        column: x => x.todo_item_id,
                        principalTable: "todo_items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_todo_item_tags_todo_tags_tag_id",
                        column: x => x.tag_id,
                        principalTable: "todo_tags",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_todo_items_priority_id",
                table: "todo_items",
                column: "priority_id");

            migrationBuilder.CreateIndex(
                name: "IX_todo_item_tags_tag_id",
                table: "todo_item_tags",
                column: "tag_id");

            migrationBuilder.CreateIndex(
                name: "IX_todo_priorities_user_id_normalized_name",
                table: "todo_priorities",
                columns: new[] { "user_id", "normalized_name" },
                unique: true,
                filter: "deleted_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_todo_priorities_user_id_sort_order",
                table: "todo_priorities",
                columns: new[] { "user_id", "sort_order" });

            migrationBuilder.CreateIndex(
                name: "IX_todo_subtasks_todo_item_id_sort_order",
                table: "todo_subtasks",
                columns: new[] { "todo_item_id", "sort_order" });

            migrationBuilder.CreateIndex(
                name: "IX_todo_tags_user_id_normalized_name",
                table: "todo_tags",
                columns: new[] { "user_id", "normalized_name" },
                unique: true,
                filter: "deleted_at IS NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_todo_items_todo_priorities_priority_id",
                table: "todo_items",
                column: "priority_id",
                principalTable: "todo_priorities",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_todo_items_todo_priorities_priority_id",
                table: "todo_items");

            migrationBuilder.DropTable(
                name: "todo_item_tags");

            migrationBuilder.DropTable(
                name: "todo_priorities");

            migrationBuilder.DropTable(
                name: "todo_subtasks");

            migrationBuilder.DropTable(
                name: "todo_tags");

            migrationBuilder.DropIndex(
                name: "IX_todo_items_priority_id",
                table: "todo_items");

            migrationBuilder.DropColumn(
                name: "estimated_minutes",
                table: "todo_items");

            migrationBuilder.DropColumn(
                name: "priority_id",
                table: "todo_items");

            migrationBuilder.DropColumn(
                name: "scheduled_end_time",
                table: "todo_items");

            migrationBuilder.DropColumn(
                name: "scheduled_start_time",
                table: "todo_items");
        }
    }
}
