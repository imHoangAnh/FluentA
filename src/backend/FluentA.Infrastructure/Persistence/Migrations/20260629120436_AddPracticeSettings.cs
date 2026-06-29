using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPracticeSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "practice_settings",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    mode_sequence = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_practice_settings", x => x.id);
                    table.ForeignKey(
                        name: "FK_practice_settings_auth_users_user_id",
                        column: x => x.user_id,
                        principalTable: "auth_users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_practice_settings_user_id",
                table: "practice_settings",
                column: "user_id",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "practice_settings");
        }
    }
}
