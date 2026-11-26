using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialBaseline : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "habits",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    icon = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false, defaultValue: "Default"),
                    frequency = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    custom_days = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    start_date = table.Column<DateTime>(type: "date", nullable: false),
                    goal_days = table.Column<int>(type: "integer", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_habits", x => x.id);
                    table.CheckConstraint("ck_habits_goal_days_positive", "goal_days IS NULL OR goal_days > 0");
                });

            migrationBuilder.CreateTable(
                name: "journal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: false),
                    content = table.Column<string>(type: "text", nullable: false),
                    date = table.Column<DateTime>(type: "date", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_journal", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "project_boards",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_project_boards", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "todo_items",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: false),
                    note = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    date = table.Column<DateTime>(type: "date", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    is_completed = table.Column<bool>(type: "boolean", nullable: false),
                    is_important = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    repeat_pattern = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    generated_from_todo_id = table.Column<Guid>(type: "uuid", nullable: true),
                    is_generated_occurrence_pristine = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_todo_items", x => x.id);
                    table.ForeignKey(
                        name: "FK_todo_items_todo_items_generated_from_todo_id",
                        column: x => x.generated_from_todo_id,
                        principalTable: "todo_items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "vocab_board_preferences",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    board_id = table.Column<Guid>(type: "uuid", nullable: false),
                    hidden_columns = table.Column<string>(type: "jsonb", nullable: false),
                    column_order = table.Column<string>(type: "jsonb", nullable: false),
                    column_widths = table.Column<string>(type: "jsonb", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vocab_board_preferences", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "vocab_boards",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    language = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vocab_boards", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "habit_entries",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    habit_id = table.Column<Guid>(type: "uuid", nullable: false),
                    date = table.Column<DateTime>(type: "date", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_habit_entries", x => x.id);
                    table.ForeignKey(
                        name: "FK_habit_entries_habits_habit_id",
                        column: x => x.habit_id,
                        principalTable: "habits",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "project_columns",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    board_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_project_columns", x => x.id);
                    table.ForeignKey(
                        name: "FK_project_columns_project_boards_board_id",
                        column: x => x.board_id,
                        principalTable: "project_boards",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "vocab_pages",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    board_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vocab_pages", x => x.id);
                    table.ForeignKey(
                        name: "FK_vocab_pages_vocab_boards_board_id",
                        column: x => x.board_id,
                        principalTable: "vocab_boards",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "project_cards",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    column_id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: false),
                    description = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    priority = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    deadline = table.Column<DateTime>(type: "date", nullable: true),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_project_cards", x => x.id);
                    table.ForeignKey(
                        name: "FK_project_cards_project_columns_column_id",
                        column: x => x.column_id,
                        principalTable: "project_columns",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "vocab_words",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    page_id = table.Column<Guid>(type: "uuid", nullable: false),
                    word = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: false),
                    meaning = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    ipa_pronunciation = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    context = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    example = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    synonyms = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    antonyms = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vocab_words", x => x.id);
                    table.ForeignKey(
                        name: "FK_vocab_words_vocab_pages_page_id",
                        column: x => x.page_id,
                        principalTable: "vocab_pages",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "word_review_states",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    word_id = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    level = table.Column<int>(type: "integer", nullable: false),
                    next_review_date = table.Column<DateOnly>(type: "date", nullable: false),
                    lapse_count = table.Column<int>(type: "integer", nullable: false),
                    last_reviewed_at = table.Column<DateOnly>(type: "date", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_word_review_states", x => x.id);
                    table.ForeignKey(
                        name: "FK_word_review_states_vocab_words_word_id",
                        column: x => x.word_id,
                        principalTable: "vocab_words",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "assets",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    uploaded_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    asset_type = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    object_key = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: false),
                    content_type = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    size_bytes = table.Column<long>(type: "bigint", nullable: false),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    bucket = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    original_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_assets", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "countdowns",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    target_date = table.Column<DateTime>(type: "date", nullable: false),
                    cover_asset_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_countdowns", x => x.id);
                    table.ForeignKey(
                        name: "FK_countdowns_assets_cover_asset_id",
                        column: x => x.cover_asset_id,
                        principalTable: "assets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "journal_entry_assets",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    journal_entry_id = table.Column<Guid>(type: "uuid", nullable: false),
                    asset_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_journal_entry_assets", x => x.id);
                    table.ForeignKey(
                        name: "FK_journal_entry_assets_assets_asset_id",
                        column: x => x.asset_id,
                        principalTable: "assets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_journal_entry_assets_journal_journal_entry_id",
                        column: x => x.journal_entry_id,
                        principalTable: "journal",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    full_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    bio = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    current_avatar_asset_id = table.Column<Guid>(type: "uuid", nullable: true),
                    password_hash = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    google_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    google_link_confirmed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    email_verified_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    otp_hash = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    otp_expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    reset_password_token_hash = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    reset_password_expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    last_login_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.id);
                    table.ForeignKey(
                        name: "FK_users_assets_current_avatar_asset_id",
                        column: x => x.current_avatar_asset_id,
                        principalTable: "assets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "note_boards",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_note_boards", x => x.id);
                    table.ForeignKey(
                        name: "FK_note_boards_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "practice_session_summaries",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    page_id = table.Column<Guid>(type: "uuid", nullable: false),
                    page_name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    mode = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    total_cards = table.Column<int>(type: "integer", nullable: false),
                    correct_cards = table.Column<int>(type: "integer", nullable: false),
                    wrong_cards = table.Column<int>(type: "integer", nullable: false),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_practice_session_summaries", x => x.id);
                    table.ForeignKey(
                        name: "FK_practice_session_summaries_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "practice_sessions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    page_id = table.Column<Guid>(type: "uuid", nullable: false),
                    page_name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    board_id = table.Column<Guid>(type: "uuid", nullable: false),
                    board_name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    board_language = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    current_item_index = table.Column<int>(type: "integer", nullable: false),
                    started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_practice_sessions", x => x.id);
                    table.ForeignKey(
                        name: "FK_practice_sessions_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

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

            migrationBuilder.CreateTable(
                name: "review_sessions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    time_zone_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    session_date = table.Column<DateOnly>(type: "date", nullable: false),
                    started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_review_sessions", x => x.id);
                    table.ForeignKey(
                        name: "FK_review_sessions_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "note_pages",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    board_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: false),
                    content = table.Column<string>(type: "text", nullable: false),
                    date = table.Column<DateTime>(type: "date", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_note_pages", x => x.id);
                    table.ForeignKey(
                        name: "FK_note_pages_note_boards_board_id",
                        column: x => x.board_id,
                        principalTable: "note_boards",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "practice_session_items",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    practice_session_id = table.Column<Guid>(type: "uuid", nullable: false),
                    word_id = table.Column<Guid>(type: "uuid", nullable: false),
                    position = table.Column<int>(type: "integer", nullable: false),
                    word = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: false),
                    meaning = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    ipa_pronunciation = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    type = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    context = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    example = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    synonyms = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    antonyms = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    current_step = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    already_in_review = table.Column<bool>(type: "boolean", nullable: false),
                    selected_level = table.Column<int>(type: "integer", nullable: true),
                    has_mistake = table.Column<bool>(type: "boolean", nullable: false),
                    is_completed = table.Column<bool>(type: "boolean", nullable: false),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    choice_1_slot_id = table.Column<Guid>(type: "uuid", nullable: false),
                    choice_2_slot_id = table.Column<Guid>(type: "uuid", nullable: false),
                    choice_3_slot_id = table.Column<Guid>(type: "uuid", nullable: false),
                    choice_4_slot_id = table.Column<Guid>(type: "uuid", nullable: false),
                    choice_1_meaning = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    choice_2_meaning = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    choice_3_meaning = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    choice_4_meaning = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    correct_answer_slot_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_practice_session_items", x => x.id);
                    table.ForeignKey(
                        name: "FK_practice_session_items_practice_sessions_practice_session_id",
                        column: x => x.practice_session_id,
                        principalTable: "practice_sessions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "review_session_items",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    review_session_id = table.Column<Guid>(type: "uuid", nullable: false),
                    vocab_word_id = table.Column<Guid>(type: "uuid", nullable: false),
                    position = table.Column<int>(type: "integer", nullable: false),
                    mode = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    language_snapshot = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: false),
                    word_snapshot = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: false),
                    meaning_snapshot = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    ipa_pronunciation_snapshot = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    type_snapshot = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    context_snapshot = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    example_snapshot = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    synonyms_snapshot = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    antonyms_snapshot = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    is_reviewed = table.Column<bool>(type: "boolean", nullable: false),
                    result = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    level_before = table.Column<int>(type: "integer", nullable: true),
                    level_after = table.Column<int>(type: "integer", nullable: true),
                    next_review_date_before = table.Column<DateOnly>(type: "date", nullable: true),
                    next_review_date_after = table.Column<DateOnly>(type: "date", nullable: true),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_review_session_items", x => x.id);
                    table.ForeignKey(
                        name: "FK_review_session_items_review_sessions_review_session_id",
                        column: x => x.review_session_id,
                        principalTable: "review_sessions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "note_page_assets",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    note_page_id = table.Column<Guid>(type: "uuid", nullable: false),
                    asset_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_note_page_assets", x => x.id);
                    table.ForeignKey(
                        name: "FK_note_page_assets_assets_asset_id",
                        column: x => x.asset_id,
                        principalTable: "assets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_note_page_assets_note_pages_note_page_id",
                        column: x => x.note_page_id,
                        principalTable: "note_pages",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "practice_attempts",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    practice_session_id = table.Column<Guid>(type: "uuid", nullable: false),
                    practice_session_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    step = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    kind = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    submitted_answer = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    answer_slot_id = table.Column<Guid>(type: "uuid", nullable: true),
                    correctness = table.Column<bool>(type: "boolean", nullable: false),
                    duration_ms = table.Column<long>(type: "bigint", nullable: false),
                    attempt_number = table.Column<int>(type: "integer", nullable: true),
                    accuracy_score = table.Column<double>(type: "double precision", nullable: true),
                    completeness_score = table.Column<double>(type: "double precision", nullable: true),
                    assessment_json = table.Column<string>(type: "jsonb", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_practice_attempts", x => x.id);
                    table.ForeignKey(
                        name: "FK_practice_attempts_practice_session_items_practice_session_i~",
                        column: x => x.practice_session_item_id,
                        principalTable: "practice_session_items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_practice_attempts_practice_sessions_practice_session_id",
                        column: x => x.practice_session_id,
                        principalTable: "practice_sessions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "review_attempts",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    review_session_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    attempt_number = table.Column<int>(type: "integer", nullable: false),
                    mode = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    answer_text = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    is_correct = table.Column<bool>(type: "boolean", nullable: false),
                    accuracy_score = table.Column<double>(type: "double precision", nullable: true),
                    completeness_score = table.Column<double>(type: "double precision", nullable: true),
                    feedback_mode = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    feedback_json = table.Column<string>(type: "jsonb", nullable: true),
                    time_spent_seconds = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_review_attempts", x => x.id);
                    table.ForeignKey(
                        name: "FK_review_attempts_review_session_items_review_session_item_id",
                        column: x => x.review_session_item_id,
                        principalTable: "review_session_items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "word_review_histories",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    word_id = table.Column<Guid>(type: "uuid", nullable: false),
                    session_id = table.Column<Guid>(type: "uuid", nullable: false),
                    review_session_item_id = table.Column<Guid>(type: "uuid", nullable: true),
                    time_spent_seconds = table.Column<int>(type: "integer", nullable: false),
                    reviewed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    result = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_word_review_histories", x => x.id);
                    table.ForeignKey(
                        name: "FK_word_review_histories_review_session_items_review_session_i~",
                        column: x => x.review_session_item_id,
                        principalTable: "review_session_items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_assets_object_key",
                table: "assets",
                column: "object_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_assets_uploaded_by_user_id_asset_type_deleted_at",
                table: "assets",
                columns: new[] { "uploaded_by_user_id", "asset_type", "deleted_at" });

            migrationBuilder.CreateIndex(
                name: "IX_assets_uploaded_by_user_id_status_deleted_at",
                table: "assets",
                columns: new[] { "uploaded_by_user_id", "status", "deleted_at" });

            migrationBuilder.CreateIndex(
                name: "IX_countdowns_cover_asset_id",
                table: "countdowns",
                column: "cover_asset_id",
                unique: true,
                filter: "\"cover_asset_id\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_countdowns_user_id_target_date",
                table: "countdowns",
                columns: new[] { "user_id", "target_date" });

            migrationBuilder.CreateIndex(
                name: "IX_habit_entries_date",
                table: "habit_entries",
                column: "date");

            migrationBuilder.CreateIndex(
                name: "IX_habit_entries_habit_id_date",
                table: "habit_entries",
                columns: new[] { "habit_id", "date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_habits_user_id",
                table: "habits",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_habits_user_id_name",
                table: "habits",
                columns: new[] { "user_id", "name" });

            migrationBuilder.CreateIndex(
                name: "IX_journal_user_id_created_at",
                table: "journal",
                columns: new[] { "user_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ux_journal_user_date_active",
                table: "journal",
                columns: new[] { "user_id", "date" },
                unique: true,
                filter: "deleted_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_journal_entry_assets_asset_id",
                table: "journal_entry_assets",
                column: "asset_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_journal_entry_assets_journal_entry_id_deleted_at",
                table: "journal_entry_assets",
                columns: new[] { "journal_entry_id", "deleted_at" });

            migrationBuilder.CreateIndex(
                name: "IX_note_boards_user_id_created_at",
                table: "note_boards",
                columns: new[] { "user_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_note_boards_user_id_name",
                table: "note_boards",
                columns: new[] { "user_id", "name" });

            migrationBuilder.CreateIndex(
                name: "IX_note_page_assets_asset_id",
                table: "note_page_assets",
                column: "asset_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_note_page_assets_note_page_id_deleted_at",
                table: "note_page_assets",
                columns: new[] { "note_page_id", "deleted_at" });

            migrationBuilder.CreateIndex(
                name: "IX_note_pages_board_id_created_at",
                table: "note_pages",
                columns: new[] { "board_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_practice_attempts_practice_session_id_created_at",
                table: "practice_attempts",
                columns: new[] { "practice_session_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_practice_attempts_practice_session_item_id_step",
                table: "practice_attempts",
                columns: new[] { "practice_session_item_id", "step" });

            migrationBuilder.CreateIndex(
                name: "IX_practice_session_items_practice_session_id_position",
                table: "practice_session_items",
                columns: new[] { "practice_session_id", "position" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_practice_session_items_word_id",
                table: "practice_session_items",
                column: "word_id");

            migrationBuilder.CreateIndex(
                name: "IX_practice_session_summaries_page_id_completed_at",
                table: "practice_session_summaries",
                columns: new[] { "page_id", "completed_at" });

            migrationBuilder.CreateIndex(
                name: "IX_practice_session_summaries_user_id_completed_at",
                table: "practice_session_summaries",
                columns: new[] { "user_id", "completed_at" });

            migrationBuilder.CreateIndex(
                name: "IX_practice_sessions_page_id_started_at",
                table: "practice_sessions",
                columns: new[] { "page_id", "started_at" });

            migrationBuilder.CreateIndex(
                name: "IX_practice_sessions_user_id_started_at",
                table: "practice_sessions",
                columns: new[] { "user_id", "started_at" });

            migrationBuilder.CreateIndex(
                name: "IX_project_boards_user_id_deleted_at",
                table: "project_boards",
                columns: new[] { "user_id", "deleted_at" });

            migrationBuilder.CreateIndex(
                name: "IX_project_boards_user_id_name",
                table: "project_boards",
                columns: new[] { "user_id", "name" });

            migrationBuilder.CreateIndex(
                name: "IX_project_cards_column_id_deleted_at_sort_order",
                table: "project_cards",
                columns: new[] { "column_id", "deleted_at", "sort_order" });

            migrationBuilder.CreateIndex(
                name: "IX_project_cards_deadline",
                table: "project_cards",
                column: "deadline");

            migrationBuilder.CreateIndex(
                name: "IX_project_columns_board_id_deleted_at_sort_order",
                table: "project_columns",
                columns: new[] { "board_id", "deleted_at", "sort_order" });

            migrationBuilder.CreateIndex(
                name: "IX_refresh_tokens_token_hash",
                table: "refresh_tokens",
                column: "token_hash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_refresh_tokens_user_id_revoked_at",
                table: "refresh_tokens",
                columns: new[] { "user_id", "revoked_at" });

            migrationBuilder.CreateIndex(
                name: "IX_review_attempts_review_session_item_id_attempt_number",
                table: "review_attempts",
                columns: new[] { "review_session_item_id", "attempt_number" },
                unique: true,
                filter: "deleted_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_review_session_items_review_session_id_position",
                table: "review_session_items",
                columns: new[] { "review_session_id", "position" },
                unique: true,
                filter: "deleted_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_review_session_items_review_session_id_vocab_word_id",
                table: "review_session_items",
                columns: new[] { "review_session_id", "vocab_word_id" },
                unique: true,
                filter: "deleted_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_review_session_items_vocab_word_id",
                table: "review_session_items",
                column: "vocab_word_id");

            migrationBuilder.CreateIndex(
                name: "IX_review_sessions_user_id_session_date_status",
                table: "review_sessions",
                columns: new[] { "user_id", "session_date", "status" },
                filter: "deleted_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_todo_items_generated_from_todo_id",
                table: "todo_items",
                column: "generated_from_todo_id",
                unique: true,
                filter: "generated_from_todo_id IS NOT NULL AND deleted_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_todo_items_user_id_date_sort_order",
                table: "todo_items",
                columns: new[] { "user_id", "date", "sort_order" });

            migrationBuilder.CreateIndex(
                name: "IX_todo_items_user_id_is_completed_date",
                table: "todo_items",
                columns: new[] { "user_id", "is_completed", "date" });

            migrationBuilder.CreateIndex(
                name: "IX_users_current_avatar_asset_id",
                table: "users",
                column: "current_avatar_asset_id");

            migrationBuilder.CreateIndex(
                name: "IX_users_email",
                table: "users",
                column: "email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_users_google_id",
                table: "users",
                column: "google_id",
                unique: true,
                filter: "google_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_users_reset_password_token_hash",
                table: "users",
                column: "reset_password_token_hash",
                unique: true,
                filter: "reset_password_token_hash IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_vocab_board_preferences_user_id_board_id",
                table: "vocab_board_preferences",
                columns: new[] { "user_id", "board_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_vocab_boards_user_id_created_at",
                table: "vocab_boards",
                columns: new[] { "user_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_vocab_boards_user_id_name",
                table: "vocab_boards",
                columns: new[] { "user_id", "name" });

            migrationBuilder.CreateIndex(
                name: "IX_vocab_pages_board_id_created_at",
                table: "vocab_pages",
                columns: new[] { "board_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_vocab_words_page_id_created_at",
                table: "vocab_words",
                columns: new[] { "page_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_word_review_histories_review_session_item_id",
                table: "word_review_histories",
                column: "review_session_item_id");

            migrationBuilder.CreateIndex(
                name: "IX_word_review_histories_user_id_reviewed_at_active",
                table: "word_review_histories",
                columns: new[] { "user_id", "reviewed_at" },
                filter: "deleted_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_word_review_histories_user_id_session_id",
                table: "word_review_histories",
                columns: new[] { "user_id", "session_id" },
                filter: "deleted_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_word_review_histories_word_id_reviewed_at",
                table: "word_review_histories",
                columns: new[] { "word_id", "reviewed_at" });

            migrationBuilder.CreateIndex(
                name: "IX_word_review_states_user_id_next_review_date",
                table: "word_review_states",
                columns: new[] { "user_id", "next_review_date" },
                filter: "deleted_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_word_review_states_user_id_word_id",
                table: "word_review_states",
                columns: new[] { "user_id", "word_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_word_review_states_word_id",
                table: "word_review_states",
                column: "word_id");

            migrationBuilder.AddForeignKey(
                name: "FK_assets_users_uploaded_by_user_id",
                table: "assets",
                column: "uploaded_by_user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_assets_users_uploaded_by_user_id",
                table: "assets");

            migrationBuilder.DropTable(
                name: "countdowns");

            migrationBuilder.DropTable(
                name: "habit_entries");

            migrationBuilder.DropTable(
                name: "journal_entry_assets");

            migrationBuilder.DropTable(
                name: "note_page_assets");

            migrationBuilder.DropTable(
                name: "practice_attempts");

            migrationBuilder.DropTable(
                name: "practice_session_summaries");

            migrationBuilder.DropTable(
                name: "project_cards");

            migrationBuilder.DropTable(
                name: "refresh_tokens");

            migrationBuilder.DropTable(
                name: "review_attempts");

            migrationBuilder.DropTable(
                name: "todo_items");

            migrationBuilder.DropTable(
                name: "vocab_board_preferences");

            migrationBuilder.DropTable(
                name: "word_review_histories");

            migrationBuilder.DropTable(
                name: "word_review_states");

            migrationBuilder.DropTable(
                name: "habits");

            migrationBuilder.DropTable(
                name: "journal");

            migrationBuilder.DropTable(
                name: "note_pages");

            migrationBuilder.DropTable(
                name: "practice_session_items");

            migrationBuilder.DropTable(
                name: "project_columns");

            migrationBuilder.DropTable(
                name: "review_session_items");

            migrationBuilder.DropTable(
                name: "vocab_words");

            migrationBuilder.DropTable(
                name: "note_boards");

            migrationBuilder.DropTable(
                name: "practice_sessions");

            migrationBuilder.DropTable(
                name: "project_boards");

            migrationBuilder.DropTable(
                name: "review_sessions");

            migrationBuilder.DropTable(
                name: "vocab_pages");

            migrationBuilder.DropTable(
                name: "vocab_boards");

            migrationBuilder.DropTable(
                name: "users");

            migrationBuilder.DropTable(
                name: "assets");
        }
    }
}
