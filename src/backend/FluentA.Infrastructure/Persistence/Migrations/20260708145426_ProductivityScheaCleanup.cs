using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ProductivityScheaCleanup : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_todo_items_user_id_date_sort_order",
                table: "todo_items");

            migrationBuilder.DropPrimaryKey(
                name: "PK_journal_entries",
                table: "journal_entries");

            migrationBuilder.DropIndex(
                name: "IX_journal_entries_user_id_learning_date",
                table: "journal_entries");

            migrationBuilder.DropColumn(
                name: "is_carried_over",
                table: "todo_items");

            migrationBuilder.DropColumn(
                name: "original_date",
                table: "todo_items");

            migrationBuilder.DropColumn(
                name: "sort_order",
                table: "todo_items");

            migrationBuilder.DropColumn(
                name: "tags",
                table: "kanban_cards");

            migrationBuilder.RenameTable(
                name: "journal_entries",
                newName: "journal");

            migrationBuilder.RenameIndex(
                name: "IX_journal_entries_user_id_created_at",
                table: "journal",
                newName: "IX_journal_user_id_created_at");

            migrationBuilder.RenameColumn(
                name: "learning_date",
                table: "journal",
                newName: "date");

            migrationBuilder.DropColumn(
                name: "plain_text_content",
                table: "journal");

            migrationBuilder.DropColumn(
                name: "preview",
                table: "journal");

            migrationBuilder.Sql("""
                UPDATE journal
                SET date = COALESCE(date, created_at::date)
                WHERE date IS NULL;
                """);

            migrationBuilder.AlterColumn<DateTime>(
                name: "date",
                table: "journal",
                type: "date",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "date",
                oldNullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_journal",
                table: "journal",
                column: "id");

            migrationBuilder.CreateIndex(
                name: "IX_journal_user_id_date",
                table: "journal",
                columns: new[] { "user_id", "date" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_journal",
                table: "journal");

            migrationBuilder.DropIndex(
                name: "IX_journal_user_id_date",
                table: "journal");

            migrationBuilder.RenameTable(
                name: "journal",
                newName: "journal_entries");

            migrationBuilder.RenameIndex(
                name: "IX_journal_user_id_created_at",
                table: "journal_entries",
                newName: "IX_journal_entries_user_id_created_at");

            migrationBuilder.AlterColumn<DateTime>(
                name: "date",
                table: "journal_entries",
                type: "date",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "date");

            migrationBuilder.RenameColumn(
                name: "date",
                table: "journal_entries",
                newName: "learning_date");

            migrationBuilder.AddColumn<bool>(
                name: "is_carried_over",
                table: "todo_items",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "original_date",
                table: "todo_items",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "sort_order",
                table: "todo_items",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string[]>(
                name: "tags",
                table: "kanban_cards",
                type: "text[]",
                nullable: false,
                defaultValue: new string[0]);

            migrationBuilder.AddColumn<string>(
                name: "plain_text_content",
                table: "journal_entries",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "preview",
                table: "journal_entries",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddPrimaryKey(
                name: "PK_journal_entries",
                table: "journal_entries",
                column: "id");

            migrationBuilder.CreateIndex(
                name: "IX_todo_items_user_id_date_sort_order",
                table: "todo_items",
                columns: new[] { "user_id", "date", "sort_order" });

            migrationBuilder.CreateIndex(
                name: "IX_journal_entries_user_id_learning_date",
                table: "journal_entries",
                columns: new[] { "user_id", "learning_date" });
        }
    }
}
