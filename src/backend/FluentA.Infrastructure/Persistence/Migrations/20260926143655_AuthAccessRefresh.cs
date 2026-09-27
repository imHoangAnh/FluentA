using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AuthAccessRefresh : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_users_reset_password_token",
                table: "users");

            migrationBuilder.DropColumn(
                name: "otp_failed_attempts",
                table: "users");

            migrationBuilder.DropColumn(
                name: "otp_resend_available_at",
                table: "users");

            migrationBuilder.RenameColumn(
                name: "reset_password_token",
                table: "users",
                newName: "reset_password_token_hash");

            migrationBuilder.RenameColumn(
                name: "otp_code",
                table: "users",
                newName: "otp_hash");

            migrationBuilder.CreateTable(
                name: "refresh_tokens",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    token_hash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    revoked_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_refresh_tokens", x => x.id);
                    table.ForeignKey(
                        name: "FK_refresh_tokens_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_users_reset_password_token_hash",
                table: "users",
                column: "reset_password_token_hash",
                unique: true,
                filter: "reset_password_token_hash IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_refresh_tokens_token_hash",
                table: "refresh_tokens",
                column: "token_hash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_refresh_tokens_user_id_revoked_at",
                table: "refresh_tokens",
                columns: new[] { "user_id", "revoked_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "refresh_tokens");

            migrationBuilder.DropIndex(
                name: "IX_users_reset_password_token_hash",
                table: "users");

            migrationBuilder.RenameColumn(
                name: "reset_password_token_hash",
                table: "users",
                newName: "reset_password_token");

            migrationBuilder.RenameColumn(
                name: "otp_hash",
                table: "users",
                newName: "otp_code");

            migrationBuilder.AddColumn<int>(
                name: "otp_failed_attempts",
                table: "users",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "otp_resend_available_at",
                table: "users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_users_reset_password_token",
                table: "users",
                column: "reset_password_token",
                unique: true,
                filter: "reset_password_token IS NOT NULL");
        }
    }
}
