using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ReplaceHabitColorWithSemanticIcon : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "color",
                table: "habits");

            migrationBuilder.AlterColumn<string>(
                name: "icon",
                table: "habits",
                type: "character varying(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "Default",
                oldClrType: typeof(string),
                oldType: "character varying(16)",
                oldMaxLength: 16,
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "icon",
                table: "habits",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(10)",
                oldMaxLength: 10,
                oldDefaultValue: "Default");

            migrationBuilder.AddColumn<string>(
                name: "color",
                table: "habits",
                type: "character varying(7)",
                maxLength: 7,
                nullable: true);
        }
    }
}
