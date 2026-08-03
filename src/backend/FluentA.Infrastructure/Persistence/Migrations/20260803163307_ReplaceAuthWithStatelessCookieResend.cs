using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ReplaceAuthWithStatelessCookieResend : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_assets_auth_users_uploaded_by_user_id",
                table: "assets");

            migrationBuilder.DropForeignKey(
                name: "FK_auth_users_assets_current_avatar_asset_id",
                table: "auth_users");

            migrationBuilder.DropForeignKey(
                name: "FK_note_boards_auth_users_user_id",
                table: "note_boards");

            migrationBuilder.DropForeignKey(
                name: "FK_practice_session_summaries_auth_users_user_id",
                table: "practice_session_summaries");

            migrationBuilder.DropForeignKey(
                name: "FK_practice_settings_auth_users_user_id",
                table: "practice_settings");

            migrationBuilder.DropForeignKey(
                name: "FK_review_sessions_auth_users_user_id",
                table: "review_sessions");

            migrationBuilder.DropForeignKey(
                name: "FK_review_settings_auth_users_user_id",
                table: "review_settings");

            migrationBuilder.DropForeignKey(
                name: "FK_trash_entries_auth_users_user_id",
                table: "trash_entries");

            migrationBuilder.DropPrimaryKey(
                name: "PK_auth_users",
                table: "auth_users");

            migrationBuilder.DropColumn(
                name: "is_email_verified",
                table: "auth_users");

            migrationBuilder.RenameTable(
                name: "auth_users",
                newName: "users");

            migrationBuilder.RenameIndex(
                name: "IX_auth_users_google_id",
                table: "users",
                newName: "IX_users_google_id");

            migrationBuilder.RenameIndex(
                name: "IX_auth_users_email",
                table: "users",
                newName: "IX_users_email");

            migrationBuilder.RenameIndex(
                name: "IX_auth_users_current_avatar_asset_id",
                table: "users",
                newName: "IX_users_current_avatar_asset_id");

            migrationBuilder.AddColumn<DateTime>(
                name: "email_verified_at",
                table: "users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "otp_code",
                table: "users",
                type: "character varying(256)",
                maxLength: 256,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "otp_expires_at",
                table: "users",
                type: "timestamp with time zone",
                nullable: true);

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

            migrationBuilder.AddColumn<DateTime>(
                name: "reset_password_expires_at",
                table: "users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "reset_password_token",
                table: "users",
                type: "character varying(256)",
                maxLength: 256,
                nullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_users",
                table: "users",
                column: "id");

            migrationBuilder.CreateIndex(
                name: "IX_users_reset_password_token",
                table: "users",
                column: "reset_password_token",
                unique: true,
                filter: "reset_password_token IS NOT NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_assets_users_uploaded_by_user_id",
                table: "assets",
                column: "uploaded_by_user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_note_boards_users_user_id",
                table: "note_boards",
                column: "user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_practice_session_summaries_users_user_id",
                table: "practice_session_summaries",
                column: "user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_practice_settings_users_user_id",
                table: "practice_settings",
                column: "user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_review_sessions_users_user_id",
                table: "review_sessions",
                column: "user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_review_settings_users_user_id",
                table: "review_settings",
                column: "user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_trash_entries_users_user_id",
                table: "trash_entries",
                column: "user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_users_assets_current_avatar_asset_id",
                table: "users",
                column: "current_avatar_asset_id",
                principalTable: "assets",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_assets_users_uploaded_by_user_id",
                table: "assets");

            migrationBuilder.DropForeignKey(
                name: "FK_note_boards_users_user_id",
                table: "note_boards");

            migrationBuilder.DropForeignKey(
                name: "FK_practice_session_summaries_users_user_id",
                table: "practice_session_summaries");

            migrationBuilder.DropForeignKey(
                name: "FK_practice_settings_users_user_id",
                table: "practice_settings");

            migrationBuilder.DropForeignKey(
                name: "FK_review_sessions_users_user_id",
                table: "review_sessions");

            migrationBuilder.DropForeignKey(
                name: "FK_review_settings_users_user_id",
                table: "review_settings");

            migrationBuilder.DropForeignKey(
                name: "FK_trash_entries_users_user_id",
                table: "trash_entries");

            migrationBuilder.DropForeignKey(
                name: "FK_users_assets_current_avatar_asset_id",
                table: "users");

            migrationBuilder.DropPrimaryKey(
                name: "PK_users",
                table: "users");

            migrationBuilder.DropIndex(
                name: "IX_users_reset_password_token",
                table: "users");

            migrationBuilder.AddColumn<bool>(
                name: "is_email_verified",
                table: "users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.Sql("UPDATE users SET is_email_verified = TRUE WHERE email_verified_at IS NOT NULL;");

            migrationBuilder.DropColumn(
                name: "email_verified_at",
                table: "users");

            migrationBuilder.DropColumn(
                name: "otp_code",
                table: "users");

            migrationBuilder.DropColumn(
                name: "otp_expires_at",
                table: "users");

            migrationBuilder.DropColumn(
                name: "otp_failed_attempts",
                table: "users");

            migrationBuilder.DropColumn(
                name: "otp_resend_available_at",
                table: "users");

            migrationBuilder.DropColumn(
                name: "reset_password_expires_at",
                table: "users");

            migrationBuilder.DropColumn(
                name: "reset_password_token",
                table: "users");

            migrationBuilder.RenameTable(
                name: "users",
                newName: "auth_users");

            migrationBuilder.RenameIndex(
                name: "IX_users_google_id",
                table: "auth_users",
                newName: "IX_auth_users_google_id");

            migrationBuilder.RenameIndex(
                name: "IX_users_email",
                table: "auth_users",
                newName: "IX_auth_users_email");

            migrationBuilder.RenameIndex(
                name: "IX_users_current_avatar_asset_id",
                table: "auth_users",
                newName: "IX_auth_users_current_avatar_asset_id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_auth_users",
                table: "auth_users",
                column: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_assets_auth_users_uploaded_by_user_id",
                table: "assets",
                column: "uploaded_by_user_id",
                principalTable: "auth_users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_auth_users_assets_current_avatar_asset_id",
                table: "auth_users",
                column: "current_avatar_asset_id",
                principalTable: "assets",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_note_boards_auth_users_user_id",
                table: "note_boards",
                column: "user_id",
                principalTable: "auth_users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_practice_session_summaries_auth_users_user_id",
                table: "practice_session_summaries",
                column: "user_id",
                principalTable: "auth_users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_practice_settings_auth_users_user_id",
                table: "practice_settings",
                column: "user_id",
                principalTable: "auth_users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_review_sessions_auth_users_user_id",
                table: "review_sessions",
                column: "user_id",
                principalTable: "auth_users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_review_settings_auth_users_user_id",
                table: "review_settings",
                column: "user_id",
                principalTable: "auth_users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_trash_entries_auth_users_user_id",
                table: "trash_entries",
                column: "user_id",
                principalTable: "auth_users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
