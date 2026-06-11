# FluentA — Post-MVP Feature Specification

**Version:** 1.1  
**Date:** 10/06/2026  
**Status:** Ready for Implementation  
**Prerequisite:** SPEC.md (MVP — Auth, Vocabulary Board, Flash Card) must be fully implemented  
**References:** SRSFluentA.md v1.1 · UseCaseFluentA.md v1.0 · UseStoryFluentA.md v1.0 · ArchitechtureFluentA.md v1.2

---

## Table of Contents

1. [Scope Overview](#1-scope-overview)
2. [Architecture Additions](#2-architecture-additions)
3. [Feature 4 — Dashboard Overview](#3-feature-4--dashboard-overview)
4. [Feature 5 — Todo List](#4-feature-5--todo-list)
5. [Feature 6 — Countdown](#5-feature-6--countdown)
6. [Feature 7 — Habit Tracker](#6-feature-7--habit-tracker)
7. [Feature 8 — Kanban Board](#7-feature-8--kanban-board)
8. [Feature 9 — Pomodoro & Stopwatch](#8-feature-9--pomodoro--stopwatch)
9. [Feature 10 — Journal Pages](#9-feature-10--journal-pages)
10. [Data Models — Post-MVP Entities](#10-data-models--post-mvp-entities)
11. [API Contract — All New Endpoints](#11-api-contract--all-new-endpoints)
12. [SignalR Events — Post-MVP](#12-signalr-events--post-mvp)
13. [Background Jobs — Post-MVP](#13-background-jobs--post-mvp)
14. [Implementation Order & Sprint Plan](#14-implementation-order--sprint-plan)
15. [Definition of Done](#15-definition-of-done)

---

## 1. Scope Overview

### 1.1 What This Spec Covers

This spec covers the remaining features needed to complete the FluentA application after the MVP (SPEC.md) has been shipped. *(Note: Dictation and Shadowing have been removed from this phase and will be developed later).*

| # | Feature | User Stories | Story Points | Priority |
|---|---------|:---:|:---:|:---:|
| 4 | Dashboard Overview | US-041 → US-045 | 14 SP | 🔴 High |
| 5 | Todo List | US-026 → US-028 | 9 SP | 🔴 High |
| 6 | Countdown | US-029 → US-030 | 4 SP | 🟡 Medium |
| 7 | Habit Tracker | US-034 → US-036 | 10 SP | 🔴 High |
| 8 | Kanban Board | US-031 → US-033 | 10 SP | 🟡 Medium |
| 9 | Pomodoro & Stopwatch | US-037 → US-040 | 10 SP | 🟡 Medium |
| 10 | Journal Pages | US-023 → US-025 | 10 SP | 🟡 Medium |
| | **Total** | **23 User Stories** | **67 SP** | |

### 1.2 Dependency Graph

```
Dashboard Overview ──depends on──► Todo, Flash Card (MVP), Countdown, Habit
Todo List ─────────── independent (no dependency on other post-MVP features)
Countdown ─────────── independent
Habit Tracker ─────── independent
Kanban Board ──────── independent
Pomodoro ──────────── soft dependency on Todo + Kanban (link task to session)
Journal Pages ─────── independent
```

> **Key insight:** Dashboard Overview depends on Todo, Countdown, Habit, and Flash Card (MVP). Therefore, implement Todo, Countdown, and Habit **before** Dashboard Overview.

### 1.3 Recommended Build Order

| Sprint | Features | Story Points | Rationale |
|:---:|---------|:---:|---------|
| S1 | Todo List + Countdown | 13 SP | Independent, simple, unblocks Dashboard |
| S2 | Habit Tracker + Journal Pages | 20 SP | Independent, unblocks Dashboard |
| S3 | Dashboard Overview | 14 SP | All dependencies now available |
| S4 | Kanban Board + Pomodoro & Stopwatch | 20 SP | Independent features |

---

## 2. Architecture Additions

### 2.1 New Bounded Contexts

The MVP solution already has `Auth`, `Vocabulary`, and `Flashcard` bounded contexts. This spec adds:

```
FluentA.Domain/BoundedContexts/
├── Auth/                   # (MVP — exists)
├── Vocabulary/             # (MVP — exists)
├── Flashcard/              # (MVP — exists)
├── Todo/                   # NEW
│   └── Entities/
│       └── TodoItem.cs
├── Countdown/              # NEW
│   └── Entities/
│       └── CountdownEvent.cs
├── Habit/                  # NEW
│   └── Entities/
│       ├── Habit.cs
│       └── HabitEntry.cs
├── Kanban/                 # NEW
│   └── Entities/
│       ├── KanbanBoard.cs
│       ├── KanbanColumn.cs
│       └── KanbanCard.cs
├── Pomodoro/               # NEW
│   └── Entities/
│       ├── PomodoroSession.cs
│       └── PomodoroConfig.cs
└── Journal/                # NEW
    └── Entities/
        └── JournalEntry.cs
```

### 2.2 New Controllers

```
FluentA.API/Controllers/
├── AuthController.cs          # (MVP — exists)
├── VocabularyController.cs    # (MVP — exists)
├── FlashcardController.cs     # (MVP — exists)
├── DashboardController.cs     # NEW
├── TodoController.cs          # NEW
├── CountdownController.cs     # NEW
├── HabitController.cs         # NEW
├── KanbanController.cs        # NEW
├── PomodoroController.cs      # NEW
└── JournalController.cs       # NEW
```

### 2.3 New Frontend Routes

```
src/routes/
├── auth/            # (MVP — exists)
├── vocabulary/      # (MVP — exists)
├── flashcard/       # (MVP — exists)
├── dashboard/       # NEW
│   └── DashboardPage.tsx
├── todo/            # NEW
│   └── TodoPage.tsx
├── countdown/       # NEW
│   └── CountdownPage.tsx
├── habit/           # NEW
│   └── HabitPage.tsx
├── kanban/          # NEW
│   ├── KanbanListPage.tsx
│   └── KanbanBoardPage.tsx
├── pomodoro/        # NEW
│   └── PomodoroPage.tsx
└── journal/         # NEW
    └── JournalPage.tsx
```

### 2.4 Sidebar Navigation

```
┌─────────────────────────────┐
│  FluentA                    │
│                             │
│  📊 Dashboard               │  ← home/default
│                             │
│  ── Học ngôn ngữ ──         │
│  📖 Vocabulary Board        │
│  🃏 Flash Card              │
│  📝 Journal                 │
│                             │
│  ── Quản lý cá nhân ──      │
│  ✅ Todo List               │
│  ⏳ Countdown               │
│  📋 Kanban Board            │
│  🔄 Habit Tracker           │
│  🍅 Pomodoro                │
│                             │
│  ──────────────             │
│  ⚙️ Settings                │
│  🚪 Logout                  │
└─────────────────────────────┘
```

---

## 3. Feature 4 — Dashboard Overview

### 3.1 Overview

The Dashboard is the **home screen** after login. It aggregates the most important daily information from multiple features into a single glance, so the user knows exactly what needs attention today.

**User Stories:** US-041, US-042, US-043, US-044, US-045  
**Story Points:** 14 SP | **Ref:** FR-110, UC-12.1 → UC-12.3

### 3.2 Page Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Good morning, Hoang! 👋            Monday, June 9, 2026    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─── Flash Card ──────────────┐ ┌─── Streak ────────────┐  │
│  │  📚 IELTS: 12 cards due     │ │  🔥 15 days           │  │
│  │  📚 HSK 3: 5 cards due      │ │  Keep it up!          │  │
│  │  [Review Now →]             │ │                       │  │
│  └─────────────────────────────┘ └───────────────────────┘  │
│                                                              │
│  ┌─── Todo Today ──────────────┐ ┌─── Habit Today ───────┐  │
│  │  ☐ Review IELTS Unit 3     │ │  ✅ Learn 10 words 🔥3│  │
│  │  ✅ Submit homework         │ │  ☐ Read English 30min │  │
│  │  ☐ Read Chapter 5          │ │                       │  │
│  │  3 more tasks...           │ │                       │  │
│  │  [View All →]              │ │                       │  │
│  └─────────────────────────────┘ └───────────────────────┘  │
│                                                              │
│  ┌─── Countdown ───────────────────────────────────────────┐ │
│  │  🎓 IELTS Exam — 23 days 14 hours                      │ │
│  │  📅 Project Deadline — 5 days 2 hours                   │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 3.3 Widget Specifications

#### 3.3.1 Flash Card Widget

| Field | Description |
|-------|-------------|
| Content | Per-board: board name + cards due today (overdue + due + new) |
| Action | "Review Now" button → navigates to All Words Deck review for that board |
| Data source | `GET /api/v1/flashcards/dashboard` (exists from MVP) |
| Empty state | "No cards due today. Great work! 🎉" |

#### 3.3.2 Streak Widget

| Field | Description |
|-------|-------------|
| Content | 🔥 icon + consecutive days with at least 1 Flash Card review |
| Motivation text | < 7 days: "Keep going!", 7–30: "Great streak!", 30+: "You're on fire!" |
| Data source | `GET /api/v1/flashcards/dashboard` → `streak` field |

#### 3.3.3 Todo Widget

| Field | Description |
|-------|-------------|
| Content | Top 5–7 incomplete tasks for today, with checkbox to toggle completion |
| Footer | "X more tasks..." + "View All →" link to full Todo page |
| Action | Clicking checkbox → `PATCH /api/v1/todos/{id}` → SignalR broadcast |
| Data source | `GET /api/v1/dashboard/overview` → `todos` array |

#### 3.3.4 Habit Widget

| Field | Description |
|-------|-------------|
| Content | Today's habits with ☐/✅ status + streak per habit |
| Action | Clicking checkbox → `POST /api/v1/habits/{id}/entries` → toggles today's check |
| Data source | `GET /api/v1/dashboard/overview` → `habits` array |

#### 3.3.5 Countdown Widget

| Field | Description |
|-------|-------------|
| Content | Top 1–3 upcoming countdowns, sorted by nearest date |
| Display | Event name + "X days Y hours" remaining (updates every second client-side) |
| Completed | If target date has passed → show "Completed ✅" badge |
| Data source | `GET /api/v1/dashboard/overview` → `countdowns` array |

### 3.4 Quick Actions from Dashboard

| Action | API Call | SignalR Event |
|--------|---------|---------------|
| Toggle todo checkbox | `PATCH /api/v1/todos/{id}` | `TodoItemChecked` |
| Toggle habit checkbox | `POST /api/v1/habits/{id}/entries` | `HabitChecked` |
| Click "Review Now" | Navigate to `/flashcard/review/{boardId}` | — |
| Click "View All" (Todo) | Navigate to `/todo` | — |

### 3.5 Dashboard Greeting Logic

```typescript
function getGreeting(hour: number, name: string): string {
  if (hour >= 5 && hour < 12) return `Good morning, ${name}! ☀️`;
  if (hour >= 12 && hour < 17) return `Good afternoon, ${name}! 🌤️`;
  if (hour >= 17 && hour < 21) return `Good evening, ${name}! 🌆`;
  return `Burning midnight oil, ${name}? 🌙`;
}
```

### 3.6 Dashboard API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/dashboard/overview` | Aggregated overview (todos, habits, countdowns, flash card due) |

**Response:**
```json
{
  "success": true,
  "data": {
    "greeting": "Good morning",
    "date": "2026-06-09",
    "todos": {
      "items": [
        { "id": "...", "title": "Review IELTS Unit 3", "isCompleted": false, "date": "2026-06-09" }
      ],
      "totalRemaining": 8
    },
    "flashcard": {
      "boards": [
        { "boardId": "...", "boardName": "IELTS", "dueToday": 12 },
        { "boardId": "...", "boardName": "HSK 3", "dueToday": 5 }
      ],
      "streak": 15
    },
    "habits": [
      { "id": "...", "name": "Learn 10 words", "isCheckedToday": true, "streak": 3 },
      { "id": "...", "name": "Read English 30min", "isCheckedToday": false, "streak": 0 }
    ],
    "countdowns": [
      { "id": "...", "name": "IELTS Exam", "targetDate": "2026-07-02T09:00:00Z", "isCompleted": false }
    ]
  }
}
```

### 3.7 Acceptance Criteria

- [ ] Dashboard is the default page after login
- [ ] Greeting changes based on time of day (morning/afternoon/evening/night)
- [ ] Todo widget shows top 5–7 tasks; checkbox toggles completion inline
- [ ] Flash Card widget shows per-board due counts; "Review Now" navigates to review
- [ ] Streak shows correct consecutive days with fire emoji
- [ ] Habit widget shows today's habits with toggle + individual streak
- [ ] Countdown widget shows up to 3 nearest events with live countdown
- [ ] All quick actions update via SignalR → all open tabs refresh
- [ ] Widget visibility can be toggled (⚙️ settings)

---

## 4. Feature 5 — Todo List

### 4.1 Overview

Simple, daily-focused task management. Users create tasks assigned to specific dates, view them in **Day view** or **Week view**, and drag tasks between days.

**User Stories:** US-026, US-027, US-028  
**Story Points:** 9 SP | **Ref:** FR-060, UC-07.1, UC-07.2

### 4.2 Domain Entity

```csharp
public class TodoItem : BaseEntity, IAggregateRoot
{
    public Guid UserId { get; private set; }
    public string Title { get; private set; }
    public string? Note { get; private set; }
    public DateTime Date { get; private set; }          // assigned date
    public bool IsCompleted { get; private set; }
    public DateTime? CompletedAt { get; private set; }
    public int SortOrder { get; private set; }
    public bool IsCarriedOver { get; private set; }     // from previous day
    public DateTime? OriginalDate { get; private set; } // if carried over

    public void ToggleComplete() { ... }
    public void Reschedule(DateTime newDate) { ... }
    public void CarryOver(DateTime today) { ... }
}
```

### 4.3 Functional Requirements

#### Day View (default)
- Shows tasks for a single day (defaults to today)
- Navigate days with ← → buttons
- Add task: click "+ Add task" → inline input → Enter to save
- Toggle completion: click checkbox
- Reorder: drag & drop within the day
- Incomplete tasks from yesterday: auto-carry-over with visual indicator "[From yesterday]"

#### Week View
- Shows 7 columns (Mon–Sun of current week)
- Each column lists tasks for that day
- Drag & drop tasks between days → calls `PATCH /api/v1/todos/{id}` with new date
- Navigate weeks with ← → buttons

#### Carry-Over Logic (Background Job or on-login)
```
When user opens the app for a new day:
  1. Find all incomplete tasks where Date < today
  2. Set IsCarriedOver = true, OriginalDate = Date, Date = today
  3. Save changes
```

### 4.4 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/todos?date=2026-06-09` | Tasks for a specific date |
| GET | `/api/v1/todos?startDate=...&endDate=...` | Tasks in a date range (for week view) |
| POST | `/api/v1/todos` | Create a task |
| PATCH | `/api/v1/todos/{id}` | Update task (title, date, note, isCompleted, sortOrder) |
| DELETE | `/api/v1/todos/{id}` | Delete a task |

### 4.5 Acceptance Criteria

- [ ] Day view: shows today's tasks by default; navigate with ← →
- [ ] Add task inline: type title → Enter → task appears in list
- [ ] Checkbox toggle: instant, no page reload
- [ ] Drag & drop reorder within the same day
- [ ] Week view: 7 columns; drag tasks between days
- [ ] Carry-over: incomplete tasks from yesterday appear today with "[Carried over]" tag
- [ ] SignalR: `TodoItemChecked` broadcast updates all tabs

---

## 5. Feature 6 — Countdown

### 5.1 Overview

Event countdown timers. Users create countdowns for important dates (exams, deadlines) and see real-time "X days Y hours Z minutes" remaining.

**User Stories:** US-029, US-030  
**Story Points:** 4 SP | **Ref:** FR-070, UC-08.1

### 5.2 Domain Entity

```csharp
public class CountdownEvent : BaseEntity, IAggregateRoot
{
    public Guid UserId { get; private set; }
    public string Name { get; private set; }
    public DateTime TargetDate { get; private set; }
    public string? Color { get; private set; }     // hex color, e.g. "#4F46E5"
    public string? Icon { get; private set; }      // emoji, e.g. "🎓"
    public bool IsCompleted => DateTime.UtcNow >= TargetDate;
}
```

### 5.3 Functional Requirements

- **Create:** Name (required), target date+time (required), color (optional), icon/emoji (optional)
- **Display:** Card layout showing event name, color stripe, and live countdown
- **Live countdown:** Client-side `setInterval(1000)` updates every second. No server polling.
- **Completed state:** When `TargetDate <= now`, show "Completed ✅" badge + "Event [name] has arrived!"
- **Edit/Delete:** Edit reopens form; delete requires confirmation dialog
- **Sort:** Countdowns sorted by nearest target date first

### 5.4 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/countdowns` | List all countdowns for user |
| POST | `/api/v1/countdowns` | Create a countdown |
| PATCH | `/api/v1/countdowns/{id}` | Update countdown |
| DELETE | `/api/v1/countdowns/{id}` | Delete countdown |

### 5.5 Acceptance Criteria

- [ ] Create countdown with name, target date/time, optional color and icon
- [ ] Display "X days Y hours Z minutes" — updates every second (client-side)
- [ ] Completed countdowns show "✅ Completed" badge
- [ ] Edit and delete with confirmation dialog
- [ ] Countdowns appear on Dashboard Overview (top 3 nearest)

---

## 6. Feature 7 — Habit Tracker

### 6.1 Overview

Track daily habits with a GitHub-style contribution grid. Users create habits, mark them complete each day, and track streaks over time.

**User Stories:** US-034, US-035, US-036  
**Story Points:** 10 SP | **Ref:** FR-090, UC-10.1, UC-10.2

### 6.2 Domain Entities

```csharp
public class Habit : BaseEntity, IAggregateRoot
{
    public Guid UserId { get; private set; }
    public string Name { get; private set; }
    public string? Description { get; private set; }
    public string? Color { get; private set; }         // "#22C55E"
    public string? Icon { get; private set; }          // "🏋️"
    public HabitFrequency Frequency { get; private set; }
    public DayOfWeek[]? CustomDays { get; private set; }  // only if Frequency == Custom
    private readonly List<HabitEntry> _entries = new();
    public IReadOnlyList<HabitEntry> Entries => _entries.AsReadOnly();

    public int GetCurrentStreak(DateTime today) { ... }
    public int GetLongestStreak() { ... }
    public float GetCompletionRate(DateTime monthStart, DateTime monthEnd) { ... }
}

public class HabitEntry : BaseEntity
{
    public Guid HabitId { get; private set; }
    public DateTime Date { get; private set; }    // date only, no time
    public bool IsCompleted { get; private set; }
}

public enum HabitFrequency { Daily, Custom }
```

### 6.3 Functional Requirements

#### Habit Grid (main view)
- Rows = habits, Columns = days in the current month
- Each cell is clickable: toggle ✅/☐ for that day
- Current streak displayed next to each habit name (🔥 3)
- Monthly completion percentage displayed per habit

#### Statistics
- Current streak (consecutive days including today)
- Longest streak (all-time)
- Completion rate: % of expected days completed in the last 7/30 days

#### Reminder (Hangfire Job)
- At 20:00 daily → check which habits are unchecked for today
- Send in-app notification (or email if user configured)
- User can disable reminders per habit

### 6.4 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/habits` | List all habits with current streak |
| POST | `/api/v1/habits` | Create a habit |
| PATCH | `/api/v1/habits/{id}` | Update habit (name, description, frequency, etc.) |
| DELETE | `/api/v1/habits/{id}` | Delete a habit |
| GET | `/api/v1/habits/{id}/entries?month=2026-06` | Get entries for a month |
| POST | `/api/v1/habits/{id}/entries` | Toggle entry for a specific date |
| GET | `/api/v1/habits/{id}/stats` | Get streak + completion rate stats |

### 6.5 Acceptance Criteria

- [ ] Create habit: name, description, color, icon, frequency (daily or custom days)
- [ ] Grid displays: habit rows × day columns for the month
- [ ] Click cell → toggle ✅/☐ for that day (no confirmation needed)
- [ ] Current streak (🔥) shown next to each habit name
- [ ] Monthly completion % shown per habit
- [ ] Stats page: current streak, longest streak, weekly/monthly completion rate
- [ ] 20:00 daily reminder for unchecked habits (disableable per habit)
- [ ] Habit status visible on Dashboard Overview widget

---

## 7. Feature 8 — Kanban Board

### 7.1 Overview

Personal project management using Kanban methodology. Users create boards with customizable columns and drag cards between them.

**User Stories:** US-031, US-032, US-033  
**Story Points:** 10 SP | **Ref:** FR-080, UC-09.1 → UC-09.3

### 7.2 Domain Entities

```csharp
public class KanbanBoard : BaseEntity, IAggregateRoot
{
    public Guid UserId { get; private set; }
    public string Name { get; private set; }
    private readonly List<KanbanColumn> _columns = new();
    public IReadOnlyList<KanbanColumn> Columns => _columns.AsReadOnly();

    public static KanbanBoard Create(Guid userId, string name)
    {
        var board = new KanbanBoard { UserId = userId, Name = name };
        board._columns.Add(new KanbanColumn("To Do", 0));
        board._columns.Add(new KanbanColumn("In Progress", 1));
        board._columns.Add(new KanbanColumn("Done", 2));
        return board;
    }
}

public class KanbanColumn : BaseEntity
{
    public Guid BoardId { get; private set; }
    public string Name { get; private set; }
    public int SortOrder { get; private set; }
    private readonly List<KanbanCard> _cards = new();
    public IReadOnlyList<KanbanCard> Cards => _cards.AsReadOnly();
}

public class KanbanCard : BaseEntity
{
    public Guid ColumnId { get; private set; }
    public string Title { get; private set; }
    public string? Description { get; private set; }    // rich text (HTML/Markdown)
    public CardPriority Priority { get; private set; }  // Critical, High, Medium, Low
    public DateTime? Deadline { get; private set; }
    public int SortOrder { get; private set; }
    private readonly List<string> _tags = new();        // ["Study", "Project"]
    public IReadOnlyList<string> Tags => _tags.AsReadOnly();

    public void MoveToColumn(Guid newColumnId, int newSortOrder) { ... }
}

public enum CardPriority { Low = 0, Medium = 1, High = 2, Critical = 3 }
```

### 7.3 Functional Requirements

#### Board Management
- Create board → auto-creates 3 default columns: To Do, In Progress, Done
- Add/rename/delete columns (delete only if column is empty)
- Multiple boards allowed

#### Card Management
- Add card to any column: title (required), description, tags, priority, deadline
- Click card → modal detail view with full editing (rich text description)
- Drag & drop cards between columns and within a column for reordering
- Priority displayed as colored badge: 🔴 Critical, 🟠 High, 🟡 Medium, 🟢 Low

#### Search & Filter
- Search by card title (instant filter)
- Filter by: tag, priority, deadline (has deadline / overdue / this week)
- Filters are **client-side** (all cards loaded in one request per board)

### 7.4 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/kanban/boards` | List all boards |
| POST | `/api/v1/kanban/boards` | Create a board (with default columns) |
| DELETE | `/api/v1/kanban/boards/{boardId}` | Delete a board |
| GET | `/api/v1/kanban/boards/{boardId}` | Get board with all columns and cards |
| POST | `/api/v1/kanban/boards/{boardId}/columns` | Add a column |
| PATCH | `/api/v1/kanban/boards/{boardId}/columns/{colId}` | Rename column |
| DELETE | `/api/v1/kanban/boards/{boardId}/columns/{colId}` | Delete empty column |
| POST | `/api/v1/kanban/boards/{boardId}/cards` | Create a card |
| PATCH | `/api/v1/kanban/cards/{cardId}` | Update card (title, desc, tags, etc.) |
| PATCH | `/api/v1/kanban/cards/{cardId}/move` | Move card to another column/position |
| DELETE | `/api/v1/kanban/cards/{cardId}` | Delete a card |

### 7.5 Acceptance Criteria

- [ ] Create board → 3 default columns appear
- [ ] Add/rename/delete columns (delete blocked if column has cards)
- [ ] Add card with title; optionally add description, tags, priority, deadline
- [ ] Drag & drop card between columns updates card's column and sort order
- [ ] Click card → modal shows full detail view with editable fields
- [ ] Priority badges with colors; deadline shows "Overdue" if past
- [ ] Search bar filters cards by title (client-side)
- [ ] Filter by tag, priority, deadline range
- [ ] SignalR: `KanbanCardMoved` broadcast syncs across tabs

---

## 8. Feature 9 — Pomodoro & Stopwatch

### 8.1 Overview

A Pomodoro timer to help users focus in work-rest cycles, plus a simple stopwatch for free-form time tracking. Timer state syncs across tabs via SignalR.

**User Stories:** US-037, US-038, US-039, US-040  
**Story Points:** 10 SP | **Ref:** FR-100, FR-101, UC-11.1 → UC-11.3

### 8.2 Domain Entities

```csharp
public class PomodoroConfig : BaseEntity
{
    public Guid UserId { get; private set; }
    public int WorkMinutes { get; private set; }         // default 25
    public int ShortBreakMinutes { get; private set; }   // default 5
    public int LongBreakMinutes { get; private set; }    // default 15
    public int LongBreakAfter { get; private set; }      // default 4 pomodoros
}

public class PomodoroSession : BaseEntity
{
    public Guid UserId { get; private set; }
    public Guid? LinkedTaskId { get; private set; }      // FK to TodoItem or KanbanCard
    public string? LinkedTaskSource { get; private set; } // "todo" | "kanban"
    public PomodoroPhase Phase { get; private set; }     // Work, ShortBreak, LongBreak
    public PomodoroState State { get; private set; }     // Running, Paused, Completed
    public DateTime StartedAt { get; private set; }
    public DateTime? CompletedAt { get; private set; }
    public int DurationSeconds { get; private set; }
}

public enum PomodoroPhase { Work, ShortBreak, LongBreak }
public enum PomodoroState { Running, Paused, Completed }
```

### 8.3 Functional Requirements

#### Pomodoro Timer
- Default cycle: 25 min work → 5 min short break → repeat → after 4 pomodoros → 15 min long break
- Controls: Start / Pause / Reset
- Sound notification when phase ends (browser notification API)
- Auto-transition between work ↔ break phases
- Daily counter: "🍅 × 4 today"
- **Link task:** Before starting, user can optionally link a task from Todo or Kanban
- **Cross-tab sync:** Timer state stored in Redis; SignalR broadcasts `PomodoroSync` to all user's tabs
- Configuration: all durations customizable (1–60 min)

#### Stopwatch
- Simple count-up timer
- Controls: Start / Pause / Reset / Lap
- Lap creates a timestamped entry in a list below the timer
- No server persistence needed (client-side only; laps are transient)

### 8.4 Timer Sync Strategy

```
[Tab A starts Pomodoro]
  → POST /api/v1/pomodoro/start
  → Server saves state to Redis: { userId, phase: "work", startedAt, duration: 1500 }
  → SignalR broadcast: PomodoroSync { state: "running", phase: "work", remaining: 1500 }

[Tab B opens]
  → On connect, GET /api/v1/pomodoro/current
  → Receives current timer state → renders synced timer

[Timer completes]
  → POST /api/v1/pomodoro/complete
  → Server saves PomodoroSession to DB
  → Increment daily count
  → Broadcast: PomodoroSync { state: "break", phase: "shortBreak", remaining: 300 }
```

### 8.5 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/pomodoro/config` | Get user's Pomodoro configuration |
| PATCH | `/api/v1/pomodoro/config` | Update configuration |
| GET | `/api/v1/pomodoro/current` | Get current active timer state (from Redis) |
| POST | `/api/v1/pomodoro/start` | Start a Pomodoro (optionally link a task) |
| POST | `/api/v1/pomodoro/pause` | Pause the timer |
| POST | `/api/v1/pomodoro/resume` | Resume the timer |
| POST | `/api/v1/pomodoro/reset` | Reset the timer |
| POST | `/api/v1/pomodoro/complete` | Mark current phase as completed |
| GET | `/api/v1/pomodoro/today` | Get today's completed pomodoro count |

### 8.6 Acceptance Criteria

- [ ] Default 25/5/15 cycle works correctly; auto-transitions between phases
- [ ] Start/Pause/Reset buttons function correctly
- [ ] Sound plays when a phase ends (browser Notification API)
- [ ] Daily pomodoro count displays correctly ("🍅 × N")
- [ ] Link task from Todo or Kanban (search/dropdown)
- [ ] Timer syncs across all tabs via SignalR (open Tab B → sees running timer from Tab A)
- [ ] Configuration saved per user; applies from next session
- [ ] Stopwatch: count up, Lap records timestamps, Pause/Reset

---

## 9. Feature 10 — Journal Pages

### 9.1 Overview

Rich text journal/note-taking for language learning. Users create journal entries with a Tiptap-powered editor, search through them, and optionally tag entries by learning date.

**User Stories:** US-023, US-024, US-025  
**Story Points:** 10 SP | **Ref:** FR-050, FR-051, UC-06.1, UC-06.2

### 9.2 Domain Entity

```csharp
public class JournalEntry : BaseEntity, IAggregateRoot
{
    public Guid UserId { get; private set; }
    public string Title { get; private set; }
    public string Content { get; private set; }          // HTML from Tiptap editor
    public string? PlainTextContent { get; private set; } // stripped text for full-text search
    public DateTime? LearningDate { get; private set; }   // optional: tag by learning day
}
```

### 9.3 Functional Requirements

#### Rich Text Editor (Tiptap 2)
Supported formatting:
- Headings: H1, H2, H3
- Bold, Italic, Underline, Strikethrough
- Bullet list, Numbered list
- Blockquote
- Code block (with syntax highlighting)
- Inline text highlight (colored background)
- Hyperlinks
- Horizontal rule

#### Auto-Save
- Content auto-saved 2 seconds after user stops typing (debounce)
- Visual indicator: "Saved ✓" / "Saving..."

#### Journal List
- List all entries sorted by creation date (newest first)
- Each entry shows: title, creation date, first ~100 characters preview

#### Full-Text Search
- Search bar at the top of the journal list
- Searches through `PlainTextContent` (PostgreSQL `tsvector` or `ILIKE`)
- Results show matching entries with keyword highlighted in preview

#### Learning Date (Optional)
- Each entry can optionally be tagged with a "Learning Date"
- Calendar view shows which dates have journal entries (dot indicator)
- Click a date → opens/creates the journal entry for that day

### 9.4 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/journals` | List all entries (paginated) |
| GET | `/api/v1/journals/search?q=keyword` | Full-text search |
| GET | `/api/v1/journals/{id}` | Get entry content |
| POST | `/api/v1/journals` | Create a new entry |
| PATCH | `/api/v1/journals/{id}` | Update entry (title, content, learningDate) |
| DELETE | `/api/v1/journals/{id}` | Delete entry |
| GET | `/api/v1/journals/calendar?month=2026-06` | Get dates that have journal entries |

### 9.5 Acceptance Criteria

- [ ] Create new entry: title + rich text editor with all formatting options
- [ ] Auto-save with 2-second debounce; "Saved ✓" indicator
- [ ] Journal list: shows title, date, preview; sorted newest first
- [ ] Full-text search: results with keyword highlighting
- [ ] Optional "Learning Date" tag per entry
- [ ] Calendar view with dot indicators for days that have entries
- [ ] Unicode support (write in any language)
- [ ] Tiptap editor loads without lag (<500ms)

---

## 10. Data Models — Post-MVP Entities

### 10.1 Entity Relationship Diagram (Post-MVP additions)

```
┌──────────┐
│   User   │
│ (from MVP)│
└─────┬────┘
      │ 1:N for all below
      │
      ├──► TodoItem
      │      { title, date, isCompleted, sortOrder, isCarriedOver }
      │
      ├──► CountdownEvent
      │      { name, targetDate, color, icon }
      │
      ├──► Habit ──1:N──► HabitEntry
      │      { name, frequency }     { date, isCompleted }
      │
      ├──► KanbanBoard ──1:N──► KanbanColumn ──1:N──► KanbanCard
      │      { name }                { name, order }       { title, desc, priority, deadline, tags }
      │
      ├──► PomodoroSession
      │      { phase, state, startedAt, linkedTaskId }
      │
      ├──► PomodoroConfig
      │      { workMin, shortBreakMin, longBreakMin }
      │
      └──► JournalEntry
             { title, content, plainTextContent, learningDate }
```

### 10.2 Database Index Recommendations

| Table | Index | Purpose |
|-------|-------|---------|
| `todo_items` | `(user_id, date)` | Day/week view queries |
| `todo_items` | `(user_id, is_completed, date)` | Carry-over query |
| `countdown_events` | `(user_id, target_date)` | Sort by nearest |
| `habit_entries` | `(habit_id, date)` UNIQUE | One entry per habit per day |
| `habits` | `(user_id)` | List all user habits |
| `kanban_cards` | `(column_id, sort_order)` | Card ordering |
| `journal_entries` | `(user_id, created_at DESC)` | List view |
| `journal_entries` | GIN on `plain_text_content` tsvector | Full-text search |
| `pomodoro_sessions` | `(user_id, started_at DESC)` | Today's count |

---

## 11. API Contract — All New Endpoints

### 11.1 Dashboard

```
GET /api/v1/dashboard/overview → aggregated response (see Section 3.6)
```

### 11.2 Todo

```
GET    /api/v1/todos?date=YYYY-MM-DD
GET    /api/v1/todos?startDate=...&endDate=...
POST   /api/v1/todos           { title, date, note? }
PATCH  /api/v1/todos/{id}      { title?, date?, note?, isCompleted?, sortOrder? }
DELETE /api/v1/todos/{id}
```

### 11.3 Countdown

```
GET    /api/v1/countdowns
POST   /api/v1/countdowns      { name, targetDate, color?, icon? }
PATCH  /api/v1/countdowns/{id} { name?, targetDate?, color?, icon? }
DELETE /api/v1/countdowns/{id}
```

### 11.4 Habit

```
GET    /api/v1/habits
POST   /api/v1/habits           { name, description?, color?, icon?, frequency, customDays? }
PATCH  /api/v1/habits/{id}      { name?, description?, color?, icon?, frequency?, customDays? }
DELETE /api/v1/habits/{id}
GET    /api/v1/habits/{id}/entries?month=YYYY-MM
POST   /api/v1/habits/{id}/entries  { date }   → toggles entry
GET    /api/v1/habits/{id}/stats
```

### 11.5 Kanban

```
GET    /api/v1/kanban/boards
POST   /api/v1/kanban/boards    { name }
DELETE /api/v1/kanban/boards/{boardId}
GET    /api/v1/kanban/boards/{boardId}
POST   /api/v1/kanban/boards/{boardId}/columns     { name }
PATCH  /api/v1/kanban/boards/{boardId}/columns/{id} { name?, sortOrder? }
DELETE /api/v1/kanban/boards/{boardId}/columns/{id}
POST   /api/v1/kanban/boards/{boardId}/cards  { columnId, title, description?, priority?, deadline?, tags? }
PATCH  /api/v1/kanban/cards/{id}              { title?, description?, priority?, deadline?, tags? }
PATCH  /api/v1/kanban/cards/{id}/move         { columnId, sortOrder }
DELETE /api/v1/kanban/cards/{id}
```

### 11.6 Pomodoro

```
GET    /api/v1/pomodoro/config
PATCH  /api/v1/pomodoro/config  { workMinutes?, shortBreakMinutes?, longBreakMinutes? }
GET    /api/v1/pomodoro/current
POST   /api/v1/pomodoro/start   { linkedTaskId?, linkedTaskSource? }
POST   /api/v1/pomodoro/pause
POST   /api/v1/pomodoro/resume
POST   /api/v1/pomodoro/reset
POST   /api/v1/pomodoro/complete
GET    /api/v1/pomodoro/today
```

### 11.7 Journal

```
GET    /api/v1/journals?page=1&limit=20
GET    /api/v1/journals/search?q=keyword
GET    /api/v1/journals/{id}
POST   /api/v1/journals          { title, content, learningDate? }
PATCH  /api/v1/journals/{id}     { title?, content?, learningDate? }
DELETE /api/v1/journals/{id}
GET    /api/v1/journals/calendar?month=YYYY-MM
```

---

## 12. SignalR Events — Post-MVP

| Event Name | Trigger | Payload | Consumers |
|-----------|---------|---------|-----------|
| `TodoItemChecked` | Task toggled | `{ todoId, isCompleted }` | Dashboard, Todo page |
| `HabitChecked` | Habit day toggled | `{ habitId, date, isChecked }` | Dashboard, Habit page |
| `KanbanCardMoved` | Card dragged | `{ cardId, fromCol, toCol }` | Kanban board |
| `PomodoroSync` | Timer state change | `{ state, phase, remaining }` | Pomodoro (all tabs) |
| `DashboardRefresh` | Any dashboard data change | `{}` | Dashboard |

Frontend handler pattern:
```typescript
connection.on("TodoItemChecked", ({ todoId }) => {
  queryClient.invalidateQueries({ queryKey: ["todos"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
});

connection.on("PomodoroSync", (data) => {
  usePomodoroStore.getState().syncFromServer(data);
});
```

---

## 13. Background Jobs — Post-MVP

| Job | Schedule | Description | Hangfire |
|-----|----------|-------------|---------|
| `TodoCarryOverJob` | 00:05 daily | Move incomplete tasks from yesterday → today | Recurring |
| `HabitReminderJob` | 20:00 daily | Check unchecked habits → send notification | Recurring |
| `CountdownAlertJob` | Every 5 min | Check countdowns that just expired → mark complete | Recurring |
| `DatabaseCleanupJob` | 02:00 Sunday | Hard-delete soft-deleted records older than 30 days | Recurring |

---

## 14. Implementation Order & Sprint Plan

### Recommended Sprint Plan (2-week sprints, ~20 SP capacity)

| Sprint | Features | SP | Key Deliverables |
|:---:|---------|:---:|---------|
| **S1** | Todo List + Countdown | 13 | Task CRUD, Day/Week view, carry-over, countdown CRUD |
| **S2** | Habit Tracker + Journal | 20 | Habit grid, streaks, Tiptap editor, full-text search |
| **S3** | Dashboard Overview | 14 | Aggregation API, 5 widgets, quick actions, SignalR sync |
| **S4** | Kanban Board + Pomodoro | 20 | Drag & drop board, timer sync, task linking |

**Total estimated:** 67 SP across 4 sprints ≈ **8 weeks**

### Combined with MVP

| Phase | Sprints | SP | Features |
|-------|:---:|:---:|---------|
| MVP (SPEC.md) | ~3 sprints | 64 SP | Auth, Vocabulary, Flash Card |
| Post-MVP (this spec) | ~4 sprints | 67 SP | 7 features (excl. Dictation/Shadowing) |
| **Full Project** | **~7 sprints** | **131 SP** | **Complete FluentA (Phase 1)** |

**Total project timeline: ~14 weeks (3.5 months)**

---

## 15. Definition of Done

Same criteria as SPEC.md, plus:

### Feature-Specific
- [ ] All Acceptance Criteria from the feature's section are met
- [ ] Feature appears in sidebar navigation under the correct group
- [ ] Feature works independently (no broken dependencies)
- [ ] Dashboard widget (if applicable) shows correct aggregated data

### Integration
- [ ] Dashboard Overview correctly aggregates data from the new feature
- [ ] SignalR events broadcast and received correctly across tabs
- [ ] Background jobs (if any) execute on schedule without errors
- [ ] No regression in MVP features (Auth, Vocabulary, Flash Card)

### Performance
- [ ] CRUD operations respond < 300ms (p95)
- [ ] Drag & drop operations (Todo, Kanban) feel instant (< 100ms client-side)
- [ ] Journal editor loads < 500ms; auto-save completes within 2s of user stopping
- [ ] Pomodoro timer accuracy: ±1 second drift max over 25 minutes
