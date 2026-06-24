# FluentA — MVP Feature Specification

**Version:** 1.0  
**Date:** 08/06/2026  
**Status:** Ready for Implementation  
**References:** SRSFluentA.md v1.1 · UseCaseFluentA.md v1.0 · UseStoryFluentA.md v1.0 · ArchitechtureFluentA.md v1.2

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [MVP Scope](#2-mvp-scope)
3. [System Architecture](#3-system-architecture)
4. [MVP Feature 1 — Authentication & Account](#4-mvp-feature-1--authentication--account)
5. [MVP Feature 2 — Vocabulary Board](#5-mvp-feature-2--vocabulary-board)
6. [MVP Feature 3 — Flash Card & Spaced Repetition](#6-mvp-feature-3--flash-card--spaced-repetition)
7. [Cross-Cutting Concerns](#7-cross-cutting-concerns)
8. [Data Models](#8-data-models)
9. [API Contract](#9-api-contract)
10. [Development Setup](#10-development-setup)
11. [Definition of Done](#11-definition-of-done)
12. [Next Feature Plan — Email Verification OTP & Password Recovery](#12-next-feature-plan--email-verification-otp--password-recovery)

---

## 1. Project Overview

### 1.1 What is FluentA?

FluentA is a **personal language learning web application** that combines structured vocabulary management with proven memory techniques (Active Recall + Spaced Repetition). It integrates a language learning suite with personal productivity tools (Todo, Habit Tracker, Kanban, Pomodoro) in a single unified workspace.

**Target users:** Self-directed language learners (e.g., IELTS candidates, HSK learners, general English/Chinese learners).

### 1.2 Core Learning Loop

The fundamental value of FluentA is the frictionless learning loop:

```
[User adds vocabulary]
        │
        ▼ (automatic, one-way sync)
[Flash Cards are auto-created]
        │
        ▼
[User reviews with Active Recall (Page Deck)]
        │
        ▼
[System schedules future reviews via SM-2 (All Words Deck)]
        │
        ▼
[User's long-term retention improves over time]
```

This loop is the product's **core differentiator**: no manual card creation, no separate import step — the user just maintains their vocabulary list and the system handles the rest.

### 1.3 MVP Rationale

The three MVP features selected below form the **complete, end-to-end core loop**. They can be shipped as a functional, usable product without any other features:

| # | Feature | Why MVP |
|---|---------|---------|
| 1 | Authentication | Gate for all other features; must exist first |
| 2 | Vocabulary Board | Source of truth for all language data |
| 3 | Flash Card + SR | Core review engine; the main daily value |

---

## 2. MVP Scope

### 2.1 In Scope (MVP)

| Feature | User Stories | Story Points |
|---------|:---:|:---:|
| Authentication & Account | US-001, US-002, US-003, US-004 | 15 SP |
| Vocabulary Board | US-005 through US-011 | 17 SP |
| Flash Card & Spaced Repetition | US-012 through US-019 | 32 SP |
| **Total** | **19 User Stories** | **64 SP** |

### 2.2 Out of Scope (Post-MVP)

The following features are **explicitly excluded** from MVP:

- Dictation, Shadowing, Journal Pages
- Todo List, Countdown, Kanban, Habit Tracker, Pomodoro
- Dashboard Overview (simplified version may be added as stretch goal)
- AI pronunciation scoring
- Mobile native app
- Community / social features

### 2.3 MVP Success Metrics

| Metric | Target |
|--------|--------|
| User can add a vocabulary word and see it as a Flash Card | < 5 seconds end-to-end |
| Spaced Repetition review session completes without errors | 100% of reviews processed |
| Flash Card sync latency after vocab change | < 3 seconds |
| API response time (p95) | < 300ms |
| Page load time (First Contentful Paint) | < 2 seconds on 4G |

---

## 3. System Architecture

### 3.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Browser                                                  │
│                                                          │
│  Vite + React 18 SPA (TypeScript)                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │  Auth    │ │ Vocab    │ │FlashCard │ │  Zustand   │  │
│  │  Pages   │ │ Board    │ │ Review   │ │   Store    │  │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘  │
│         │ TanStack Query (cache + background refetch)    │
└─────────┼────────────────────────────────────────────────┘
          │ REST /api/v1/  +  WebSocket /hubs/sync
          ▼
┌──────────────────────────────────────────────────────────┐
│  .NET 10 Web API — Clean Architecture + DDD              │
│                                                          │
│  ┌─── Presentation ─────────────────────────────────┐   │
│  │  AuthController · VocabController · FlashController│  │
│  │  SignalR SyncHub                                   │  │
│  └──────────────────────────────────────────────────┘   │
│  ┌─── Application ──────────────────────────────────┐   │
│  │  AuthService · VocabularyService · FlashcardService│  │
│  │  SpacedRepetitionService · DeckSyncService         │  │
│  │  WordAddedEventHandler (Domain Event)              │  │
│  └──────────────────────────────────────────────────┘   │
│  ┌─── Domain ───────────────────────────────────────┐   │
│  │  User · VocabBoard · VocabWord · FlashcardDeck    │  │
│  │  FlashcardCard · CardReview (Aggregates)          │  │
│  │  WordAddedEvent · WordUpdatedEvent · WordDeletedEvent│ │
│  │  IUnitOfWork · IGenericRepository<T>              │  │
│  └──────────────────────────────────────────────────┘   │
│  ┌─── Infrastructure ───────────────────────────────┐   │
│  │  AppDbContext (EF Core 10)                        │  │
│  │  UnitOfWork (dispatches Domain Events)            │  │
│  │  GenericRepository<T>                             │  │
│  │  Redis Cache · SignalR Backplane                  │  │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
          │               │
          ▼               ▼
   PostgreSQL 16      Redis 7
   (AWS RDS)       (AWS ElastiCache)
```

### 3.2 Tech Stack Summary

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Frontend | Vite + React | React 18 / Vite 6 | SPA, CSR only |
| UI | TailwindCSS | v4 | Utility-first |
| Routing | React Router | v6 | BrowserRouter |
| State | Zustand | v4 | Auth store, vocab store |
| Data Fetching | TanStack Query | v5 | Server state management |
| Backend | ASP.NET Core | .NET 10 | Traditional Controllers |
| Architecture | Clean Architecture + DDD | — | Bounded Contexts |
| Data Access | EF Core + Generic Repo + UoW | EF 10 | PostgreSQL provider |
| Realtime | SignalR | .NET 10 built-in | Redis backplane |
| Auth | JWT RS256 + Google OAuth 2.0 | — | HttpOnly cookie for refresh |
| Database | PostgreSQL | 16 | AWS RDS |
| Cache | Redis | 7 | AWS ElastiCache |
| Hosting | AWS (EC2 + S3 + CloudFront) | — | See Arch doc |

### 3.3 Solution Structure

```
FluentA.sln
├── src/
│   ├── FluentA.API/                      # Presentation Layer
│   │   ├── Program.cs
│   │   ├── appsettings.json
│   │   ├── Controllers/
│   │   │   ├── AuthController.cs
│   │   │   ├── VocabularyController.cs
│   │   │   └── FlashcardController.cs
│   │   ├── Hubs/
│   │   │   └── SyncHub.cs
│   │   └── Extensions/
│   │       └── ServiceCollectionExtensions.cs
│   │
│   ├── FluentA.Application/              # Application Layer
│   │   ├── BoundedContexts/
│   │   │   ├── Auth/
│   │   │   │   ├── IAuthService.cs
│   │   │   │   ├── AuthService.cs
│   │   │   │   └── DTOs/
│   │   │   │       ├── LoginRequest.cs
│   │   │   │       ├── RegisterRequest.cs
│   │   │   │       └── AuthResponse.cs
│   │   │   ├── Vocabulary/
│   │   │   │   ├── IVocabularyService.cs
│   │   │   │   ├── VocabularyService.cs
│   │   │   │   └── DTOs/
│   │   │   │       ├── BoardDto.cs
│   │   │   │       ├── PageDto.cs
│   │   │   │       └── WordDto.cs
│   │   │   └── Flashcard/
│   │   │       ├── IFlashcardService.cs
│   │   │       ├── FlashcardService.cs
│   │   │       ├── ISpacedRepetitionService.cs
│   │   │       ├── SpacedRepetitionService.cs
│   │   │       ├── DeckSyncService.cs
│   │   │       ├── EventHandlers/
│   │   │       │   ├── WordAddedEventHandler.cs
│   │   │       │   ├── WordUpdatedEventHandler.cs
│   │   │       │   └── WordDeletedEventHandler.cs
│   │   │       └── DTOs/
│   │   │           ├── DeckDto.cs
│   │   │           ├── CardDto.cs
│   │   │           └── ReviewRequest.cs
│   │   └── Common/
│   │       └── Interfaces/
│   │           └── IJwtService.cs
│   │
│   ├── FluentA.Domain/                   # Domain Layer
│   │   ├── SeedWork/
│   │   │   ├── BaseEntity.cs             # Id, CreatedAt, UpdatedAt, DeletedAt
│   │   │   ├── IAggregateRoot.cs
│   │   │   ├── IDomainEvent.cs
│   │   │   └── IDomainEventHandler.cs
│   │   ├── Interfaces/
│   │   │   ├── IUnitOfWork.cs
│   │   │   └── IGenericRepository.cs
│   │   └── BoundedContexts/
│   │       ├── Auth/
│   │       │   └── Entities/
│   │       │       └── User.cs
│   │       ├── Vocabulary/
│   │       │   ├── Entities/
│   │       │   │   ├── VocabBoard.cs
│   │       │   │   ├── VocabPage.cs
│   │       │   │   └── VocabWord.cs
│   │       │   ├── Events/
│   │       │   │   ├── WordAddedEvent.cs
│   │       │   │   ├── WordUpdatedEvent.cs
│   │       │   │   └── WordDeletedEvent.cs
│   │       │   └── IVocabularyRepository.cs
│   │       └── Flashcard/
│   │           ├── Entities/
│   │           │   ├── FlashcardDeck.cs
│   │           │   ├── FlashcardCard.cs
│   │           │   └── CardReview.cs
│   │           └── IFlashcardRepository.cs
│   │
│   ├── FluentA.Infrastructure/           # Infrastructure Layer
│   │   ├── Persistence/
│   │   │   ├── AppDbContext.cs
│   │   │   ├── UnitOfWork.cs
│   │   │   ├── Repositories/
│   │   │   │   └── GenericRepository.cs
│   │   │   └── Configurations/           # EF Fluent API
│   │   │       ├── UserConfiguration.cs
│   │   │       ├── VocabBoardConfiguration.cs
│   │   │       └── FlashcardDeckConfiguration.cs
│   │   ├── EventDispatcher/
│   │   │   └── DomainEventDispatcher.cs
│   │   └── Cache/
│   │       └── RedisService.cs
│   │
│   └── FluentA.Jobs/                     # Background Jobs (Hangfire)
│       └── SpacedRepetitionJob.cs
│
└── tests/
    ├── FluentA.Domain.UnitTests/
    └── FluentA.Application.UnitTests/
```

### 3.4 Frontend Structure

```
frontend/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
└── src/
    ├── main.tsx
    ├── App.tsx                        # Router setup + Auth guard
    ├── routes/
    │   ├── auth/
    │   │   ├── LoginPage.tsx
    │   │   └── RegisterPage.tsx
    │   ├── vocabulary/
    │   │   ├── VocabularyPage.tsx     # Board + page selector
    │   │   └── VocabTable.tsx         # Inline-edit table
    │   └── flashcard/
    │       ├── FlashcardPage.tsx      # Deck list
    │       ├── ReviewSession.tsx      # Card flip + rating
    │       └── FlashcardDashboard.tsx # Stats overview
    ├── components/
    │   ├── ui/                        # Button, Input, Modal, Badge, Toast
    │   ├── vocabulary/
    │   │   ├── BoardSidebar.tsx
    │   │   ├── WordRow.tsx
    │   │   └── ColumnSettings.tsx
    │   └── flashcard/
    │       ├── CardFlip.tsx
    │       ├── RatingButtons.tsx
    │       └── SessionSummary.tsx
    ├── lib/
    │   ├── api/
    │   │   ├── client.ts              # Axios instance with interceptors
    │   │   ├── auth.api.ts
    │   │   ├── vocabulary.api.ts
    │   │   └── flashcard.api.ts
    │   ├── auth/
    │   │   ├── AuthContext.tsx
    │   │   └── ProtectedRoute.tsx
    │   └── signalr/
    │       └── connection.ts
    └── stores/
        ├── authStore.ts               # JWT access token, user profile
        └── vocabStore.ts              # Selected board/page
```

---

## 4. MVP Feature 1 — Authentication & Account

### 4.1 Overview

Authentication gates access to all FluentA features. The MVP supports two methods: **Email/Password** and **Google OAuth 2.0**. JWT tokens are used for all API calls.

**User Stories covered:** US-001, US-002, US-003, US-004  
**Story Points:** 15 SP

### 4.2 Token Strategy

| Token | Storage | TTL | Purpose |
|-------|---------|-----|---------|
| Access Token (JWT RS256) | JavaScript memory (Zustand) | 1 hour | API calls |
| Refresh Token | HttpOnly cookie (SameSite=Strict) | 7 days | Renew access token |

> **Security note:** Access token is **never** stored in localStorage or sessionStorage to prevent XSS theft. The Axios interceptor automatically refreshes the token on 401 responses.

### 4.3 Functional Requirements

#### 4.3.1 Email Registration (US-001)

**Input validation:**
- Email: valid format, unique in system
- Password: minimum 8 characters
- Full name: 2–100 characters, required

**Flow:**
1. User submits registration form
2. Backend validates → hashes password with bcrypt (cost 12) → creates User record
3. Sends verification email via AWS SES
4. Returns 201 with message "Please check your email"

**Error cases:**
- `EMAIL_ALREADY_EXISTS` → 409 Conflict
- Validation errors → 422 Unprocessable Entity with field-level messages

#### 4.3.2 Google OAuth Login (US-002)

**Flow:**
1. Frontend redirects user to Google OAuth consent screen
2. Google redirects back to `/auth/google/callback?code=...`
3. Frontend sends `code` to `POST /api/v1/auth/google`
4. Backend exchanges code → gets Google profile → upserts User → issues JWT tokens
5. Returns access token in body + refresh token in HttpOnly cookie

#### 4.3.3 Email/Password Login (US-003)

**Flow:**
1. User submits credentials
2. Backend verifies bcrypt hash → issues JWT tokens
3. Returns same structure as Google OAuth

**Error cases:**
- `INVALID_CREDENTIALS` → 401 (same message regardless of which field is wrong)
- Account not verified → 403 `EMAIL_NOT_VERIFIED`

#### 4.3.4 Token Refresh

- Frontend Axios interceptor catches 401 → calls `POST /api/v1/auth/refresh`
- Refresh token sent automatically via cookie
- If refresh token expired → clear auth state → redirect to login

#### 4.3.5 Logout

- `POST /api/v1/auth/logout` → clears refresh token from Redis + cookie
- Frontend clears Zustand auth store

### 4.4 Domain Entity: User

```csharp
public class User : BaseEntity, IAggregateRoot
{
    public string Email { get; private set; }
    public string FullName { get; private set; }
    public string? PasswordHash { get; private set; }   // null for OAuth-only users
    public string? GoogleId { get; private set; }
    public bool IsEmailVerified { get; private set; }
    public DateTime? LastLoginAt { get; private set; }

    // Domain methods
    public static User CreateWithPassword(string email, string fullName, string passwordHash) { ... }
    public static User CreateWithGoogle(string email, string fullName, string googleId) { ... }
    public void MarkEmailVerified() { ... }
    public void RecordLogin() { ... }
}
```

### 4.5 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Email registration |
| POST | `/api/v1/auth/login` | Email/password login |
| POST | `/api/v1/auth/google` | Exchange Google OAuth code |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/logout` | Revoke refresh token |
| GET | `/api/v1/auth/me` | Get current user profile |

### 4.6 Frontend Components

| Component | Route | Description |
|-----------|-------|-------------|
| `LoginPage` | `/login` | Email form + Google OAuth button |
| `RegisterPage` | `/register` | Registration form with validation |
| `AuthContext` | — | Provides `user`, `login()`, `logout()`, `isAuthenticated` |
| `ProtectedRoute` | — | Wraps all authenticated routes, redirects to `/login` |

### 4.7 Acceptance Criteria Checklist

- [ ] User can register with email/password; receives verification email
- [ ] Duplicate email returns error message (not which field caused it)
- [ ] Google OAuth creates account automatically on first login
- [ ] JWT access token stored in memory only (not localStorage)
- [ ] Refresh token stored in HttpOnly cookie
- [ ] Expired access token triggers silent refresh without user action
- [ ] Logout clears all tokens on both client and server

---

## 5. MVP Feature 2 — Vocabulary Board

### 5.1 Overview

Vocabulary Board is the **source of truth** for all language data in FluentA. Users create boards (by topic or exam), divide them into pages (by unit/chapter), and enter vocabulary inline like a spreadsheet. The board is the input side; Flash Card is the output/review side.

**User Stories covered:** US-005 through US-011  
**Story Points:** 17 SP

### 5.2 Data Hierarchy

```
User
└── VocabBoard  (e.g., "IELTS Vocabulary")
    ├── VocabPage  (e.g., "Unit 1 — Education")
    │   ├── VocabWord  { word, meaningVn, meaningEn, class, example, ... }
    │   ├── VocabWord
    │   └── ...
    ├── VocabPage  (e.g., "Unit 2 — Environment")
    └── ...
```

### 5.3 Functional Requirements

#### 5.3.1 Board Management (US-005)

- User creates a board with a **name** and a **target language** (English / Chinese / ...)
- No limit on number of boards per user
- Board is displayed in the left sidebar, grouped by user
- **On board creation:** System automatically creates an `All Words Deck` in Flash Card (via `BoardCreatedEvent` or direct service call in the transaction)

#### 5.3.2 Page Management (US-006)

- Each board can have unlimited pages
- Page name is required; display order is user-defined
- **On page creation:** System automatically creates a `Page Deck` (`[BoardName] — [PageName]`) in Flash Card

#### 5.3.3 Vocabulary Entry — Inline Edit (US-007)

The table uses **inline cell editing** (spreadsheet-like UX). No modal dialogs for adding words.

**Default columns:**

| Column | Required | Type | Notes |
|--------|:---:|------|-------|
| `word` | ✅ | text | The vocabulary item |
| `meaning_vn` | ✅ | text | Vietnamese meaning |
| `meaning_en` | ✅ | text | English definition |
| `class` | ✅ | enum | `noun`, `verb`, `adj`, `adv`, `phrase`, `other` |
| `example` | ✅ | text | Example sentence |
| `thesaurus` | ☐ | text | Synonyms / antonyms |
| `collocation` | ☐ | text | Natural word combinations |
| `note` | ☐ | text | Free-form notes |

**Keyboard navigation:**
- `Tab` → move to next cell
- `Shift+Tab` → move to previous cell
- `Enter` (at end of row) → save current row, create new row below
- `Escape` → cancel edit without saving

**On word saved:**
1. Backend saves `VocabWord` to DB
2. Backend adds `WordAddedEvent` to the entity's domain events
3. `UnitOfWork.SaveChangesAsync()` dispatches the event
4. `WordAddedEventHandler` calls `DeckSyncService.SyncWordAddedAsync()`
5. Flash Card is created in both the Page Deck and All Words Deck of the board

#### 5.3.4 Edit Word (US-008)

- Click any cell → enters edit mode for that cell
- Changes auto-saved on `blur` (click away) or `Tab`
- **On word updated:** `WordUpdatedEvent` dispatched → Flash Card content updated (word, meanings, example)
- SR metadata (interval, ease factor, next review date) is **preserved** — only card face content changes

#### 5.3.5 Delete Word (US-009)

- Delete icon at end of each row
- Confirmation dialog required (destructive action)
- **On word deleted:** `WordDeletedEvent` dispatched → Flash Card **and all its SR history** deleted
- Soft delete on `VocabWord`; hard delete can be triggered by cleanup job after 30 days

#### 5.3.6 Column Customization (US-010)

- Column settings panel (⚙️ icon)
- Toggle visibility of optional columns (Thesaurus, Collocation, Note)
- Add custom columns (name + type: text / number)
- Column configuration saved per user per board

#### 5.3.7 Multi-language Support (US-011)

- Each board has a `language` field: `en`, `zh`, `ja`, `ko`, `fr`, ... (ISO 639-1)
- TTS voice selection follows the board's `language` field
- Column labels adapt (e.g., "Meaning (English)" becomes "Meaning (Pinyin)" for Chinese boards)

### 5.4 Domain Entities

```csharp
// VocabBoard.cs
public class VocabBoard : BaseEntity, IAggregateRoot
{
    public Guid UserId { get; private set; }
    public string Name { get; private set; }
    public string Language { get; private set; }  // "en", "zh", ...
    public int SortOrder { get; private set; }
    private readonly List<VocabPage> _pages = new();
    public IReadOnlyList<VocabPage> Pages => _pages.AsReadOnly();

    public static VocabBoard Create(Guid userId, string name, string language) { ... }
    public VocabPage AddPage(string name) { ... }
}

// VocabPage.cs
public class VocabPage : BaseEntity
{
    public Guid BoardId { get; private set; }
    public string Name { get; private set; }
    public int SortOrder { get; private set; }
    private readonly List<VocabWord> _words = new();
    public IReadOnlyList<VocabWord> Words => _words.AsReadOnly();

    public VocabWord AddWord(string word, string meaningVn, string meaningEn,
        WordClass wordClass, string example) 
    {
        var vocabWord = VocabWord.Create(this.Id, word, meaningVn, meaningEn, wordClass, example);
        _words.Add(vocabWord);
        AddDomainEvent(new WordAddedEvent(vocabWord.Id, this.BoardId, this.Id, word));
        return vocabWord;
    }
}

// VocabWord.cs
public class VocabWord : BaseEntity
{
    public Guid PageId { get; private set; }
    public string Word { get; private set; }
    public string MeaningVn { get; private set; }
    public string MeaningEn { get; private set; }
    public WordClass Class { get; private set; }
    public string Example { get; private set; }
    public string? Thesaurus { get; private set; }
    public string? Collocation { get; private set; }
    public string? Note { get; private set; }

    public void Update(string word, string meaningVn, string meaningEn,
        WordClass wordClass, string example, ...)
    {
        // Update fields, then:
        AddDomainEvent(new WordUpdatedEvent(this.Id, this.PageId, word, ...));
    }
}
```

### 5.5 Domain Events

```csharp
public record WordAddedEvent(
    Guid WordId,
    Guid BoardId,
    Guid PageId,
    string Word
) : IDomainEvent;

public record WordUpdatedEvent(
    Guid WordId,
    Guid PageId,
    string Word,
    string MeaningVn,
    string MeaningEn,
    WordClass Class,
    string Example
) : IDomainEvent;

public record WordDeletedEvent(
    Guid WordId,
    Guid PageId
) : IDomainEvent;
```

### 5.6 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/boards` | List all boards for current user |
| POST | `/api/v1/boards` | Create a new board |
| GET | `/api/v1/boards/{boardId}` | Get board details |
| PATCH | `/api/v1/boards/{boardId}` | Update board name/language |
| DELETE | `/api/v1/boards/{boardId}` | Soft-delete board |
| GET | `/api/v1/boards/{boardId}/pages` | List pages in a board |
| POST | `/api/v1/boards/{boardId}/pages` | Create a new page |
| PATCH | `/api/v1/boards/{boardId}/pages/{pageId}` | Rename page |
| DELETE | `/api/v1/boards/{boardId}/pages/{pageId}` | Delete page |
| GET | `/api/v1/boards/{boardId}/pages/{pageId}/words` | List words in a page |
| POST | `/api/v1/boards/{boardId}/pages/{pageId}/words` | Add a word |
| PATCH | `/api/v1/boards/{boardId}/words/{wordId}` | Update a word |
| DELETE | `/api/v1/boards/{boardId}/words/{wordId}` | Delete a word (soft) |

### 5.7 Acceptance Criteria Checklist

- [ ] User can create a board with a name and language setting
- [ ] Creating a board automatically creates an All Words Deck in Flash Card
- [ ] User can add pages to a board; each page auto-creates a Page Deck in Flash Card
- [ ] User can add words via inline table editing (Tab/Enter keyboard navigation)
- [ ] Adding a word triggers Flash Card sync (visible in Flash Card within 3 seconds)
- [ ] Editing a word updates the Flash Card content without resetting SR progress
- [ ] Deleting a word removes the Flash Card and all associated SR history (after confirmation)
- [ ] Optional columns can be hidden/shown; custom columns can be added
- [ ] All vocabulary data is scoped to the authenticated user

---

## 6. MVP Feature 3 — Flash Card & Spaced Repetition

### 6.1 Overview

Flash Card is the **review engine** of FluentA. Cards are never created manually — they are automatically generated and kept in sync with Vocabulary Board. The system implements two types of review:

- **Active Recall** (Page Deck): manual self-assessment, any order, for focused unit review
- **Spaced Repetition** (All Words Deck): SM-2 algorithm, scheduled review, for long-term retention

**User Stories covered:** US-012 through US-019  
**Story Points:** 32 SP

### 6.2 Deck Structure

| Deck Type | Source | Count per Board | Default Mode |
|-----------|--------|:---:|:---:|
| Page Deck | One `VocabPage` | N (one per page) | Normal |
| All Words Deck | All pages in one `VocabBoard` | 1 | Spaced Repetition |

**Example:** Board "IELTS" with 3 pages generates exactly 4 decks:
```
IELTS — Unit 1          (Page Deck)
IELTS — Unit 2          (Page Deck)
IELTS — Unit 3          (Page Deck)
IELTS — All Words       (All Words Deck)
```

### 6.3 Card Structure

Each card maps directly to a `VocabWord`. The card is read-only from the Flash Card side.

| Side | Content | Source Column |
|------|---------|--------------|
| **Front** | Word + Word Class | `word` + `class` |
| **Back (primary)** | Vietnamese meaning | `meaning_vn` |
| **Back (supplementary)** | English definition, Example sentence, Thesaurus, Collocation, Note | Other columns |

**TTS:** When the card front is displayed, the system automatically plays the word's pronunciation using the **Web Speech API** (`speechSynthesis`), using the voice language matching the board's `language` field.

### 6.4 Functional Requirements

#### 6.4.1 Deck List Page (US-012)

- Lists all decks grouped by board
- Each deck card shows:
  - Deck name
  - Total card count
  - Due today count (New + Review + Overdue) — highlighted badge if > 0
- Click deck → enter review session

#### 6.4.2 Active Recall Session — Page Deck (US-015)

**Pre-session:** User selects study mode:
- **Normal**: cards in defined order
- **Shuffle**: cards in random order

**During session:**
1. Show card front (Word + Class); auto-play TTS
2. User presses `Space` or clicks "Show Answer"
3. Card flips to show back (Meaning + supplementary info)
4. User selects self-rating:

| Button | Keyboard | Meaning | SM-2 Impact |
|--------|----------|---------|-------------|
| **Easy** | `1` | Recalled instantly | Interval × ease_factor × 1.3 |
| **Good** | `2` | Recalled correctly | Interval × ease_factor |
| **Hard** | `3` | Recalled with effort | Interval × 1.2 |
| **Again** | `4` | Could not recall | Reset interval → 1 day |

5. Rating is recorded → `CardReview` entity created
6. System moves to next card
7. Session ends when all cards are reviewed → show Session Summary

#### 6.4.3 Spaced Repetition Session — All Words Deck (US-016)

**Card priority queue (in order):**
1. **Overdue cards** — `NextReviewDate < today`
2. **Due today** — `NextReviewDate == today`
3. **New cards** — never reviewed; limited to 20/day (user-configurable)

**Review limits (default, user-configurable):**
- New cards per day: **20**
- Review cards per day: **200**

**SM-2 Algorithm implementation:**

```
On rating submission:
  quality = map(rating) → {Easy:3, Good:2, Hard:1, Again:0}

  if quality < 2 (Hard or Again):
    card.Interval = 1
    card.Repetitions = 0
  else:
    if card.Repetitions == 0:
      card.Interval = 1
    elif card.Repetitions == 1:
      card.Interval = 6
    else:
      card.Interval = round(card.Interval × card.EaseFactor)
    card.Repetitions += 1

  card.EaseFactor = max(1.3, card.EaseFactor + 0.1 - (3 - quality) × (0.08 + (3 - quality) × 0.02))
  card.NextReviewDate = today + card.Interval (days)
```

**When the day's cards are exhausted:**
- Display: "🎉 Great work! All cards reviewed for today."
- Show stats: cards reviewed today, Easy%, Good%, Hard%, Again%

**Overdue handling:**
- If user misses a day, overdue cards accumulate
- All overdue cards appear in the next session (same priority as due today)
- No penalty for missing days beyond the card being shown sooner

#### 6.4.4 Study Mode Selection (US-017)

- Dropdown before starting any deck session
- Page Deck → default Normal; can switch to Shuffle
- All Words Deck → default Spaced Repetition; can switch to Normal/Shuffle (for browsing purposes; does not affect SR schedule)

#### 6.4.5 Flash Card Dashboard (US-018)

Top-level Flash Card page stats (before entering a session):

| Widget | Description |
|--------|-------------|
| **Due Today** | Total cards due today, broken down per board |
| **Streak** 🔥 | Consecutive days with at least 1 card reviewed |
| **Retention Rate** | % of Easy + Good ratings in the last 30 days |
| **Daily Progress Chart** | Bar chart: cards reviewed per day (last 30 days) |
| **7-Day Forecast** | Estimated due cards for the next 7 days |
| **Card Distribution** | Donut chart: New / Learning / Review / Mature |

Card states for distribution:
- **New**: never reviewed
- **Learning**: interval < 7 days
- **Review**: 7 ≤ interval < 21 days
- **Mature**: interval ≥ 21 days

#### 6.4.6 Session Summary Screen (US-019)

Displayed automatically at the end of every session:

| Field | Description |
|-------|-------------|
| Total cards reviewed | Count |
| Easy | Count + percentage |
| Good | Count + percentage |
| Hard | Count + percentage |
| Again | Count + percentage |
| Total time | minutes:seconds |
| Average time per card | seconds |
| Action buttons | "Continue" (if more cards remain) / "Done" (back to deck list) |

### 6.5 Domain Entities

```csharp
// FlashcardDeck.cs
public class FlashcardDeck : BaseEntity, IAggregateRoot
{
    public Guid UserId { get; private set; }
    public Guid BoardId { get; private set; }
    public Guid? PageId { get; private set; }          // null = All Words Deck
    public string Name { get; private set; }
    public DeckType Type { get; private set; }         // PageDeck | AllWordsDeck
    private readonly List<FlashcardCard> _cards = new();
    public IReadOnlyList<FlashcardCard> Cards => _cards.AsReadOnly();
}

// FlashcardCard.cs
public class FlashcardCard : BaseEntity
{
    public Guid DeckId { get; private set; }
    public Guid WordId { get; private set; }           // FK → VocabWord (for sync)
    public string Word { get; private set; }
    public string WordClass { get; private set; }
    public string MeaningVn { get; private set; }
    public string MeaningEn { get; private set; }
    public string Example { get; private set; }
    public string? Thesaurus { get; private set; }
    public string? Collocation { get; private set; }
    public string? Note { get; private set; }

    // SM-2 state
    public int Interval { get; private set; }          // days until next review
    public float EaseFactor { get; private set; }      // default 2.5
    public int Repetitions { get; private set; }       // consecutive correct reviews
    public DateTime? NextReviewDate { get; private set; }
    public CardState State { get; private set; }       // New | Learning | Review | Mature

    public void ApplyReview(ReviewRating rating, DateTime today) { ... }
    public void SyncFromWord(VocabWord word) { ... }   // update card content from word
}

// CardReview.cs — audit log of each review
public class CardReview : BaseEntity
{
    public Guid CardId { get; private set; }
    public Guid SessionId { get; private set; }
    public ReviewRating Rating { get; private set; }   // Easy | Good | Hard | Again
    public int TimeSpentSeconds { get; private set; }
    public DateTime ReviewedAt { get; private set; }
    public int IntervalAfter { get; private set; }
    public float EaseFactorAfter { get; private set; }
}

public enum ReviewRating { Again = 0, Hard = 1, Good = 2, Easy = 3 }
public enum CardState { New, Learning, Review, Mature }
public enum DeckType { PageDeck, AllWordsDeck }
```

### 6.6 Domain Event Handlers (Deck Sync)

```csharp
// WordAddedEventHandler.cs
public class WordAddedEventHandler : IDomainEventHandler<WordAddedEvent>
{
    public async Task Handle(WordAddedEvent e, CancellationToken ct)
    {
        // 1. Find Page Deck for e.PageId
        // 2. Create FlashcardCard in Page Deck
        // 3. Find All Words Deck for e.BoardId
        // 4. Create FlashcardCard in All Words Deck
        // 5. Broadcast SignalR: "FlashcardDeckUpdated"
    }
}

// WordUpdatedEventHandler.cs
public class WordUpdatedEventHandler : IDomainEventHandler<WordUpdatedEvent>
{
    public async Task Handle(WordUpdatedEvent e, CancellationToken ct)
    {
        // Find all cards with WordId == e.WordId
        // Call card.SyncFromWord(...) — updates content, preserves SR state
        // Broadcast SignalR: "FlashcardDeckUpdated"
    }
}

// WordDeletedEventHandler.cs
public class WordDeletedEventHandler : IDomainEventHandler<WordDeletedEvent>
{
    public async Task Handle(WordDeletedEvent e, CancellationToken ct)
    {
        // Find all cards with WordId == e.WordId
        // Hard delete cards + all CardReview records
        // Broadcast SignalR: "FlashcardDeckUpdated"
    }
}
```

### 6.7 UnitOfWork — Event Dispatch

```csharp
// UnitOfWork.cs
public class UnitOfWork : IUnitOfWork
{
    private readonly AppDbContext _context;
    private readonly IDomainEventDispatcher _dispatcher;

    public async Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        // 1. Collect all domain events from tracked aggregates
        var events = _context.ChangeTracker.Entries<BaseEntity>()
            .SelectMany(e => e.Entity.DomainEvents)
            .ToList();

        // 2. Clear events from entities
        foreach (var entry in _context.ChangeTracker.Entries<BaseEntity>())
            entry.Entity.ClearDomainEvents();

        // 3. Save to DB first
        var result = await _context.SaveChangesAsync(ct);

        // 4. Dispatch events AFTER successful save
        foreach (var domainEvent in events)
            await _dispatcher.DispatchAsync(domainEvent, ct);

        return result;
    }
}
```

### 6.8 Background Job: Daily SR Queue Builder

```csharp
// SpacedRepetitionJob.cs — runs at 00:00 daily via Hangfire
public class SpacedRepetitionJob
{
    public async Task BuildDailyQueues()
    {
        var today = DateTime.UtcNow.Date;
        var userIds = await GetAllActiveUserIds();

        foreach (var userId in userIds)
        {
            var dueCards = await GetCardsDueForUser(userId, today);
            var cacheKey = $"user:{userId}:sr-queue:{boardId}";
            await _redis.SetAsync(cacheKey, dueCards, ttl: TimeSpan.FromHours(24));
        }
    }
}
```

### 6.9 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/flashcards/decks` | List all decks for current user |
| GET | `/api/v1/flashcards/decks/{deckId}` | Get deck details + stats |
| GET | `/api/v1/flashcards/decks/{deckId}/cards` | Get cards for a session |
| GET | `/api/v1/flashcards/decks/{deckId}/due` | Get due cards today (SR mode) |
| POST | `/api/v1/flashcards/review` | Submit a card review rating |
| POST | `/api/v1/flashcards/sessions` | Create a review session (returns sessionId) |
| GET | `/api/v1/flashcards/sessions/{sessionId}/summary` | Get session summary |
| GET | `/api/v1/flashcards/dashboard` | Get overall stats (streak, due, charts) |
| GET | `/api/v1/flashcards/dashboard/{boardId}` | Get per-board stats |

### 6.10 Acceptance Criteria Checklist

- [ ] Adding a word to Vocabulary Board creates a Flash Card within 3 seconds
- [ ] Editing a word updates card content; SR progress (interval, ease) is unchanged
- [ ] Deleting a word removes the card and all SR history
- [ ] Page Deck shows all words from that page; All Words Deck shows all words from all pages in the board
- [ ] Active Recall: card front shows word + class, TTS plays automatically
- [ ] Flipping the card shows Vietnamese meaning, English definition, and supplementary info
- [ ] All 4 rating buttons (Easy/Good/Hard/Again) work with keyboard shortcuts (1/2/3/4)
- [ ] SM-2: each rating produces the correct next review date
- [ ] All Words Deck shows: overdue first → due today → new cards (limited to 20 new/day)
- [ ] After all cards are reviewed: show "🎉 All done for today!" message
- [ ] Session summary screen shows correct counts and percentages
- [ ] Flash Card Dashboard shows streak, retention rate, and forecast chart
- [ ] SignalR broadcasts `FlashcardDeckUpdated` when any card is modified

---

## 7. Cross-Cutting Concerns

### 7.1 Standard API Response Format

All endpoints return a consistent JSON envelope:

```json
// Success (single resource)
{
  "success": true,
  "data": { ... }
}

// Success (collection)
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}

// Error
{
  "success": false,
  "error": {
    "code": "WORD_NOT_FOUND",
    "message": "The vocabulary word does not exist.",
    "details": { "wordId": "abc-123" }
  }
}
```

**Standard error codes:**

| Code | HTTP Status | Meaning |
|------|:-----------:|---------|
| `VALIDATION_ERROR` | 422 | Request body/params failed validation |
| `UNAUTHORIZED` | 401 | Missing or invalid JWT token |
| `FORBIDDEN` | 403 | Authenticated but not authorized |
| `NOT_FOUND` | 404 | Resource does not exist |
| `CONFLICT` | 409 | Resource already exists (e.g. duplicate email) |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### 7.2 Authentication Middleware

All API routes except `/api/v1/auth/*` require a valid Bearer JWT token. The middleware:
1. Extracts token from `Authorization: Bearer <token>` header
2. Validates RS256 signature and expiry
3. Sets `HttpContext.User` with claims (`sub`, `email`, `name`)
4. Returns `401` with `UNAUTHORIZED` code if invalid

### 7.3 Global Exception Handler

```csharp
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var exception = context.Features.Get<IExceptionHandlerFeature>()?.Error;
        // Log to Sentry + CloudWatch
        // Return standard error envelope
        context.Response.StatusCode = 500;
        await context.Response.WriteAsJsonAsync(new
        {
            success = false,
            error = new { code = "INTERNAL_ERROR", message = "An unexpected error occurred." }
        });
    });
});
```

### 7.4 Request Validation

All Controller action parameters are validated with **FluentValidation**. Validation failures automatically return 422 with field-level error details:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more validation errors occurred.",
    "details": {
      "email": ["Email is required.", "Email must be a valid email address."],
      "password": ["Password must be at least 8 characters."]
    }
  }
}
```

### 7.5 CORS Policy

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("FluentAPolicy", policy =>
    {
        policy
            .WithOrigins("https://fluenta.app", "https://staging.fluenta.app",
                         "http://localhost:5173")  // Vite dev server
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();  // required for HttpOnly cookie
    });
});
```

### 7.6 SignalR Events (MVP scope)

| Event Name | Trigger | Payload |
|-----------|---------|---------|
| `FlashcardDeckUpdated` | Word added/updated/deleted → deck synced | `{ boardId, deckId }` |
| `VocabWordSaved` | Word created or updated | `{ wordId, pageId }` |

Frontend action on receiving event:
```typescript
connection.on("FlashcardDeckUpdated", ({ boardId }) => {
  queryClient.invalidateQueries({ queryKey: ["flashcard", "decks", boardId] });
});

connection.on("VocabWordSaved", ({ pageId }) => {
  queryClient.invalidateQueries({ queryKey: ["vocab", "words", pageId] });
});
```

### 7.7 Soft Delete Pattern

All core entities implement soft delete via `DeletedAt DateTime?`. A global EF Core query filter automatically excludes soft-deleted records:

```csharp
// Applied in OnModelCreating for all entities implementing ISoftDelete
modelBuilder.Entity<VocabWord>()
    .HasQueryFilter(w => w.DeletedAt == null);
```

---

## 8. Data Models

### 8.1 Entity Relationship Diagram (MVP)

```
┌──────────┐       ┌──────────────┐       ┌────────────┐
│   User   │──1:N──│  VocabBoard  │──1:N──│  VocabPage │
│          │       │              │       │            │
│ Id       │       │ Id           │       │ Id         │
│ Email    │       │ UserId       │       │ BoardId    │
│ FullName │       │ Name         │       │ Name       │
│ PassHash │       │ Language     │       │ SortOrder  │
│ GoogleId │       │ SortOrder    │       └─────┬──────┘
│ Verified │       └──────┬───────┘             │ 1:N
└──────────┘              │ 1:N                 ▼
                          ▼              ┌──────────────┐
                   ┌──────────────┐     │  VocabWord   │
                   │FlashcardDeck │     │              │
                   │              │     │ Id           │
                   │ Id           │     │ PageId       │
                   │ BoardId      │     │ Word         │
                   │ PageId(null) │     │ MeaningVn    │
                   │ Name         │     │ MeaningEn    │
                   │ Type         │     │ Class        │
                   └──────┬───────┘     │ Example      │
                          │ 1:N         └──────────────┘
                          ▼
                   ┌──────────────┐
                   │FlashcardCard │──────────────┐
                   │              │              │ 1:N
                   │ Id           │       ┌──────▼──────┐
                   │ DeckId       │       │ CardReview  │
                   │ WordId       │       │             │
                   │ Word         │       │ Id          │
                   │ MeaningVn    │       │ CardId      │
                   │ Interval     │       │ SessionId   │
                   │ EaseFactor   │       │ Rating      │
                   │ Repetitions  │       │ TimeSpent   │
                   │ NextReview   │       │ ReviewedAt  │
                   │ State        │       └─────────────┘
                   └──────────────┘
```

### 8.2 Database Migration Notes

- All entities have: `Id` (UUID), `CreatedAt`, `UpdatedAt`, `DeletedAt` (nullable)
- `VocabBoard.Language` is a free-text ISO 639-1 code (not a foreign key to a languages table — keeps it extensible)
- `FlashcardCard.WordId` is a **soft FK** to `VocabWord` — no hard DB constraint, to allow cards to survive if the word is soft-deleted until the cleanup job runs
- `CardReview` is append-only — no updates, no soft delete
- Index on `FlashcardCard(NextReviewDate, State)` for efficient SR queue queries
- Index on `CardReview(CardId, ReviewedAt)` for streak and retention calculations

---

## 9. API Contract

### 9.1 Example Requests & Responses

#### POST /api/v1/auth/register

```json
// Request
{
  "email": "user@example.com",
  "password": "securePass123",
  "fullName": "Nguyen Van A"
}

// Response 201
{
  "success": true,
  "data": {
    "message": "Registration successful. Please verify your email."
  }
}
```

#### POST /api/v1/boards/{boardId}/pages/{pageId}/words

```json
// Request
{
  "word": "mitigate",
  "meaningVn": "giảm nhẹ, làm dịu",
  "meaningEn": "to make something less severe, serious, or painful",
  "class": "verb",
  "example": "Governments should take action to mitigate the effects of climate change.",
  "thesaurus": "alleviate, reduce, lessen",
  "collocation": "mitigate risk, mitigate damage, mitigate effects"
}

// Response 201
{
  "success": true,
  "data": {
    "id": "f7e1c2d3-...",
    "word": "mitigate",
    "meaningVn": "giảm nhẹ, làm dịu",
    "meaningEn": "to make something less severe, serious, or painful",
    "class": "verb",
    "example": "Governments should take action to mitigate the effects of climate change.",
    "thesaurus": "alleviate, reduce, lessen",
    "collocation": "mitigate risk, mitigate damage, mitigate effects",
    "note": null,
    "createdAt": "2026-06-08T15:30:00Z"
  }
}
```

#### GET /api/v1/flashcards/decks/{deckId}/due

```json
// Response 200
{
  "success": true,
  "data": {
    "deckId": "a1b2c3...",
    "deckName": "IELTS — All Words",
    "dueToday": {
      "overdue": 5,
      "dueToday": 12,
      "newCards": 8,
      "total": 25
    },
    "cards": [
      {
        "id": "card-id-1",
        "word": "mitigate",
        "wordClass": "verb",
        "meaningVn": "giảm nhẹ, làm dịu",
        "meaningEn": "to make something less severe...",
        "example": "Governments should take action...",
        "thesaurus": "alleviate, reduce, lessen",
        "collocation": "mitigate risk, mitigate damage",
        "note": null,
        "state": "New",
        "interval": 0,
        "easeFactor": 2.5
      }
    ]
  }
}
```

#### POST /api/v1/flashcards/review

```json
// Request
{
  "sessionId": "session-uuid",
  "cardId": "card-id-1",
  "rating": 2,              // 0=Again, 1=Hard, 2=Good, 3=Easy
  "timeSpentSeconds": 8
}

// Response 200
{
  "success": true,
  "data": {
    "cardId": "card-id-1",
    "newInterval": 6,
    "newEaseFactor": 2.5,
    "newState": "Learning",
    "nextReviewDate": "2026-06-14"
  }
}
```

---

## 10. Development Setup

### 10.1 Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| .NET SDK | 10.0+ | `dotnet --version` |
| Node.js | 20 LTS | For frontend |
| Docker Desktop | 24+ | For PostgreSQL + Redis locally |
| Git | Any | |

### 10.2 Local Infrastructure (Docker Compose)

```yaml
# docker-compose.dev.yml
version: "3.9"
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: fluenta_dev
      POSTGRES_USER: fluenta
      POSTGRES_PASSWORD: fluenta_local_pass
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

Run: `docker compose -f docker-compose.dev.yml up -d`

### 10.3 Backend Setup

```bash
# 1. Clone repo and navigate to backend
cd FluentA.API

# 2. Configure user secrets
dotnet user-secrets set "ConnectionStrings:Postgres" "Host=localhost;Database=fluenta_dev;Username=fluenta;Password=fluenta_local_pass"
dotnet user-secrets set "ConnectionStrings:Redis" "localhost:6379"
dotnet user-secrets set "Jwt:PrivateKey" "<RS256 private key PEM>"
dotnet user-secrets set "Jwt:PublicKey" "<RS256 public key PEM>"
dotnet user-secrets set "Google:ClientId" "<Google OAuth Client ID>"
dotnet user-secrets set "Google:ClientSecret" "<Google OAuth Client Secret>"

# 3. Run EF Core migrations
dotnet ef database update --project FluentA.Infrastructure --startup-project FluentA.API

# 4. Run the API
dotnet run --project FluentA.API
# API available at: https://localhost:7001
# Swagger UI: https://localhost:7001/swagger
```

### 10.4 Frontend Setup

```bash
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Create .env.local
echo "VITE_API_URL=https://localhost:7001" > .env.local
echo "VITE_GOOGLE_CLIENT_ID=<your-google-client-id>" >> .env.local

# 4. Start dev server
npm run dev
# Frontend available at: http://localhost:5173
```

### 10.5 Running Tests

```bash
# Backend unit tests
dotnet test FluentA.Domain.UnitTests
dotnet test FluentA.Application.UnitTests

# Frontend unit tests
cd frontend && npm run test
```

---

## 11. Definition of Done

A feature is considered **done** when all of the following are true:

### Code Quality
- [ ] All Acceptance Criteria from User Stories are implemented and verified
- [ ] Unit test coverage ≥ 75% for domain and application logic
- [ ] No compiler warnings; zero linting errors (ESLint + Prettier for FE)
- [ ] All public API methods/services have XML doc comments (C#)

### Functionality
- [ ] Works correctly in Chrome, Firefox, Edge (latest versions)
- [ ] No JavaScript console errors in normal usage
- [ ] API returns correct status codes and response envelope format
- [ ] Error states are handled gracefully (user sees a meaningful message, not a stack trace)

### Performance
- [ ] API response time p95 < 300ms under normal load
- [ ] Flash Card sync (word added → card appears) < 3 seconds
- [ ] Page First Contentful Paint < 2 seconds on simulated 4G

### Security
- [ ] All endpoints (except `/auth/*`) require valid JWT
- [ ] User data is scoped to the authenticated user — no cross-user data leakage
- [ ] No sensitive data (tokens, passwords) logged to console or log files

### Integration
- [ ] Domain Events dispatched correctly after `UnitOfWork.SaveChangesAsync()`
- [ ] SignalR events broadcast to the correct user's group
- [ ] TanStack Query cache invalidated on SignalR event receipt

---

*This specification covers the FluentA MVP: Authentication, Vocabulary Board, and Flash Card + Spaced Repetition. Together these three features implement the complete core learning loop and can be shipped as a functional, standalone product.*

*Next features to spec after MVP ship: Dashboard Overview, Todo List, Habit Tracker.*

---

## 12. Next Feature Plan — Email Verification OTP & Password Recovery

**Planning status:** Epic map ready for approval

**Mode:** High-risk feature

**Source of truth:** `history/auth-email-verification-password-recovery/CONTEXT.md`

### 12.1 Desired Outcomes

- A password-account user registers, receives a six-digit OTP through Gmail SMTP, enters it on FluentA, and verifies the email successfully.
- An eligible user submits a registered Gmail address, receives a single-use reset link, enters a new password on FluentA, and is redirected to Login after success.
- Existing email/password login, token refresh, logout, protected routes, and Google OAuth continue to work.

### 12.2 Locked Product Rules

| Rule | Required Behavior |
|---|---|
| Verification delivery | Gmail SMTP sends a six-digit OTP; Google Authenticator is excluded |
| OTP lifetime | 10 minutes from issuance |
| OTP resend | Available after 60 seconds; a replacement invalidates the previous OTP |
| OTP attempts | Five incorrect submissions invalidate the OTP |
| Reset link lifetime | 30 minutes from issuance |
| Reset link reuse | Single-use; invalid immediately after the password is saved |
| Unknown email | Forgot Password explicitly warns that the account does not exist |
| Existing sessions | Password reset does not revoke other active sessions |
| Successful reset | Redirect the completing browser to `/login` |

### 12.3 Current-State Delta

The current implementation creates unverified password users but verifies them with a signed JWT link delivered through local/AWS SES providers. Registration redirects directly to Login, and there are no Forgot Password or Reset Password routes. This plan replaces password-account verification links with OTP entry, replaces SES production delivery with Gmail SMTP, and adds a stateful single-use recovery flow.

### 12.4 Proposed Architecture

```text
Register
  -> create unverified user
  -> issue protected OTP challenge in Redis
  -> Gmail SMTP sends OTP
  -> /verify-email receives email + OTP
  -> atomic validate/attempt/consume
  -> mark user verified

Forgot Password
  -> require an existing eligible account email
  -> issue protected reset challenge in Redis
  -> Gmail SMTP sends high-entropy reset URL
  -> /reset-password validates token + new password
  -> update BCrypt password + atomically consume token
  -> redirect browser to /login
```

Security invariants:

- Generate OTPs and reset tokens with cryptographically secure randomness.
- Never log or persist raw OTPs, reset tokens, SMTP credentials, passwords, or Google client secrets.
- Protect the six-digit OTP with a server-side keyed hash and store only protected challenge material.
- Make OTP replacement, attempt counting, and reset-token consumption atomic under concurrent requests.
- Preserve current password validation, API envelopes, refresh rotation, and unverified-login gating.

### 12.5 Planned Public Surface

The exact request/response fields are finalized during current-story preparation, but planning expects these capabilities:

| Method | Endpoint | Outcome |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Create an unverified user and send the first OTP |
| `POST` | `/api/v1/auth/verify-email` | Verify an email with email address plus OTP |
| `POST` | `/api/v1/auth/resend-verification-otp` | Send a replacement OTP after cooldown |
| `POST` | `/api/v1/auth/forgot-password` | Validate account eligibility and send a reset link |
| `POST` | `/api/v1/auth/reset-password` | Consume a reset token and save a new password |

| Route | User Experience |
|---|---|
| `/register` | Register, then continue to OTP verification |
| `/verify-email` | Six-digit OTP entry, expiry feedback, resend countdown, and success path |
| `/forgot-password` | Registered-email form with explicit unknown-account warning |
| `/reset-password?token=...` | New-password and confirmation form with invalid/expired/used-link states |
| `/login` | Receives the successful-reset redirect and exposes the Forgot Password entry point |

### 12.6 Epic Map

| Epic | Capability / Risk Area | Stories | Exit Evidence |
|---|---|---|---|
| E1 — Safe email-challenge foundation | Gmail delivery, local testing, protected transient state, secret hygiene | SPIKE-AUTH-MAIL-001, US-AUTH-OTP-001 | Gmail/local smoke, Redis atomicity proof, no raw secrets |
| E2 — Registration email verification | Complete registration-to-verified journey | US-AUTH-OTP-002 | OTP success, expiry, resend, old-code rejection, five-attempt invalidation |
| E3 — Password recovery | Complete forgot-to-reset-to-login journey | US-AUTH-RESET-001 | Existing/unknown account behavior, expiry, tamper, single-use, password login |
| E4 — Auth release hardening | Regression, provider configuration, docs, decisions, Harness proof | US-AUTH-SEC-001 | Auth suite, provider smoke, secret scan, current contracts and matrix |

### 12.7 Ordered Story Queue

1. **SPIKE-AUTH-MAIL-001:** Prove Gmail SMTP authentication, deterministic local delivery, protected Redis challenge operations, and the secret-removal/rotation path.
2. **US-AUTH-OTP-001:** Build the reusable challenge and email-delivery foundation after spike acceptance.
3. **US-AUTH-OTP-002:** Deliver the full registration OTP journey across API and browser.
4. **US-AUTH-RESET-001:** Deliver the full password-recovery journey after resolving OAuth-only account eligibility.
5. **US-AUTH-SEC-001:** Run release regression, provider smoke, secret checks, and reconcile product/decision/Harness records.

Only the approved current story is prepared for validation and execution; later stories remain queued until their dependencies pass.

### 12.8 Risk And Validation Plan

| Risk | Required Proof Before Release |
|---|---|
| Gmail SMTP account policy or credential failure | Live non-production delivery smoke using secrets outside tracked files |
| OTP brute force or race windows | Attempt-limit, cooldown, replacement, expiry, and concurrent Redis tests |
| Reset-token replay/account takeover | High-entropy token, protected storage, tamper/expiry/single-use/concurrent consume tests |
| Intentional account enumeration | Exact unknown-email error and endpoint throttling proof |
| Existing sessions remain active after reset | Explicit regression documenting the accepted D6 behavior |
| OAuth-only user has no password | Product decision required before US-AUTH-RESET-001 |
| Existing secret exposure | Remove the tracked secret, rotate it externally, and scan tracked configuration/diff |
| Auth regressions | Existing registration/login/refresh/logout/Google tests plus focused Playwright flows |

### 12.9 Verification Ladder

```powershell
dotnet test src/backend/FluentA.slnx
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run
npm --prefix src/frontend run build
npm --prefix src/frontend run test:e2e -- auth-email-verification.spec.js auth-password-recovery.spec.js
.\scripts\bin\harness-cli.exe story verify <approved-story-id>
.\scripts\bin\harness-cli.exe query matrix
git diff --check
```

Validation must also include focused real-Redis concurrency checks and a Gmail SMTP smoke in a credentialed non-production environment. Commands are refined when the current story packet is prepared.

### 12.10 Scope Boundaries

Out of scope:

- Google Authenticator or authenticator-app TOTP.
- Passwordless or magic-link login.
- Revoking all existing sessions after password reset.
- Hiding whether a Forgot Password email exists.
- Changing Google OAuth login behavior except secret hygiene and regression proof.
- Preparing implementation beads before feasibility validation accepts the current story.

### 12.11 Approval Gate And First Work

The first work item is **SPIKE-AUTH-MAIL-001** because Gmail authentication policy, Redis atomic operations, deterministic test delivery, OAuth-only recovery behavior, and secret rotation are feasibility gates for all implementation stories.

Approve this epic map before Planning prepares the current spike/story pack. Implementation starts only after feasibility validation passes and receives a separate execution approval.
