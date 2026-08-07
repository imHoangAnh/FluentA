using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations;

public partial class RenameProjectTables : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.RenameTable(
            name: "kanban_boards",
            newName: "project_boards");

        migrationBuilder.RenameTable(
            name: "kanban_columns",
            newName: "project_columns");

        migrationBuilder.RenameTable(
            name: "kanban_cards",
            newName: "project_cards");

        migrationBuilder.Sql("UPDATE trash_entries SET entity_kind = 'Project' WHERE entity_kind = 'Kanban';");

        migrationBuilder.RenameIndex(
            name: "IX_kanban_boards_user_id_deleted_at",
            table: "project_boards",
            newName: "IX_project_boards_user_id_deleted_at");

        migrationBuilder.RenameIndex(
            name: "IX_kanban_boards_user_id_name",
            table: "project_boards",
            newName: "IX_project_boards_user_id_name");

        migrationBuilder.RenameIndex(
            name: "IX_kanban_columns_board_id_deleted_at_sort_order",
            table: "project_columns",
            newName: "IX_project_columns_board_id_deleted_at_sort_order");

        migrationBuilder.RenameIndex(
            name: "IX_kanban_cards_column_id_deleted_at_sort_order",
            table: "project_cards",
            newName: "IX_project_cards_column_id_deleted_at_sort_order");

        migrationBuilder.RenameIndex(
            name: "IX_kanban_cards_deadline",
            table: "project_cards",
            newName: "IX_project_cards_deadline");

        migrationBuilder.Sql("ALTER TABLE project_boards RENAME CONSTRAINT \"PK_kanban_boards\" TO \"PK_project_boards\";");
        migrationBuilder.Sql("ALTER TABLE project_columns RENAME CONSTRAINT \"PK_kanban_columns\" TO \"PK_project_columns\";");
        migrationBuilder.Sql("ALTER TABLE project_cards RENAME CONSTRAINT \"PK_kanban_cards\" TO \"PK_project_cards\";");
        migrationBuilder.Sql("ALTER TABLE project_columns RENAME CONSTRAINT \"FK_kanban_columns_kanban_boards_board_id\" TO \"FK_project_columns_project_boards_board_id\";");
        migrationBuilder.Sql("ALTER TABLE project_cards RENAME CONSTRAINT \"FK_kanban_cards_kanban_columns_column_id\" TO \"FK_project_cards_project_columns_column_id\";");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("UPDATE trash_entries SET entity_kind = 'Kanban' WHERE entity_kind = 'Project';");

        migrationBuilder.Sql("ALTER TABLE project_cards RENAME CONSTRAINT \"FK_project_cards_project_columns_column_id\" TO \"FK_kanban_cards_kanban_columns_column_id\";");
        migrationBuilder.Sql("ALTER TABLE project_columns RENAME CONSTRAINT \"FK_project_columns_project_boards_board_id\" TO \"FK_kanban_columns_kanban_boards_board_id\";");
        migrationBuilder.Sql("ALTER TABLE project_cards RENAME CONSTRAINT \"PK_project_cards\" TO \"PK_kanban_cards\";");
        migrationBuilder.Sql("ALTER TABLE project_columns RENAME CONSTRAINT \"PK_project_columns\" TO \"PK_kanban_columns\";");
        migrationBuilder.Sql("ALTER TABLE project_boards RENAME CONSTRAINT \"PK_project_boards\" TO \"PK_kanban_boards\";");

        migrationBuilder.RenameIndex(
            name: "IX_project_cards_deadline",
            table: "project_cards",
            newName: "IX_kanban_cards_deadline");

        migrationBuilder.RenameIndex(
            name: "IX_project_cards_column_id_deleted_at_sort_order",
            table: "project_cards",
            newName: "IX_kanban_cards_column_id_deleted_at_sort_order");

        migrationBuilder.RenameIndex(
            name: "IX_project_columns_board_id_deleted_at_sort_order",
            table: "project_columns",
            newName: "IX_kanban_columns_board_id_deleted_at_sort_order");

        migrationBuilder.RenameIndex(
            name: "IX_project_boards_user_id_name",
            table: "project_boards",
            newName: "IX_kanban_boards_user_id_name");

        migrationBuilder.RenameIndex(
            name: "IX_project_boards_user_id_deleted_at",
            table: "project_boards",
            newName: "IX_kanban_boards_user_id_deleted_at");

        migrationBuilder.RenameTable(
            name: "project_cards",
            newName: "kanban_cards");

        migrationBuilder.RenameTable(
            name: "project_columns",
            newName: "kanban_columns");

        migrationBuilder.RenameTable(
            name: "project_boards",
            newName: "kanban_boards");
    }
}
