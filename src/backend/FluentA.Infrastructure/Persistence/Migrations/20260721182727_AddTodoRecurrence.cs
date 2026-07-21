using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTodoRecurrence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "generated_from_todo_id",
                table: "todo_items",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_generated_occurrence_pristine",
                table: "todo_items",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "repeat_pattern",
                table: "todo_items",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_todo_items_generated_from_todo_id",
                table: "todo_items",
                column: "generated_from_todo_id",
                unique: true,
                filter: "generated_from_todo_id IS NOT NULL AND deleted_at IS NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_todo_items_todo_items_generated_from_todo_id",
                table: "todo_items",
                column: "generated_from_todo_id",
                principalTable: "todo_items",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_todo_items_todo_items_generated_from_todo_id",
                table: "todo_items");

            migrationBuilder.DropIndex(
                name: "IX_todo_items_generated_from_todo_id",
                table: "todo_items");

            migrationBuilder.DropColumn(
                name: "generated_from_todo_id",
                table: "todo_items");

            migrationBuilder.DropColumn(
                name: "is_generated_occurrence_pristine",
                table: "todo_items");

            migrationBuilder.DropColumn(
                name: "repeat_pattern",
                table: "todo_items");
        }
    }
}
