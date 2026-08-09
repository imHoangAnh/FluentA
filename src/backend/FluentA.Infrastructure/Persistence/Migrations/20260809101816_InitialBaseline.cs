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
                    reminder_enabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    reminder_time = table.Column<TimeOnly>(type: "time(0) without time zone", precision: 0, nullable: false),
                    last_reminder_sent_on = table.Column<DateTime>(type: "date", nullable: true),
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
                name: "notifications",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    type = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    title = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    message = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    deduplication_key = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: false),
                    action_path = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    read_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_notifications", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "pomodoro_configs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    work_minutes = table.Column<int>(type: "integer", nullable: false),
                    short_break_minutes = table.Column<int>(type: "integer", nullable: false),
                    long_break_minutes = table.Column<int>(type: "integer", nullable: false),
                    long_break_after = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pomodoro_configs", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "pomodoro_sessions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    phase = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    state = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    duration_seconds = table.Column<int>(type: "integer", nullable: false),
                    linked_task_id = table.Column<Guid>(type: "uuid", nullable: true),
                    linked_task_source = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pomodoro_sessions", x => x.id);
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
                    reminder_time = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    reminder_time_zone_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    reminder_scheduled_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    reminder_sent_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
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
                    meaning_vn = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    ipa_pronunciation = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    @class = table.Column<string>(name: "class", type: "character varying(20)", maxLength: 20, nullable: false),
                    definition = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    example = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    note = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
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
                name: "word_review_histories",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    word_id = table.Column<Guid>(type: "uuid", nullable: false),
                    session_id = table.Column<Guid>(type: "uuid", nullable: false),
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
                        name: "FK_word_review_histories_vocab_words_word_id",
                        column: x => x.word_id,
                        principalTable: "vocab_words",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
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
                    archived_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    purge_after_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
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
                    repeat_pattern = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
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
                    email_verified_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    otp_code = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    otp_expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    otp_failed_attempts = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    otp_resend_available_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    reset_password_token = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
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
                name: "countdown_alerts",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    countdown_id = table.Column<Guid>(type: "uuid", nullable: false),
                    alert_day = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    alert_time = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                    scheduled_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    fired_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_countdown_alerts", x => x.id);
                    table.ForeignKey(
                        name: "FK_countdown_alerts_countdowns_countdown_id",
                        column: x => x.countdown_id,
                        principalTable: "countdowns",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
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
                    table.ForeignKey(
                        name: "FK_practice_session_summaries_vocab_pages_page_id",
                        column: x => x.page_id,
                        principalTable: "vocab_pages",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

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
                        name: "FK_practice_settings_users_user_id",
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
                    board_id = table.Column<Guid>(type: "uuid", nullable: false),
                    order_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
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
                    table.ForeignKey(
                        name: "FK_review_sessions_vocab_boards_board_id",
                        column: x => x.board_id,
                        principalTable: "vocab_boards",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "trash_entries",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    entity_kind = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    entity_id = table.Column<Guid>(type: "uuid", nullable: false),
                    display_name = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: false),
                    original_location = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    trashed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    purge_after_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    state = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_trash_entries", x => x.id);
                    table.ForeignKey(
                        name: "FK_trash_entries_users_user_id",
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
                name: "review_session_items",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    review_session_id = table.Column<Guid>(type: "uuid", nullable: false),
                    vocab_word_id = table.Column<Guid>(type: "uuid", nullable: false),
                    is_reviewed = table.Column<bool>(type: "boolean", nullable: false),
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
                    table.ForeignKey(
                        name: "FK_review_session_items_vocab_words_vocab_word_id",
                        column: x => x.vocab_word_id,
                        principalTable: "vocab_words",
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

            migrationBuilder.CreateIndex(
                name: "IX_assets_object_key",
                table: "assets",
                column: "object_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_assets_status_purge_after_at",
                table: "assets",
                columns: new[] { "status", "purge_after_at" });

            migrationBuilder.CreateIndex(
                name: "IX_assets_uploaded_by_user_id_asset_type_deleted_at",
                table: "assets",
                columns: new[] { "uploaded_by_user_id", "asset_type", "deleted_at" });

            migrationBuilder.CreateIndex(
                name: "IX_assets_uploaded_by_user_id_status_deleted_at",
                table: "assets",
                columns: new[] { "uploaded_by_user_id", "status", "deleted_at" });

            migrationBuilder.CreateIndex(
                name: "IX_countdown_alerts_countdown_id_scheduled_at_utc",
                table: "countdown_alerts",
                columns: new[] { "countdown_id", "scheduled_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_countdowns_cover_asset_id",
                table: "countdowns",
                column: "cover_asset_id",
                unique: true,
                filter: "\"cover_asset_id\" IS NOT NULL AND \"deleted_at\" IS NULL");

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
                name: "ix_habits_reminder_due",
                table: "habits",
                columns: new[] { "reminder_enabled", "reminder_time", "last_reminder_sent_on" });

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
                name: "IX_journal_user_id_date",
                table: "journal",
                columns: new[] { "user_id", "date" });

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
                name: "IX_notifications_user_id_deduplication_key",
                table: "notifications",
                columns: new[] { "user_id", "deduplication_key" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_notifications_user_id_read_at_created_at",
                table: "notifications",
                columns: new[] { "user_id", "read_at", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_pomodoro_configs_user_id",
                table: "pomodoro_configs",
                column: "user_id",
                unique: true,
                filter: "deleted_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_pomodoro_sessions_user_id_completed_at",
                table: "pomodoro_sessions",
                columns: new[] { "user_id", "completed_at" });

            migrationBuilder.CreateIndex(
                name: "IX_practice_session_summaries_page_id_completed_at",
                table: "practice_session_summaries",
                columns: new[] { "page_id", "completed_at" });

            migrationBuilder.CreateIndex(
                name: "IX_practice_session_summaries_user_id_completed_at",
                table: "practice_session_summaries",
                columns: new[] { "user_id", "completed_at" });

            migrationBuilder.CreateIndex(
                name: "IX_practice_settings_user_id",
                table: "practice_settings",
                column: "user_id",
                unique: true);

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
                name: "IX_review_sessions_board_id",
                table: "review_sessions",
                column: "board_id");

            migrationBuilder.CreateIndex(
                name: "IX_review_sessions_user_id_board_id_session_date_status",
                table: "review_sessions",
                columns: new[] { "user_id", "board_id", "session_date", "status" },
                filter: "deleted_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_todo_items_generated_from_todo_id",
                table: "todo_items",
                column: "generated_from_todo_id",
                unique: true,
                filter: "generated_from_todo_id IS NOT NULL AND deleted_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_todo_items_reminder_scheduled_at_utc",
                table: "todo_items",
                column: "reminder_scheduled_at_utc",
                filter: "reminder_scheduled_at_utc IS NOT NULL AND reminder_sent_at_utc IS NULL AND is_completed = FALSE AND deleted_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_todo_items_user_id_date_sort_order",
                table: "todo_items",
                columns: new[] { "user_id", "date", "sort_order" });

            migrationBuilder.CreateIndex(
                name: "IX_todo_items_user_id_is_completed_date",
                table: "todo_items",
                columns: new[] { "user_id", "is_completed", "date" });

            migrationBuilder.CreateIndex(
                name: "IX_trash_entries_entity_kind_entity_id",
                table: "trash_entries",
                columns: new[] { "entity_kind", "entity_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_trash_entries_state_purge_after_at",
                table: "trash_entries",
                columns: new[] { "state", "purge_after_at" });

            migrationBuilder.CreateIndex(
                name: "IX_trash_entries_user_id_state_trashed_at",
                table: "trash_entries",
                columns: new[] { "user_id", "state", "trashed_at" });

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
                name: "IX_users_reset_password_token",
                table: "users",
                column: "reset_password_token",
                unique: true,
                filter: "reset_password_token IS NOT NULL");

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
                name: "countdown_alerts");

            migrationBuilder.DropTable(
                name: "habit_entries");

            migrationBuilder.DropTable(
                name: "journal");

            migrationBuilder.DropTable(
                name: "note_page_assets");

            migrationBuilder.DropTable(
                name: "notifications");

            migrationBuilder.DropTable(
                name: "pomodoro_configs");

            migrationBuilder.DropTable(
                name: "pomodoro_sessions");

            migrationBuilder.DropTable(
                name: "practice_session_summaries");

            migrationBuilder.DropTable(
                name: "practice_settings");

            migrationBuilder.DropTable(
                name: "project_cards");

            migrationBuilder.DropTable(
                name: "review_session_items");

            migrationBuilder.DropTable(
                name: "todo_items");

            migrationBuilder.DropTable(
                name: "trash_entries");

            migrationBuilder.DropTable(
                name: "vocab_board_preferences");

            migrationBuilder.DropTable(
                name: "word_review_histories");

            migrationBuilder.DropTable(
                name: "word_review_states");

            migrationBuilder.DropTable(
                name: "countdowns");

            migrationBuilder.DropTable(
                name: "habits");

            migrationBuilder.DropTable(
                name: "note_pages");

            migrationBuilder.DropTable(
                name: "project_columns");

            migrationBuilder.DropTable(
                name: "review_sessions");

            migrationBuilder.DropTable(
                name: "vocab_words");

            migrationBuilder.DropTable(
                name: "note_boards");

            migrationBuilder.DropTable(
                name: "project_boards");

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
