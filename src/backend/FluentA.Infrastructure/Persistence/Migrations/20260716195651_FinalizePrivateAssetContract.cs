using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class FinalizePrivateAssetContract : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "legacy_asset_deletion_queue",
                columns: table => new
                {
                    object_key = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: false),
                    bucket = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    attempt_count = table.Column<int>(type: "integer", nullable: false),
                    claimed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    last_error = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table => table.PrimaryKey("PK_legacy_asset_deletion_queue", x => x.object_key));

            migrationBuilder.CreateIndex(
                name: "IX_legacy_asset_deletion_queue_status_updated_at",
                table: "legacy_asset_deletion_queue",
                columns: new[] { "status", "updated_at" });

            migrationBuilder.Sql("""
                INSERT INTO legacy_asset_deletion_queue
                    (object_key, bucket, status, attempt_count, created_at, updated_at)
                SELECT object_key, COALESCE(bucket, ''), 'pending', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                FROM assets
                ON CONFLICT (object_key) DO NOTHING;

                DELETE FROM note_page_assets;
                UPDATE countdowns SET cover_asset_id = NULL WHERE cover_asset_id IS NOT NULL;
                UPDATE auth_users SET current_avatar_asset_id = NULL WHERE current_avatar_asset_id IS NOT NULL;
                UPDATE note_pages
                SET content = regexp_replace(content, '<img[^>]*data-note-asset-id[^>]*>', '', 'gi')
                WHERE content ILIKE '%data-note-asset-id%';
                DELETE FROM assets;
                """);

            migrationBuilder.DropForeignKey(
                name: "FK_assets_auth_users_user_id",
                table: "assets");

            migrationBuilder.DropColumn(
                name: "avatar_url",
                table: "auth_users");

            migrationBuilder.DropColumn(
                name: "public_url",
                table: "assets");

            migrationBuilder.RenameColumn(
                name: "user_id",
                table: "assets",
                newName: "uploaded_by_user_id");

            migrationBuilder.RenameIndex(
                name: "IX_assets_user_id_status_deleted_at",
                table: "assets",
                newName: "IX_assets_uploaded_by_user_id_status_deleted_at");

            migrationBuilder.RenameIndex(
                name: "IX_assets_user_id_asset_type_deleted_at",
                table: "assets",
                newName: "IX_assets_uploaded_by_user_id_asset_type_deleted_at");

            migrationBuilder.AddForeignKey(
                name: "FK_assets_auth_users_uploaded_by_user_id",
                table: "assets",
                column: "uploaded_by_user_id",
                principalTable: "auth_users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            throw new NotSupportedException("FinalizePrivateAssetContract is intentionally irreversible because it resets legacy asset metadata and queues object deletion.");
        }
    }
}
