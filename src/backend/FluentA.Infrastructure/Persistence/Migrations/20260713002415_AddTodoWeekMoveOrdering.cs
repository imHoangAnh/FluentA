using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTodoWeekMoveOrdering : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_todo_items_user_id_date",
                table: "todo_items");

            migrationBuilder.AddColumn<int>(
                name: "sort_order",
                table: "todo_items",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_todo_items_user_id_date_sort_order",
                table: "todo_items",
                columns: new[] { "user_id", "date", "sort_order" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_todo_items_user_id_date_sort_order",
                table: "todo_items");

            migrationBuilder.DropColumn(
                name: "sort_order",
                table: "todo_items");

            migrationBuilder.CreateIndex(
                name: "IX_todo_items_user_id_date",
                table: "todo_items",
                columns: new[] { "user_id", "date" });
        }
    }
}
