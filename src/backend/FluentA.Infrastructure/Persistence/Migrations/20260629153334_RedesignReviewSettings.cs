using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RedesignReviewSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "new_cards_per_day",
                table: "review_settings");

            migrationBuilder.RenameColumn(
                name: "review_cards_per_day",
                table: "review_settings",
                newName: "daily_limit");

            migrationBuilder.AddColumn<bool>(
                name: "recap_after_answer",
                table: "review_settings",
                type: "boolean",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "recap_after_answer",
                table: "review_settings");

            migrationBuilder.RenameColumn(
                name: "daily_limit",
                table: "review_settings",
                newName: "review_cards_per_day");

            migrationBuilder.AddColumn<int>(
                name: "new_cards_per_day",
                table: "review_settings",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }
    }
}
