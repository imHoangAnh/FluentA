# FluentA Database Performance Baseline

Generated: 2026-07-02 09:46:00 +07:00
Database: fluenta_dev
Container: fluenta-postgres
SQL source: .\scripts\database\collect-db-performance-baseline.sql

```text
Pager usage is off.
Null display is "(null)".
# FluentA PostgreSQL Performance Baseline

## Runtime
         captured_at          | database_name | database_user |                                     postgres_version                                     
------------------------------+---------------+---------------+------------------------------------------------------------------------------------------
 2026-07-02 02:45:59.91601+00 | fluenta_dev   | fluenta       | PostgreSQL 16.14 on x86_64-pc-linux-musl, compiled by gcc (Alpine 15.2.0) 15.2.0, 64-bit
(1 row)


## Connection And Timeout Settings
 shared_preload_libraries 
--------------------------
 
(1 row)

 max_connections 
-----------------
 100
(1 row)

 idle_in_transaction_session_timeout 
-------------------------------------
 0
(1 row)

 idle_session_timeout 
----------------------
 0
(1 row)

 statement_timeout 
-------------------
 0
(1 row)

 application_name |  state   | connections 
------------------+----------+-------------
                  | internal |           5
 psql             | active   |           1
(2 rows)


## pg_stat_statements Availability
        name        | installed_version | default_version 
--------------------+-------------------+-----------------
 pg_stat_statements | (null)            | 1.10
(1 row)

                                                                                     note                                                                                     
------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 pg_stat_statements is not loaded. Add pg_stat_statements to shared_preload_libraries, restart Postgres, create the extension, and rerun this script for slow-query rankings.
(1 row)


## Target Table Statistics Freshness
         relname         | n_live_tup | n_dead_tup | last_vacuum | last_autovacuum | last_analyze | last_autoanalyze 
-------------------------+------------+------------+-------------+-----------------+--------------+------------------
 countdown_events        |          0 |          0 | (null)      | (null)          | (null)       | (null)
 flashcard_cards         |          0 |          0 | (null)      | (null)          | (null)       | (null)
 flashcard_decks         |          0 |          0 | (null)      | (null)          | (null)       | (null)
 habit_entries           |          0 |          0 | (null)      | (null)          | (null)       | (null)
 habits                  |          0 |          0 | (null)      | (null)          | (null)       | (null)
 journal_entries         |          0 |          0 | (null)      | (null)          | (null)       | (null)
 kanban_boards           |          0 |          0 | (null)      | (null)          | (null)       | (null)
 kanban_cards            |          0 |          0 | (null)      | (null)          | (null)       | (null)
 kanban_columns          |          0 |          0 | (null)      | (null)          | (null)       | (null)
 notifications           |          0 |          0 | (null)      | (null)          | (null)       | (null)
 pomodoro_sessions       |          0 |          0 | (null)      | (null)          | (null)       | (null)
 todo_items              |          0 |          0 | (null)      | (null)          | (null)       | (null)
 vocab_boards            |          0 |          0 | (null)      | (null)          | (null)       | (null)
 vocab_column_visibility |          0 |          0 | (null)      | (null)          | (null)       | (null)
 vocab_custom_columns    |          0 |          0 | (null)      | (null)          | (null)       | (null)
 vocab_custom_values     |          0 |          0 | (null)      | (null)          | (null)       | (null)
 vocab_pages             |          0 |          0 | (null)      | (null)          | (null)       | (null)
 vocab_words             |          0 |          0 | (null)      | (null)          | (null)       | (null)
 word_review_histories   |          0 |          0 | (null)      | (null)          | (null)       | (null)
 word_review_states      |          0 |          0 | (null)      | (null)          | (null)       | (null)
(20 rows)


## Target Index Inventory And Sizes
 schemaname |        tablename        |                       indexname                        | index_size | idx_scan | idx_tup_read | idx_tup_fetch |                                                                             indexdef                                                                             
------------+-------------------------+--------------------------------------------------------+------------+----------+--------------+---------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------
 public     | countdown_events        | IX_countdown_events_user_id_target_date                | 16 kB      |        0 |            0 |             0 | CREATE INDEX "IX_countdown_events_user_id_target_date" ON public.countdown_events USING btree (user_id, target_date)
 public     | countdown_events        | PK_countdown_events                                    | 16 kB      |        0 |            0 |             0 | CREATE UNIQUE INDEX "PK_countdown_events" ON public.countdown_events USING btree (id)
 public     | flashcard_cards         | IX_flashcard_cards_deck_id_word_id                     | 56 kB      |        0 |            0 |             0 | CREATE UNIQUE INDEX "IX_flashcard_cards_deck_id_word_id" ON public.flashcard_cards USING btree (deck_id, word_id)
 public     | flashcard_cards         | IX_flashcard_cards_next_review_date_state              | 16 kB      |        0 |            0 |             0 | CREATE INDEX "IX_flashcard_cards_next_review_date_state" ON public.flashcard_cards USING btree (next_review_date, state)
 public     | flashcard_cards         | IX_flashcard_cards_word_id                             | 40 kB      |        0 |            0 |             0 | CREATE INDEX "IX_flashcard_cards_word_id" ON public.flashcard_cards USING btree (word_id)
 public     | flashcard_cards         | PK_flashcard_cards                                     | 40 kB      |        0 |            0 |             0 | CREATE UNIQUE INDEX "PK_flashcard_cards" ON public.flashcard_cards USING btree (id)
 public     | flashcard_decks         | IX_flashcard_decks_board_id_type                       | 56 kB      |        0 |            0 |             0 | CREATE INDEX "IX_flashcard_decks_board_id_type" ON public.flashcard_decks USING btree (board_id, type)
 public     | flashcard_decks         | IX_flashcard_decks_page_id                             | 40 kB      |        0 |            0 |             0 | CREATE UNIQUE INDEX "IX_flashcard_decks_page_id" ON public.flashcard_decks USING btree (page_id) WHERE (page_id IS NOT NULL)
 public     | flashcard_decks         | IX_flashcard_decks_user_id_board_id                    | 40 kB      |        0 |            0 |             0 | CREATE INDEX "IX_flashcard_decks_user_id_board_id" ON public.flashcard_decks USING btree (user_id, board_id)
 public     | flashcard_decks         | PK_flashcard_decks                                     | 40 kB      |        0 |            0 |             0 | CREATE UNIQUE INDEX "PK_flashcard_decks" ON public.flashcard_decks USING btree (id)
 public     | habit_entries           | IX_habit_entries_date                                  | 16 kB      |        0 |            0 |             0 | CREATE INDEX "IX_habit_entries_date" ON public.habit_entries USING btree (date)
 public     | habit_entries           | IX_habit_entries_habit_id_date                         | 16 kB      |        0 |            0 |             0 | CREATE UNIQUE INDEX "IX_habit_entries_habit_id_date" ON public.habit_entries USING btree (habit_id, date)
 public     | habit_entries           | PK_habit_entries                                       | 16 kB      |        0 |            0 |             0 | CREATE UNIQUE INDEX "PK_habit_entries" ON public.habit_entries USING btree (id)
 public     | habits                  | IX_habits_user_id                                      | 16 kB      |        0 |            0 |             0 | CREATE INDEX "IX_habits_user_id" ON public.habits USING btree (user_id)
 public     | habits                  | IX_habits_user_id_name                                 | 16 kB      |        0 |            0 |             0 | CREATE INDEX "IX_habits_user_id_name" ON public.habits USING btree (user_id, name)
 public     | habits                  | PK_habits                                              | 16 kB      |        0 |            0 |             0 | CREATE UNIQUE INDEX "PK_habits" ON public.habits USING btree (id)
 public     | journal_entries         | IX_journal_entries_user_id_created_at                  | 16 kB      |        0 |            0 |             0 | CREATE INDEX "IX_journal_entries_user_id_created_at" ON public.journal_entries USING btree (user_id, created_at)
 public     | journal_entries         | IX_journal_entries_user_id_learning_date               | 16 kB      |        0 |            0 |             0 | CREATE INDEX "IX_journal_entries_user_id_learning_date" ON public.journal_entries USING btree (user_id, learning_date)
 public     | journal_entries         | PK_journal_entries                                     | 16 kB      |        0 |            0 |             0 | CREATE UNIQUE INDEX "PK_journal_entries" ON public.journal_entries USING btree (id)
 public     | journal_entries         | ix_journal_entries_active_plain_text_trgm              | 40 kB      |        0 |            0 |             0 | CREATE INDEX ix_journal_entries_active_plain_text_trgm ON public.journal_entries USING gin (plain_text_content gin_trgm_ops) WHERE (deleted_at IS NULL)
 public     | kanban_boards           | IX_kanban_boards_user_id_deleted_at                    | 16 kB      |        0 |            0 |             0 | CREATE INDEX "IX_kanban_boards_user_id_deleted_at" ON public.kanban_boards USING btree (user_id, deleted_at)
 public     | kanban_boards           | IX_kanban_boards_user_id_name                          | 16 kB      |        0 |            0 |             0 | CREATE INDEX "IX_kanban_boards_user_id_name" ON public.kanban_boards USING btree (user_id, name)
 public     | kanban_boards           | PK_kanban_boards                                       | 16 kB      |        0 |            0 |             0 | CREATE UNIQUE INDEX "PK_kanban_boards" ON public.kanban_boards USING btree (id)
 public     | kanban_cards            | IX_kanban_cards_column_id_deleted_at_sort_order        | 16 kB      |        0 |            0 |             0 | CREATE INDEX "IX_kanban_cards_column_id_deleted_at_sort_order" ON public.kanban_cards USING btree (column_id, deleted_at, sort_order)
 public     | kanban_cards            | IX_kanban_cards_deadline                               | 16 kB      |        0 |            0 |             0 | CREATE INDEX "IX_kanban_cards_deadline" ON public.kanban_cards USING btree (deadline)
 public     | kanban_cards            | PK_kanban_cards                                        | 16 kB      |        0 |            0 |             0 | CREATE UNIQUE INDEX "PK_kanban_cards" ON public.kanban_cards USING btree (id)
 public     | kanban_columns          | IX_kanban_columns_board_id_deleted_at_sort_order       | 16 kB      |        0 |            0 |             0 | CREATE INDEX "IX_kanban_columns_board_id_deleted_at_sort_order" ON public.kanban_columns USING btree (board_id, deleted_at, sort_order)
 public     | kanban_columns          | PK_kanban_columns                                      | 16 kB      |        0 |            0 |             0 | CREATE UNIQUE INDEX "PK_kanban_columns" ON public.kanban_columns USING btree (id)
 public     | notifications           | IX_notifications_user_id_deduplication_key             | 32 kB      |        0 |            0 |             0 | CREATE UNIQUE INDEX "IX_notifications_user_id_deduplication_key" ON public.notifications USING btree (user_id, deduplication_key)
 public     | notifications           | IX_notifications_user_id_read_at_created_at            | 16 kB      |        0 |            0 |             0 | CREATE INDEX "IX_notifications_user_id_read_at_created_at" ON public.notifications USING btree (user_id, read_at, created_at)
 public     | notifications           | PK_notifications                                       | 16 kB      |        0 |            0 |             0 | CREATE UNIQUE INDEX "PK_notifications" ON public.notifications USING btree (id)
 public     | pomodoro_sessions       | IX_pomodoro_sessions_user_id_completed_at              | 16 kB      |        0 |            0 |             0 | CREATE INDEX "IX_pomodoro_sessions_user_id_completed_at" ON public.pomodoro_sessions USING btree (user_id, completed_at)
 public     | pomodoro_sessions       | PK_pomodoro_sessions                                   | 16 kB      |        0 |            0 |             0 | CREATE UNIQUE INDEX "PK_pomodoro_sessions" ON public.pomodoro_sessions USING btree (id)
 public     | todo_items              | IX_todo_items_user_id_date                             | 16 kB      |        0 |            0 |             0 | CREATE INDEX "IX_todo_items_user_id_date" ON public.todo_items USING btree (user_id, date)
 public     | todo_items              | IX_todo_items_user_id_date_sort_order                  | 16 kB      |        0 |            0 |             0 | CREATE INDEX "IX_todo_items_user_id_date_sort_order" ON public.todo_items USING btree (user_id, date, sort_order)
 public     | todo_items              | IX_todo_items_user_id_is_completed_date                | 16 kB      |        0 |            0 |             0 | CREATE INDEX "IX_todo_items_user_id_is_completed_date" ON public.todo_items USING btree (user_id, is_completed, date)
 public     | todo_items              | PK_todo_items                                          | 16 kB      |        0 |            0 |             0 | CREATE UNIQUE INDEX "PK_todo_items" ON public.todo_items USING btree (id)
 public     | vocab_boards            | IX_vocab_boards_user_id_name                           | 40 kB      |        0 |            0 |             0 | CREATE INDEX "IX_vocab_boards_user_id_name" ON public.vocab_boards USING btree (user_id, name)
 public     | vocab_boards            | IX_vocab_boards_user_id_sort_order                     | 40 kB      |        0 |            0 |             0 | CREATE INDEX "IX_vocab_boards_user_id_sort_order" ON public.vocab_boards USING btree (user_id, sort_order)
 public     | vocab_boards            | PK_vocab_boards                                        | 40 kB      |        0 |            0 |             0 | CREATE UNIQUE INDEX "PK_vocab_boards" ON public.vocab_boards USING btree (id)
 public     | vocab_column_visibility | IX_vocab_column_visibility_board_id                    | 16 kB      |        0 |            0 |             0 | CREATE INDEX "IX_vocab_column_visibility_board_id" ON public.vocab_column_visibility USING btree (board_id)
 public     | vocab_column_visibility | IX_vocab_column_visibility_user_id_board_id_column_key | 16 kB      |        0 |            0 |             0 | CREATE UNIQUE INDEX "IX_vocab_column_visibility_user_id_board_id_column_key" ON public.vocab_column_visibility USING btree (user_id, board_id, column_key)
 public     | vocab_column_visibility | PK_vocab_column_visibility                             | 16 kB      |        0 |            0 |             0 | CREATE UNIQUE INDEX "PK_vocab_column_visibility" ON public.vocab_column_visibility USING btree (id)
 public     | vocab_custom_columns    | IX_vocab_custom_columns_board_id_name                  | 16 kB      |        0 |            0 |             0 | CREATE UNIQUE INDEX "IX_vocab_custom_columns_board_id_name" ON public.vocab_custom_columns USING btree (board_id, name)
 public     | vocab_custom_columns    | IX_vocab_custom_columns_board_id_sort_order            | 16 kB      |        0 |            0 |             0 | CREATE INDEX "IX_vocab_custom_columns_board_id_sort_order" ON public.vocab_custom_columns USING btree (board_id, sort_order)
 public     | vocab_custom_columns    | PK_vocab_custom_columns                                | 16 kB      |        0 |            0 |             0 | CREATE UNIQUE INDEX "PK_vocab_custom_columns" ON public.vocab_custom_columns USING btree (id)
 public     | vocab_custom_values     | IX_vocab_custom_values_column_id                       | 16 kB      |        0 |            0 |             0 | CREATE INDEX "IX_vocab_custom_values_column_id" ON public.vocab_custom_values USING btree (column_id)
 public     | vocab_custom_values     | IX_vocab_custom_values_word_id_column_id               | 16 kB      |        0 |            0 |             0 | CREATE UNIQUE INDEX "IX_vocab_custom_values_word_id_column_id" ON public.vocab_custom_values USING btree (word_id, column_id)
 public     | vocab_custom_values     | PK_vocab_custom_values                                 | 16 kB      |        0 |            0 |             0 | CREATE UNIQUE INDEX "PK_vocab_custom_values" ON public.vocab_custom_values USING btree (id)
 public     | vocab_pages             | IX_vocab_pages_board_id_sort_order                     | 40 kB      |        0 |            0 |             0 | CREATE INDEX "IX_vocab_pages_board_id_sort_order" ON public.vocab_pages USING btree (board_id, sort_order)
 public     | vocab_pages             | PK_vocab_pages                                         | 40 kB      |        0 |            0 |             0 | CREATE UNIQUE INDEX "PK_vocab_pages" ON public.vocab_pages USING btree (id)
 public     | vocab_words             | IX_vocab_words_page_id_created_at                      | 48 kB      |        0 |            0 |             0 | CREATE INDEX "IX_vocab_words_page_id_created_at" ON public.vocab_words USING btree (page_id, created_at)
 public     | vocab_words             | PK_vocab_words                                         | 40 kB      |        0 |            0 |             0 | CREATE UNIQUE INDEX "PK_vocab_words" ON public.vocab_words USING btree (id)
 public     | word_review_histories   | IX_word_review_histories_user_id_reviewed_at_active    | 16 kB      |        0 |            0 |             0 | CREATE INDEX "IX_word_review_histories_user_id_reviewed_at_active" ON public.word_review_histories USING btree (user_id, reviewed_at) WHERE (deleted_at IS NULL)
 public     | word_review_histories   | IX_word_review_histories_user_id_session_id            | 16 kB      |        0 |            0 |             0 | CREATE INDEX "IX_word_review_histories_user_id_session_id" ON public.word_review_histories USING btree (user_id, session_id) WHERE (deleted_at IS NULL)
 public     | word_review_histories   | IX_word_review_histories_word_id_reviewed_at           | 16 kB      |        0 |            0 |             0 | CREATE INDEX "IX_word_review_histories_word_id_reviewed_at" ON public.word_review_histories USING btree (word_id, reviewed_at)
 public     | word_review_histories   | PK_word_review_histories                               | 16 kB      |        0 |            0 |             0 | CREATE UNIQUE INDEX "PK_word_review_histories" ON public.word_review_histories USING btree (id)
 public     | word_review_states      | IX_word_review_states_user_id_next_review_date         | 16 kB      |        0 |            0 |             0 | CREATE INDEX "IX_word_review_states_user_id_next_review_date" ON public.word_review_states USING btree (user_id, next_review_date) WHERE (deleted_at IS NULL)
 public     | word_review_states      | IX_word_review_states_word_id                          | 16 kB      |        0 |            0 |             0 | CREATE UNIQUE INDEX "IX_word_review_states_word_id" ON public.word_review_states USING btree (word_id)
 public     | word_review_states      | PK_word_review_states                                  | 16 kB      |        0 |            0 |             0 | CREATE UNIQUE INDEX "PK_word_review_states" ON public.word_review_states USING btree (id)
(60 rows)


## Missing Foreign-Key Index Audit
 table_name | constraint_name | columns 
------------+-----------------+---------
(0 rows)


## Representative EXPLAIN Plans

### Flashcard dashboard total active page-deck cards
                                                                                     QUERY PLAN                                                                                      
-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Aggregate  (cost=46.97..46.98 rows=1 width=8) (actual time=5.052..5.055 rows=1 loops=1)
   Buffers: shared hit=59 read=40
   ->  Nested Loop  (cost=38.39..46.97 rows=1 width=0) (actual time=4.532..5.050 rows=11 loops=1)
         Buffers: shared hit=59 read=40
         ->  Nested Loop  (cost=38.12..46.51 rows=1 width=16) (actual time=4.511..5.015 rows=11 loops=1)
               Buffers: shared hit=26 read=40
               ->  Nested Loop  (cost=37.84..45.89 rows=1 width=32) (actual time=3.629..4.170 rows=9 loops=1)
                     Buffers: shared hit=8 read=34
                     ->  Limit  (cost=37.57..37.57 rows=1 width=48) (actual time=2.940..2.943 rows=1 loops=1)
                           Buffers: shared hit=6 read=27
                           ->  Sort  (cost=37.57..37.88 rows=125 width=48) (actual time=2.938..2.941 rows=1 loops=1)
                                 Sort Key: b.created_at, u.created_at
                                 Sort Method: top-N heapsort  Memory: 25kB
                                 Buffers: shared hit=6 read=27
                                 ->  Hash Right Join  (cost=23.70..36.95 rows=125 width=48) (actual time=2.314..2.825 rows=121 loops=1)
                                       Hash Cond: (b.user_id = u.id)
                                       Buffers: shared hit=3 read=27
                                       ->  Seq Scan on vocab_boards b  (cost=0.00..12.36 rows=333 width=40) (actual time=0.353..1.171 rows=336 loops=1)
                                             Filter: (deleted_at IS NULL)
                                             Rows Removed by Filter: 3
                                             Buffers: shared hit=3 read=6
                                       ->  Hash  (cost=22.20..22.20 rows=120 width=24) (actual time=1.605..1.606 rows=120 loops=1)
                                             Buckets: 1024  Batches: 1  Memory Usage: 15kB
                                             Buffers: shared read=21
                                             ->  Seq Scan on auth_users u  (cost=0.00..22.20 rows=120 width=24) (actual time=0.557..1.569 rows=120 loops=1)
                                                   Buffers: shared read=21
                     ->  Index Scan using "IX_flashcard_decks_user_id_board_id" on flashcard_decks deck  (cost=0.27..8.30 rows=1 width=48) (actual time=0.684..1.220 rows=9 loops=1)
                           Index Cond: (user_id = u.id)
                           Filter: ((deleted_at IS NULL) AND ((type)::text = 'PageDeck'::text) AND ((b.id IS NULL) OR (board_id = b.id)))
                           Rows Removed by Filter: 2
                           Buffers: shared hit=2 read=7
               ->  Index Scan using "IX_flashcard_cards_deck_id_word_id" on flashcard_cards card  (cost=0.27..0.60 rows=2 width=16) (actual time=0.038..0.093 rows=1 loops=9)
                     Index Cond: (deck_id = deck.id)
                     Filter: (deleted_at IS NULL)
                     Buffers: shared hit=18 read=6
         ->  Index Scan using "PK_vocab_boards" on vocab_boards board  (cost=0.27..0.46 rows=1 width=16) (actual time=0.003..0.003 rows=1 loops=11)
               Index Cond: (id = deck.board_id)
               Filter: (deleted_at IS NULL)
               Buffers: shared hit=33
 Planning:
   Buffers: shared hit=189 read=59 dirtied=5
 Planning Time: 18.570 ms
 Execution Time: 5.157 ms
(43 rows)


### Review dashboard due-state counts
                                                                                  QUERY PLAN                                                                                  
------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Aggregate  (cost=45.90..45.91 rows=1 width=8) (actual time=0.188..0.192 rows=1 loops=1)
   Buffers: shared hit=33
   ->  Nested Loop  (cost=38.41..45.89 rows=1 width=0) (actual time=0.186..0.190 rows=0 loops=1)
         Join Filter: (word.id = state.word_id)
         Buffers: shared hit=33
         ->  Nested Loop  (cost=38.14..45.22 rows=1 width=32) (actual time=0.186..0.189 rows=0 loops=1)
               Buffers: shared hit=33
               ->  Nested Loop  (cost=37.87..44.75 rows=1 width=32) (actual time=0.186..0.189 rows=0 loops=1)
                     Join Filter: (((target.board_id IS NULL) OR (board.id = target.board_id)) AND (board.user_id = target.user_id))
                     Buffers: shared hit=33
                     ->  Hash Join  (cost=37.60..41.90 rows=2 width=64) (actual time=0.186..0.189 rows=0 loops=1)
                           Hash Cond: (state.user_id = target.user_id)
                           Buffers: shared hit=33
                           ->  Seq Scan on word_review_states state  (cost=0.00..4.09 rows=50 width=32) (actual time=0.016..0.024 rows=48 loops=1)
                                 Filter: ((deleted_at IS NULL) AND (next_review_date < now()))
                                 Rows Removed by Filter: 25
                                 Buffers: shared hit=3
                           ->  Hash  (cost=37.58..37.58 rows=1 width=32) (actual time=0.155..0.158 rows=1 loops=1)
                                 Buckets: 1024  Batches: 1  Memory Usage: 9kB
                                 Buffers: shared hit=30
                                 ->  Subquery Scan on target  (cost=37.57..37.58 rows=1 width=32) (actual time=0.150..0.152 rows=1 loops=1)
                                       Buffers: shared hit=30
                                       ->  Limit  (cost=37.57..37.57 rows=1 width=48) (actual time=0.150..0.151 rows=1 loops=1)
                                             Buffers: shared hit=30
                                             ->  Sort  (cost=37.57..37.88 rows=125 width=48) (actual time=0.149..0.149 rows=1 loops=1)
                                                   Sort Key: b.created_at, u.created_at
                                                   Sort Method: top-N heapsort  Memory: 25kB
                                                   Buffers: shared hit=30
                                                   ->  Hash Right Join  (cost=23.70..36.95 rows=125 width=48) (actual time=0.094..0.128 rows=121 loops=1)
                                                         Hash Cond: (b.user_id = u.id)
                                                         Buffers: shared hit=30
                                                         ->  Seq Scan on vocab_boards b  (cost=0.00..12.36 rows=333 width=40) (actual time=0.004..0.035 rows=336 loops=1)
                                                               Filter: (deleted_at IS NULL)
                                                               Rows Removed by Filter: 3
                                                               Buffers: shared hit=9
                                                         ->  Hash  (cost=22.20..22.20 rows=120 width=24) (actual time=0.049..0.049 rows=120 loops=1)
                                                               Buckets: 1024  Batches: 1  Memory Usage: 15kB
                                                               Buffers: shared hit=21
                                                               ->  Seq Scan on auth_users u  (cost=0.00..22.20 rows=120 width=24) (actual time=0.004..0.029 rows=120 loops=1)
                                                                     Buffers: shared hit=21
                     ->  Index Scan using "IX_vocab_boards_user_id_sort_order" on vocab_boards board  (cost=0.27..1.41 rows=1 width=32) (never executed)
                           Index Cond: (user_id = state.user_id)
                           Filter: (deleted_at IS NULL)
               ->  Index Scan using "IX_vocab_pages_board_id_sort_order" on vocab_pages page  (cost=0.27..0.46 rows=1 width=32) (never executed)
                     Index Cond: (board_id = board.id)
                     Filter: (deleted_at IS NULL)
         ->  Index Scan using "IX_vocab_words_page_id_created_at" on vocab_words word  (cost=0.27..0.67 rows=1 width=32) (never executed)
               Index Cond: (page_id = page.id)
               Filter: (deleted_at IS NULL)
 Planning:
   Buffers: shared hit=78 read=28
 Planning Time: 11.851 ms
 Execution Time: 0.298 ms
(53 rows)


### Review dashboard retention aggregate
                                                                            QUERY PLAN                                                                            
------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Aggregate  (cost=47.83..47.84 rows=1 width=16) (actual time=0.960..0.962 rows=1 loops=1)
   Buffers: shared hit=45 read=4
   ->  Nested Loop  (cost=38.39..47.82 rows=1 width=58) (actual time=0.958..0.959 rows=0 loops=1)
         Join Filter: (((b.id IS NULL) OR (board.id = b.id)) AND (u.id = review.user_id))
         Rows Removed by Join Filter: 2
         Buffers: shared hit=45 read=4
         ->  Nested Loop  (cost=0.82..10.23 rows=1 width=90) (actual time=0.784..0.804 rows=2 loops=1)
               Buffers: shared hit=15 read=4
               ->  Nested Loop  (cost=0.55..9.77 rows=1 width=90) (actual time=0.763..0.781 rows=2 loops=1)
                     Buffers: shared hit=9 read=4
                     ->  Nested Loop  (cost=0.27..9.35 rows=1 width=90) (actual time=0.363..0.378 rows=2 loops=1)
                           Buffers: shared hit=4 read=3
                           ->  Seq Scan on word_review_histories review  (cost=0.00..1.02 rows=1 width=90) (actual time=0.019..0.020 rows=2 loops=1)
                                 Filter: (deleted_at IS NULL)
                                 Buffers: shared hit=1
                           ->  Index Scan using "PK_vocab_words" on vocab_words word  (cost=0.27..8.29 rows=1 width=32) (actual time=0.177..0.177 rows=1 loops=2)
                                 Index Cond: (id = review.word_id)
                                 Filter: (deleted_at IS NULL)
                                 Buffers: shared hit=3 read=3
                     ->  Index Scan using "PK_vocab_pages" on vocab_pages page  (cost=0.27..0.42 rows=1 width=32) (actual time=0.199..0.199 rows=1 loops=2)
                           Index Cond: (id = word.page_id)
                           Filter: (deleted_at IS NULL)
                           Buffers: shared hit=5 read=1
               ->  Index Scan using "PK_vocab_boards" on vocab_boards board  (cost=0.27..0.46 rows=1 width=16) (actual time=0.010..0.010 rows=1 loops=2)
                     Index Cond: (id = page.board_id)
                     Filter: (deleted_at IS NULL)
                     Buffers: shared hit=6
         ->  Limit  (cost=37.57..37.57 rows=1 width=48) (actual time=0.076..0.076 rows=1 loops=2)
               Buffers: shared hit=30
               ->  Sort  (cost=37.57..37.88 rows=125 width=48) (actual time=0.075..0.076 rows=1 loops=2)
                     Sort Key: b.created_at, u.created_at
                     Sort Method: top-N heapsort  Memory: 25kB
                     Buffers: shared hit=30
                     ->  Hash Right Join  (cost=23.70..36.95 rows=125 width=48) (actual time=0.093..0.128 rows=121 loops=1)
                           Hash Cond: (b.user_id = u.id)
                           Buffers: shared hit=30
                           ->  Seq Scan on vocab_boards b  (cost=0.00..12.36 rows=333 width=40) (actual time=0.003..0.035 rows=336 loops=1)
                                 Filter: (deleted_at IS NULL)
                                 Rows Removed by Filter: 3
                                 Buffers: shared hit=9
                           ->  Hash  (cost=22.20..22.20 rows=120 width=24) (actual time=0.055..0.055 rows=120 loops=1)
                                 Buckets: 1024  Batches: 1  Memory Usage: 15kB
                                 Buffers: shared hit=21
                                 ->  Seq Scan on auth_users u  (cost=0.00..22.20 rows=120 width=24) (actual time=0.007..0.034 rows=120 loops=1)
                                       Buffers: shared hit=21
 Planning:
   Buffers: shared hit=48 read=4
 Planning Time: 2.339 ms
 Execution Time: 1.115 ms
(49 rows)


### Review session summary
                                                            QUERY PLAN                                                            
----------------------------------------------------------------------------------------------------------------------------------
 Nested Loop  (cost=1.03..2.08 rows=1 width=62) (actual time=0.020..0.022 rows=2 loops=1)
   Join Filter: ((word_review_histories.user_id = review.user_id) AND (word_review_histories.session_id = review.session_id))
   Buffers: shared hit=2
   ->  Seq Scan on word_review_histories review  (cost=0.00..1.02 rows=1 width=94) (actual time=0.004..0.005 rows=2 loops=1)
         Filter: (deleted_at IS NULL)
         Buffers: shared hit=1
   ->  Limit  (cost=1.03..1.03 rows=1 width=40) (actual time=0.007..0.007 rows=1 loops=2)
         Buffers: shared hit=1
         ->  Sort  (cost=1.03..1.03 rows=1 width=40) (actual time=0.007..0.007 rows=1 loops=2)
               Sort Key: word_review_histories.reviewed_at DESC
               Sort Method: quicksort  Memory: 25kB
               Buffers: shared hit=1
               ->  Seq Scan on word_review_histories  (cost=0.00..1.02 rows=1 width=40) (actual time=0.001..0.002 rows=2 loops=1)
                     Filter: (deleted_at IS NULL)
                     Buffers: shared hit=1
 Planning:
   Buffers: shared hit=11
 Planning Time: 0.226 ms
 Execution Time: 0.047 ms
(19 rows)

```
