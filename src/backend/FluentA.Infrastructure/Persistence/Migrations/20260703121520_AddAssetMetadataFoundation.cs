using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAssetMetadataFoundation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "current_avatar_asset_id",
                table: "auth_users",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "assets",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    asset_type = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    object_key = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: false),
                    public_url = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: false),
                    content_type = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    size_bytes = table.Column<long>(type: "bigint", nullable: false),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_assets", x => x.id);
                    table.ForeignKey(
                        name: "FK_assets_auth_users_user_id",
                        column: x => x.user_id,
                        principalTable: "auth_users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_auth_users_current_avatar_asset_id",
                table: "auth_users",
                column: "current_avatar_asset_id");

            migrationBuilder.CreateIndex(
                name: "IX_assets_object_key",
                table: "assets",
                column: "object_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_assets_user_id_asset_type_deleted_at",
                table: "assets",
                columns: new[] { "user_id", "asset_type", "deleted_at" });

            migrationBuilder.CreateIndex(
                name: "IX_assets_user_id_status_deleted_at",
                table: "assets",
                columns: new[] { "user_id", "status", "deleted_at" });

            migrationBuilder.AddForeignKey(
                name: "FK_auth_users_assets_current_avatar_asset_id",
                table: "auth_users",
                column: "current_avatar_asset_id",
                principalTable: "assets",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_auth_users_assets_current_avatar_asset_id",
                table: "auth_users");

            migrationBuilder.DropTable(
                name: "assets");

            migrationBuilder.DropIndex(
                name: "IX_auth_users_current_avatar_asset_id",
                table: "auth_users");

            migrationBuilder.DropColumn(
                name: "current_avatar_asset_id",
                table: "auth_users");
        }
    }
}
