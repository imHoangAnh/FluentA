using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectMilestonesLabelsChecklists : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "label_id",
                table: "project_cards",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "milestone_id",
                table: "project_cards",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "project_card_checklist_items",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    card_id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: false),
                    is_completed = table.Column<bool>(type: "boolean", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_project_card_checklist_items", x => x.id);
                    table.ForeignKey(
                        name: "FK_project_card_checklist_items_project_cards_card_id",
                        column: x => x.card_id,
                        principalTable: "project_cards",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "project_labels",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    board_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    normalized_name = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    tone = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_project_labels", x => x.id);
                    table.ForeignKey(
                        name: "FK_project_labels_project_boards_board_id",
                        column: x => x.board_id,
                        principalTable: "project_boards",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "project_milestones",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    board_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    normalized_name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_project_milestones", x => x.id);
                    table.ForeignKey(
                        name: "FK_project_milestones_project_boards_board_id",
                        column: x => x.board_id,
                        principalTable: "project_boards",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_project_cards_label_id",
                table: "project_cards",
                column: "label_id");

            migrationBuilder.CreateIndex(
                name: "IX_project_cards_milestone_id",
                table: "project_cards",
                column: "milestone_id");

            migrationBuilder.CreateIndex(
                name: "IX_project_card_checklist_items_card_id_sort_order",
                table: "project_card_checklist_items",
                columns: new[] { "card_id", "sort_order" });

            migrationBuilder.CreateIndex(
                name: "IX_project_labels_board_id_normalized_name",
                table: "project_labels",
                columns: new[] { "board_id", "normalized_name" },
                unique: true,
                filter: "deleted_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_project_milestones_board_id_normalized_name",
                table: "project_milestones",
                columns: new[] { "board_id", "normalized_name" },
                unique: true,
                filter: "deleted_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_project_milestones_board_id_sort_order",
                table: "project_milestones",
                columns: new[] { "board_id", "sort_order" });

            migrationBuilder.AddForeignKey(
                name: "FK_project_cards_project_labels_label_id",
                table: "project_cards",
                column: "label_id",
                principalTable: "project_labels",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_project_cards_project_milestones_milestone_id",
                table: "project_cards",
                column: "milestone_id",
                principalTable: "project_milestones",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_project_cards_project_labels_label_id",
                table: "project_cards");

            migrationBuilder.DropForeignKey(
                name: "FK_project_cards_project_milestones_milestone_id",
                table: "project_cards");

            migrationBuilder.DropTable(
                name: "project_card_checklist_items");

            migrationBuilder.DropTable(
                name: "project_labels");

            migrationBuilder.DropTable(
                name: "project_milestones");

            migrationBuilder.DropIndex(
                name: "IX_project_cards_label_id",
                table: "project_cards");

            migrationBuilder.DropIndex(
                name: "IX_project_cards_milestone_id",
                table: "project_cards");

            migrationBuilder.DropColumn(
                name: "label_id",
                table: "project_cards");

            migrationBuilder.DropColumn(
                name: "milestone_id",
                table: "project_cards");
        }
    }
}
