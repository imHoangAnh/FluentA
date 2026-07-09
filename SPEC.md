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
13. [Feature Plan —  Practice Modes](#13-next-feature-plan--flashcard-practice-modes)
14. [Next Feature Plan — Flashcard, Practice, And Review Redesign](#14-next-feature-plan--flashcard-practice-and-review-redesign)
15. [Next Feature Plan — Profile And Learning Settings](#15-next-feature-plan--profile-and-learning-settings)
16. [Next Feature Plan — FluentA SRS Algorithm](#16-next-feature-plan--fluenta-srs-algorithm)
17. [Next Feature Plan — Database Performance Optimization](#17-next-feature-plan--database-performance-optimization)
18. [Next Feature Plan — MinIO Asset Storage](#18-next-feature-plan--minio-asset-storage)
19. [Next Feature Plan — FluentA Worker Runtime](#19-next-feature-plan--fluenta-worker-runtime)
20. [Next Feature Plan — Backend Bounded Context Split](#20-next-feature-plan--backend-bounded-context-split)
21. [Next Feature Plan — Vocabulary Page Fixed Columns And Board Preferences](#21-vocabulary-page-fixed-columns-and-board-preferences)
22. [Next Feature Plan — Productivity Schema Cleanup And Countdowns Redesign](#22-next-feature-plan--productivity-schema-cleanup-and-countdowns-redesign)
23. [Next Feature Plan — Flashcard, Practice, And Review Source-Of-Truth Redesign](#23-next-feature-plan--flashcard-practice-and-review-source-of-truth-redesign)
24. [Next Feature Plan — Settings Route Split](#24-next-feature-plan--settings-route-split)

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
│   └── FluentA.Worker/                   # Separate Hangfire worker host
│       └── Program.cs
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
// Review scheduling is request-driven in the current product. Recurring
// background jobs run from the dedicated FluentA.Worker process after
// Feature 19, not from FluentA.API.
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

---

## 13. Next Feature Plan —  Practice Modes

**Planning status:** Product decisions locked for implementation planning

**Mode:** Normal feature with browser capability risk

**Source of truth:** `history/flashcard-practice-modes/CONTEXT.md`

### 13.1 Desired Outcomes

- Learners can open practice from any existing flashcard deck and choose one of three practice-only modes.
- Dictation mode plays the target word through browser speech synthesis, then asks the learner to type the word.
- Meaning-to-word mode shows both Vietnamese meaning and English meaning/definition, then asks the learner to type the target word.
- Pronunciation mode plays the target word, listens through browser speech recognition, transcribes the learner's speech, and checks it against the target word.
- Practice sessions reuse existing synchronized flashcard deck/card data and do not change SM-2 scheduling.

### 13.2 Locked Product Rules

| Rule | Required Behavior |
|---|---|
| Practice-only behavior | The three new modes never change `interval`, `easeFactor`, `repetitions`, `nextReviewDate`, or card `state`. |
| Deck coverage | Practice is available from every `PageDeck` and every `AllWords` deck. |
| Browser speech | MVP uses browser Web Speech APIs only: speech synthesis for playback and speech recognition for pronunciation transcription where supported. |
| Typed answer matching | Typed answers use exact normalized matching: trim surrounding whitespace and ignore case, but require exact spelling. |
| Pronunciation matching | Pronunciation mode compares the normalized speech-recognition transcript to `card.word` with the same exact-match rule. |
| Wrong answer behavior | A wrong answer stays on the same card and allows retry. |
| Reveal or skip behavior | Reveal/skip counts as wrong for the session summary. |
| Meaning prompt | Meaning-to-word mode shows both `meaningVn` and `meaningEn`; the expected answer is `card.word`. |
| Dictation prompt | Dictation mode shows no word, word class, or meaning hints; it provides only audio playback/replay and answer input. |
| Session summary | Practice summary shows total cards, correct cards, and wrong cards. |
| Durable practice history | Backend stores only practice session summaries: mode, deck id, total cards, correct count, wrong count, and completed time. It does not store individual attempts or per-card answers in MVP. |
| UI boundary | Practice uses a separate route instead of the existing SM-2 review route. |
| Practice entry | Each deck exposes a Practice entry that opens `/flashcards/decks/{deckId}/practice`; the practice page lets the learner choose one of the three modes. |
| All Words selection | Practice from an `AllWords` deck uses all cards in that deck, not the due queue and not daily review limits. |
| Language scope | Practice applies to all board languages. TTS and speech recognition use the deck's `boardLanguage`; the answer target remains `card.word`. |

### 13.3 User Experience

From `/flashcards`, each non-empty deck displays a **Practice** action in addition
to the current study/review action. The Practice action opens:

```text
/flashcards/decks/{deckId}/practice
```

The practice page:

1. Loads the owned active deck and its cards through existing flashcard deck data.
2. Shows the deck name, card count, and three practice mode choices:
   - Dictation: listen, then type the word.
   - Meaning -> Word: read meanings, then type the word.
   - Pronunciation: listen, speak, then compare transcript.
3. Starts a practice session using all cards in the deck.
4. Presents one card at a time.
5. Records correct or wrong for the session summary only.
6. Allows retry after wrong answers.
7. Treats reveal/skip as wrong and advances according to the session flow.
8. Shows a final summary with total cards, correct cards, and wrong cards.

### 13.4 Practice Mode Behavior

#### Dictation

- Prompt: no visible word, word class, meaning, example, or hint.
- Controls: play audio, replay audio, text input, submit, reveal/skip.
- Correct answer: `card.word`.
- Check: exact normalized match.
- Wrong answer: show wrong feedback and keep the same card available for retry.
- Reveal/skip: mark wrong for the card and show the answer.

#### Meaning -> Word

- Prompt: `meaningVn` and `meaningEn` are both visible.
- Controls: text input, submit, reveal/skip.
- Correct answer: `card.word`.
- Check: exact normalized match.
- Wrong answer: show wrong feedback and keep the same card available for retry.
- Reveal/skip: mark wrong for the card and show the answer.

#### Pronunciation

- Prompt: play the target word through browser speech synthesis.
- Controls: play/replay, start listening, stop listening where supported, submit transcript/result, reveal/skip.
- Recognition: browser speech recognition captures the learner's speech and returns a transcript.
- Correct answer: `card.word`.
- Check: exact normalized transcript match.
- Wrong answer: show recognized transcript when available, show wrong feedback, and keep the same card available for retry.
- Reveal/skip: mark wrong for the card and show the answer.
- Unsupported browser behavior: the page must show a clear unsupported-state message for speech recognition while preserving access to the other practice modes when possible.

### 13.5 Data And API Expectations

MVP should add a durable practice-session summary surface without storing
per-attempt data.

Expected persisted fields:

| Field | Purpose |
|---|---|
| `id` | Practice summary id. |
| `userId` | Authenticated owner. |
| `deckId` | Practiced flashcard deck. |
| `mode` | `dictation`, `meaningToWord`, or `pronunciation`. |
| `totalCards` | Number of cards in the practice session. |
| `correctCards` | Number of cards completed correctly. |
| `wrongCards` | Number of cards counted wrong, including reveal/skip. |
| `completedAt` | UTC completion timestamp. |

Expected API capabilities:

| Method | Endpoint | Outcome |
|---|---|---|
| `GET` | `/api/v1/flashcards/decks/{deckId}/cards` | Reuse existing owned deck/card read for practice setup. |
| `POST` | `/api/v1/flashcards/practice-sessions` | Persist a completed practice summary for an owned active deck. |

The exact request/response DTO names can be finalized during implementation
planning, but the request must include `deckId`, `mode`, `totalCards`,
`correctCards`, and `wrongCards`. The server must verify deck ownership and
reject foreign, deleted, or inconsistent summaries.

### 13.6 Scope Boundaries

Out of scope:

- External TTS or speech-recognition providers.
- AI pronunciation scoring, phoneme-level scoring, waveform analysis, or accent feedback.
- Fuzzy spelling, typo tolerance, or "almost correct" states.
- Per-card practice history or per-attempt answer storage.
- Changing existing SM-2 review scheduling or daily planning behavior.
- Using `AllWords` due queues or daily limits for practice sessions.
- Native mobile speech integrations.

### 13.7 Risk And Validation Plan

| Risk | Required Proof Before Release |
|---|---|
| Practice accidentally mutates SM-2 fields | Backend tests prove practice summary writes do not update flashcard card schedule fields. |
| Deck ownership leak | API tests reject foreign, deleted, and missing decks. |
| Browser speech support varies | Frontend tests cover unsupported speech-recognition state and preserve non-speech practice modes. |
| Matching ambiguity | Unit tests cover trim/case normalization and exact spelling failures. |
| Practice/review confusion | Playwright flow proves practice uses `/flashcards/decks/{deckId}/practice` and existing review route behavior still works. |
| All Words queue confusion | Tests prove practice uses all deck cards and does not call due queue or consume daily limits. |

### 13.8 Proposed Story Queue

1. **US-PRACTICE-001:** Add practice route, deck entry point, mode selection, and shared practice session shell.
2. **US-PRACTICE-002:** Implement Dictation and Meaning -> Word practice with exact matching, retry, reveal/skip, and session summary.
3. **US-PRACTICE-003:** Implement Pronunciation practice with browser speech recognition, unsupported-state handling, and transcript matching.
4. **US-PRACTICE-004:** Persist practice session summaries and add ownership/invariant validation.
5. **US-PRACTICE-005:** Run release regression for existing review modes, SM-2 scheduling, dashboard counts, and practice E2E flows.

### 13.9 Verification Ladder

```powershell
dotnet test src/backend/FluentA.slnx
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run
npm --prefix src/frontend run build
npm --prefix src/frontend run test:e2e -- flashcard-practice.spec.js
.\scripts\bin\harness-cli.exe story verify <approved-story-id>
.\scripts\bin\harness-cli.exe query matrix
git diff --check
```

Planning may split or refine commands by story, but release proof must cover
practice mode correctness, no SM-2 mutation, practice summary persistence,
speech unsupported-state handling, and regression of existing review sessions.

---

## 14. Next Feature Plan — Flashcard, Practice, And Review Redesign

**Planning status:** Product decisions locked for implementation planning

**Mode:** High-risk learning-domain redesign

**Supersedes:** the old Flashcard-as-review-engine role, All Words deck review,
and the Section 13 practice-only interpretation where practice never affects
SRS. Feature 13 practice modes remain reusable UI/interaction building blocks.

**Source of truth:** `history/flashcard-practice-review-redesign/CONTEXT.md`

### 14.1 Desired Outcomes

- FluentA has three top-level learning menus: **Flashcard**, **Practice**, and
  **Review**.
- Flashcard becomes a read-only page-deck viewer. It no longer owns review
  scheduling.
- Practice is the first-learning workflow. It reuses the implemented Feature 13
  mode interactions, adds `Sequential` and `Shuffle` order settings, and marks
  practiced words into SRS only after the full practice session is completed.
- Review is the SRS workflow. It reviews due words from a selected vocabulary
  board, not from an All Words flashcard deck.
- All Words decks are removed from the product model. Flashcard sync creates
  only one deck per vocabulary page.
- SRS state moves into a dedicated review table linked to vocabulary words.

### 14.2 Locked Product Rules

| Rule | Required Behavior |
|---|---|
| Top-level menus | Navigation exposes separate `Flashcard`, `Practice`, and `Review` menu items. |
| Naming | The first-learning flow is named `Practice`, not `Learn`. |
| Feature 13 reuse | Existing Dictation, Meaning -> Word, and Pronunciation interactions are reused for Practice and Review. |
| Order setting | Practice and Review support `Sequential` and `Shuffle`. Sequential uses the selected ordered set; Shuffle randomizes within that set. |
| Flashcard deck model | All Words decks are removed. Each vocabulary page syncs to exactly one page deck. |
| Old SRS migration | Existing All Words SRS data does not need to be preserved; destructive migration is acceptable. |
| Review storage | SRS state is stored in a dedicated review table linked to vocabulary words, not on `VocabWord` and not on `FlashcardCard`. |
| Review record creation | The review/SRS record is created only after a Practice session completes for the word. |
| Initial SRS state | A newly practiced word enters `Learning` with next review due tomorrow. |
| Re-practice behavior | Practicing a word that already has SRS state resets that existing SRS record to `Learning`, due tomorrow. |
| Delete behavior | Deleting a word, page, or board hard-deletes related SRS review records. |
| Practice selection | Practice menu uses a Board -> Page Deck tree. Practice runs on the selected page deck. |
| Practice card set | Practice includes all cards in the selected page deck, including words that already have SRS state. |
| Practice order | Practice `Sequential` follows current deck/card creation order; `Shuffle` randomizes that order. |
| Practice mode setting | Practice uses a global user setting that stores the selected unique mode sequence. The setting applies to every Practice session. |
| Practice mode selection | The global Practice mode sequence must include at least one unique mode from Dictation, Meaning -> Word, and Pronunciation. |
| Practice default sequence | When the user has not changed the setting, Practice defaults to Dictation -> Meaning -> Word -> Pronunciation. |
| Practice workflow | Each word runs the globally configured Practice mode sequence, then Flashcard recap, then Next word. |
| Practice wrong answers | A wrong answer stays on the current step until the learner answers correctly or uses skip/reveal. |
| Practice skip/reveal | Skip/reveal completes the current step and still allows the word to be marked learned when the full session finishes. |
| Practice persistence | UI tracks completion per word, but backend creates/updates SRS records in one batch only when the whole practice session/deck finishes. |
| Practice abandonment | If the learner leaves Practice before finishing the full session, no SRS progress is persisted. |
| Practice recap | Practice always shows flashcard recap after the configured mode sequence. Recap is not reorderable and cannot be disabled in Practice. |
| Practice and Review settings split | Practice mode settings do not affect Review. Review mode selection remains per session. |
| Review selection | Review menu selects a vocabulary board. The review queue is built from words in that board's pages. |
| Review unit | Product language and UI say `word`, not `card`. The reviewed unit is the word from vocabulary pages. |
| Review queue | Review includes words whose SRS next review date is due today or overdue within the selected board. |
| Review limit | Global user setting defaults to `300 words/day`. |
| Limit overflow | When due words exceed the daily limit, Review selects the oldest due words first and immediately moves the overflow due dates to tomorrow when the session starts. |
| Review sequential order | Review `Sequential` sorts by oldest `nextReviewDate` first, then creation order. |
| Review shuffle order | Review `Shuffle` first applies the oldest-due limit set, then shuffles within that set. |
| Review mode selection | Each Review session asks the learner to choose `Dictation`, `Pronunciation`, `Meaning -> Word`, or `Random`. |
| Review random mode | Random assigns one of the three modes per word while still respecting the selected order type. |
| Review scoring | Review uses automatic correct/wrong results from the selected mode; it does not show Easy/Good/Hard/Again buttons. |
| SRS algorithm | Review scheduling uses the FluentA SRS level algorithm defined in Section 16. It replaces the previous SM-2 mapping. |
| Review wrong answer UX | A wrong Review answer records the wrong result, shows answer/recap, and moves to the next word. |
| Review persistence | Review persists each word immediately after it is answered. Abandoning a session keeps already-reviewed word updates. |
| Review recap setting | `Recap after answer` is a global user setting. If enabled, correct and wrong answers show recap before Next. If disabled, correct answers can move quickly; wrong answers still show answer/recap. |
| Flashcard menu | Flashcard shows only the page-deck list initially. It does not show all words in the list view. |
| Flashcard viewer | Selecting a deck opens a one-card-at-a-time viewer with click-to-flip and manual Next/Previous controls. |
| Flashcard final actions | On the final card, the viewer shows `Finish` and `Let's practice`. `Let's practice` redirects to Practice for that exact page deck. |
| Flashcard front | Front shows `word`, `class`, and `meaningEn` when present. |
| Flashcard back | Back shows `meaningVn`, `example`, and `thesaurus` when present. Empty fields are hidden. |

### 14.3 New Product Navigation

The learning area is split into three top-level menus:

| Menu | Primary job |
|---|---|
| `Flashcard` | Read-only card browsing for page decks synced from vocabulary pages. |
| `Practice` | First-learning and re-practice workflow for one selected page deck. |
| `Review` | SRS review workflow for due words in one selected vocabulary board. |

This split replaces the current mixed Flashcards page where deck browsing,
practice, dashboard, and All Words review live together.

### 14.4 Flashcard Workflow

1. Learner opens **Flashcard**.
2. The page lists page decks grouped by vocabulary board/page. The visible deck
   title is the corresponding page name.
3. The list does not render every word/card inline.
4. Learner selects one page deck.
5. The viewer opens immediately on the first card.
6. Viewer shows one card at a time.
7. Clicking the card flips front/back.
8. Learner uses Next/Previous manually.
9. On the final card, learner chooses:
   - `Finish`: leave or close the viewer.
   - `Let's practice`: redirect to Practice for that page deck.

Card display:

| Side | Fields |
|---|---|
| Front | `word`, `class`, optional `meaningEn` |
| Back | `meaningVn`, `example`, optional `thesaurus` |

Optional fields are hidden when empty.

### 14.5 Practice Workflow

Practice is the first-learning and re-practice workflow. It does not reset SRS
for words that are already in Review.

1. Learner opens **Practice**.
2. Learner selects a board, then a page deck.
3. Learner chooses order type:
   - `Sequential`: current deck/card creation order.
   - `Shuffle`: randomized order.
4. Practice includes every card in the selected page deck.
5. For each word, the learner must complete the global Practice mode sequence.
   The default sequence is:
   - Dictation: listen, then type the word.
   - Meaning -> Word: view meanings, then type the word.
   - Pronunciation: speak the word and match the transcript.
6. The learner may configure the global Practice mode sequence to include any
   non-empty unique subset of the three modes in any order. Examples:
   - Dictation -> Meaning -> Word
   - Dictation -> Pronunciation
   - Meaning -> Word -> Dictation -> Pronunciation
7. After the configured mode sequence, Practice always shows flashcard recap
   before moving on.
8. Wrong answers keep the learner on the current step until a correct answer or
   skip/reveal.
9. Skip/reveal completes the current step.
10. UI tracks completion per word.
11. At the end of Practice, learner chooses:
   - `Finish`: end Practice without creating SRS for words that do not already
     have SRS state.
   - `Add to Review`: create FluentA SRS Level 0 records, due tomorrow, for
     practiced words that do not already have SRS state.
12. If the learner abandons the session before choosing an end action, no SRS
    state changes are saved.

SRS result after Practice end action:

| Word condition | Result |
|---|---|
| No existing review record + `Finish` | No SRS state is created. |
| No existing review record + `Add to Review` | Create FluentA SRS `level = 0`, due tomorrow. |
| Existing review record + either action | Keep current level, due date, and lapse count unchanged. |

### 14.6 Review Workflow

Review is the only SRS workflow.

1. Learner opens **Review**.
2. Learner selects one vocabulary board.
3. Learner chooses order type:
   - `Sequential`
   - `Shuffle`
4. Learner chooses review mode:
   - `Dictation`
   - `Pronunciation`
   - `Meaning -> Word`
   - `Random`
5. System builds a due-word queue from the selected board's pages.
6. Queue includes words with review records whose `nextReviewDate` is due today
   or overdue.
7. Global review limit defaults to `300 words/day`.
8. If due words exceed the daily limit:
   - Select oldest due words first up to the limit.
   - Immediately move overflow words to tomorrow.
   - Review session uses only the selected queue.
9. Each answer is automatically evaluated as correct or wrong by the mode.
10. Correct and wrong answers update scheduling through FluentA SRS as defined
    in Section 16.
11. Each answered word persists immediately.
12. Wrong answers show answer/recap and move to the next word.
13. Correct answer recap follows the global `recap after answer` setting.

Random mode keeps the selected word order and randomizes only the mode assigned
to each word.

### 14.7 Data Model Expectations

The new Review storage should be independent of Flashcard cards.

Expected review/SRS state fields:

| Field | Purpose |
|---|---|
| `id` | Review state id. |
| `userId` | Owner for fast ownership scoping. |
| `wordId` | Linked `VocabWord`. |
| `boardId` | Denormalized board scope for queue building, or queryable through page/board relation if planning rejects denormalization. |
| `level` | Current FluentA SRS level from 0 through 5. |
| `nextReviewDate` | UTC date/time used for due queue. |
| `lapseCount` | Count of wrong answers from Level 1 through Level 5 that reset the word to Level 0. |
| `lastReviewedAt` | Last Review completion timestamp. |
| `createdAt` / `updatedAt` | Standard audit timestamps. |

Creation and deletion rules:

- New `VocabWord` creation does not create review state.
- Practice `Add to Review` creates review state only for practiced words without
  existing SRS state.
- Re-practice never resets existing SRS state.
- Word/page/board deletion hard-deletes related review state.
- Destructive migration from existing All Words review storage is acceptable.

### 14.8 API Expectations

Exact DTO names can be finalized during implementation planning. The public
capabilities must support:

| Method | Endpoint | Outcome |
|---|---|---|
| `GET` | `/api/v1/flashcards/decks` | Return only page decks synced from vocabulary pages. No All Words decks. |
| `GET` | `/api/v1/flashcards/decks/{deckId}/cards` | Return cards for one owned active page deck for Flashcard and Practice. |
| `POST` | `/api/v1/flashcards/practice-sessions` | Persist a completed Practice summary without creating review state. |
| `POST` | `/api/v1/practice/add-to-review` | Add missing practiced words to FluentA SRS Level 0 due tomorrow. |
| `GET` | `/api/v1/practice/settings` | Return the global Practice mode sequence. |
| `PUT` | `/api/v1/practice/settings` | Update the global Practice mode sequence. |
| `GET` | `/api/v1/review/settings` | Return global review limit and recap-after-answer setting. |
| `PUT` | `/api/v1/review/settings` | Update global review limit and recap-after-answer setting. |
| `POST` | `/api/v1/review/sessions` | Build a board due queue, apply daily limit, and move overflow due words to tomorrow. |
| `POST` | `/api/v1/review` | Persist one reviewed word result immediately using correct/wrong mapping. |

All endpoints are authenticated and owner-scoped. Foreign words, deleted words,
deleted pages, deleted boards, and inconsistent board/deck references must be
rejected.

### 14.9 Scope Boundaries

Out of scope:

- Preserving existing All Words review history.
- Keeping All Words decks in the product model.
- AI pronunciation scoring or external speech providers.
- Per-attempt answer storage for Practice steps.
- Saving partial Practice progress when the session is abandoned.
- Per-session Practice mode override. Practice mode sequence is global in MVP.
- Review by individual page deck. Review is board-level.
- Mobile-native speech integrations.

### 14.10 Risk And Validation Plan

| Risk | Required Proof Before Release |
|---|---|
| All Words deck removal breaks vocabulary sync | Migration and tests prove each page has one synced page deck and no All Words deck is returned. |
| SRS moves to wrong owner or wrong word | Backend ownership tests reject foreign board, page, word, and deck references. |
| Practice creates partial SRS state | Tests prove abandoned Practice does not create or update review records. |
| Practice completion writes too early | Tests prove SRS records are batch-created/reset only at full session completion. |
| Practice setting invalid sequence | API and UI tests reject empty mode sequences, unknown modes, and duplicate modes. |
| Practice mode customization regresses default flow | Tests prove the default remains Dictation -> Meaning -> Word -> Pronunciation and a custom subset/order is honored. |
| Review overflow changes too many words | Integration proof shows oldest due words are selected and overflow due dates move to tomorrow at session start. |
| Review abandonment loses completed answers | Tests prove each answered word persists immediately even if the session is not completed. |
| Review mode/order conflict | Tests prove Random mode randomizes mode per word while Sequential/Shuffle still controls word order. |
| Flashcard no longer acts as review | Playwright proof covers read-only card browsing, click-to-flip, final Finish/Let's practice actions, and redirect to Practice. |
| Existing Feature 13 regression | Reused dictation, meaning-to-word, and pronunciation interactions remain covered in Practice and Review flows. |
| SRS algorithm drift | Unit tests prove every FluentA SRS level transition and due-date calculation from Section 16. |

### 14.11 Proposed Story Queue

1. **US-LR-001:** Introduce new navigation split: Flashcard, Practice, Review.
2. **US-LR-002:** Remove All Words deck behavior and migrate flashcard sync to page-deck-only.
3. **US-LR-003:** Add dedicated word review/SRS state storage and destructive migration path.
4. **US-LR-004:** Rebuild Flashcard as read-only page-deck viewer with one-card flow and Let's practice redirect.
5. **US-LR-005:** Build Practice board -> page deck selection, sequential/shuffle ordering, global configurable mode sequence, recap, and batch SRS completion.
6. **US-LR-006:** Build Review board selection, global settings, due queue start, overflow rescheduling, mode selection, and immediate per-word persistence.
7. **US-LR-007:** Run release regression for vocabulary sync, Feature 13 interactions, FluentA SRS transitions, dashboard impacts, and browser speech fallbacks.

### 14.12 Verification Ladder

```powershell
dotnet test src/backend/FluentA.slnx
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run
npm --prefix src/frontend run build
npm --prefix src/frontend run test:e2e -- flashcard-viewer.spec.js practice-workflow.spec.js review-workflow.spec.js
.\scripts\bin\harness-cli.exe story verify <approved-story-id>
.\scripts\bin\harness-cli.exe query matrix
git diff --check
```

Planning may split proof by story. Release proof must cover destructive
migration behavior, no All Words deck leakage, dedicated review storage,
Practice batch semantics, Review overflow semantics, and preservation of the
implemented speech/text practice interactions.

---

## 15. Next Feature Plan — Profile And Learning Settings

**Planning status:** Product decisions locked for implementation planning

**Mode:** High-risk account/settings feature

**Depends on:** Feature 14's Practice and Review settings contract.

**Source of truth:** `history/profile-learning-settings/CONTEXT.md`

**Avatar storage superseded by Feature 18:** this section originally locked a
Cloudinary-backed avatar implementation. Feature 18 replaces that provider and
upload flow with MinIO-backed shared asset storage. The profile/settings
behavior remains relevant; Cloudinary-specific storage rules are legacy context.

### 15.1 Desired Outcomes

- Authenticated users can open one Settings page that combines profile editing
  and learning settings.
- Users can update display name, optional avatar, and optional bio.
- Avatar upload uses durable external object storage; Feature 18 defines the
  current MinIO-backed storage contract.
- Practice Settings lets users configure the global Practice mode sequence
  introduced in Feature 14.
- Review Settings lets users configure global review limit and recap behavior
  introduced in Feature 14.
- Practice and Review settings autosave independently when changed, while
  Profile uses an explicit Save button.

### 15.2 Locked Product Rules

| Rule | Required Behavior |
|---|---|
| Settings route | A single Settings page contains Profile first, then Practice Settings, then Review Settings. |
| Profile fields | Profile supports name, avatar, bio, and read-only email. |
| Name validation | Name is required and must be 2-100 characters. |
| Bio validation | Bio is optional, plain text only, and at most 500 characters. |
| Email behavior | Email is shown read-only and cannot be changed in this feature. |
| Avatar optionality | Avatar can be null. |
| Avatar upload | Avatar uses durable external object storage. Feature 18 supersedes the original Cloudinary provider with MinIO-backed asset storage. |
| Avatar file types | Avatar accepts JPG, PNG, and WebP only. |
| Avatar size | Avatar max file size is 2MB. |
| Avatar save UX | Selecting a new avatar shows a local preview; the profile avatar changes only after the save/finalize flow succeeds. |
| Avatar remove UX | Remove avatar sets avatar to null on Save Profile. If a new unsaved file was selected, remove discards it and saves null. |
| Avatar replace cleanup | When replacing avatar, make the new avatar durable and update DB successfully before deleting the old avatar object. |
| Avatar save atomicity | If storage config is missing or upload/finalize fails, Profile save fails entirely and keeps old profile/avatar. |
| Uploaded-image cleanup | If new object upload succeeds but DB update fails, backend deletes the newly uploaded object. |
| Avatar response | Profile API returns `avatarUrl` only. Provider object keys and asset metadata stay internal. |
| Old avatar deletion | Uploading a new avatar deletes the previous avatar after the new avatar and DB update are successful. |
| Remove avatar deletion | Removing avatar deletes the current stored avatar object and sets profile avatar to null. |
| Profile save | Profile uses an explicit Save Profile button; it does not autosave text fields. |
| Profile propagation | Updated name/avatar appears anywhere the app currently shows user email, name, or profile identity. |
| Practice Settings | Practice Settings includes only the global Practice mode sequence. |
| Practice Settings validation | Practice mode sequence must include at least one unique mode from Dictation, Meaning -> Word, and Pronunciation. |
| Practice default | Default Practice sequence remains Dictation -> Meaning -> Word -> Pronunciation. |
| Review Settings | Review Settings includes only global review limit and recap-after-answer. |
| Review limit default | Review limit defaults to 300 words/day. |
| Review limit validation | Review limit must be 1-1000 words/day. |
| Recap setting | Recap-after-answer is a global boolean Review setting. |
| Settings autosave | Practice Settings and Review Settings autosave on change. |
| Autosave failure | Autosave failure shows an error and keeps the draft value visible so the user can retry or change it. |
| Password/security | Change Password and password/security links are out of scope and are not shown on this Settings page. |
| Storage fallback | No Cloudinary fallback is included after Feature 18. Local development uses real MinIO from Docker Compose. |

### 15.3 Settings Page Layout

The Settings page is one authenticated screen with three stacked sections:

1. **Profile**
   - Avatar preview/current avatar.
   - Upload/select avatar.
   - Remove avatar.
   - Name input.
   - Bio textarea.
   - Read-only email.
   - Save Profile button.
2. **Practice Settings**
   - Controls for selecting and ordering the global Practice mode sequence.
   - Modes: Dictation, Meaning -> Word, Pronunciation.
   - At least one mode must remain selected.
   - Changes autosave.
3. **Review Settings**
   - Review limit input: 1-1000 words/day, default 300.
   - Recap-after-answer toggle.
   - Changes autosave.

The page must not include Change Password, Forgot Password, or password-security
placeholder controls.

### 15.4 Profile Behavior

Profile editing is explicit-save, not autosave.

Save Profile flow:

1. Validate name and bio.
2. If a new avatar file is selected, validate MIME type and size before storage.
3. Make the new avatar durable through the current storage contract.
4. Update the database with name, bio, and the public avatar URL or linked
   asset reference.
5. If database update succeeds, delete the old avatar object when one exists.
6. If database update fails after new object upload, delete the newly uploaded
   object.
7. Return the updated profile with `avatarUrl`, but not provider object keys or
   asset internals.

Remove avatar flow:

1. User clicks Remove avatar.
2. UI marks avatar as null in the draft.
3. Save Profile deletes the existing stored avatar object and updates the
   profile avatar fields to null.
4. If deletion or DB update fails, the profile remains unchanged and the UI
   shows an error.

If avatar storage config is missing, invalid, or unavailable, any Profile save that
requires avatar upload must fail entirely and preserve the old profile/avatar.

### 15.5 Practice Settings Behavior

Practice Settings controls the global Practice mode sequence used by Feature
14. This setting applies to every Practice session.

Rules:

- The default sequence is Dictation -> Meaning -> Word -> Pronunciation.
- The user may choose one, two, or three modes.
- A mode may appear at most once.
- The user may reorder selected modes.
- Empty sequence is invalid.
- Unknown modes are invalid.
- This setting does not affect Review.
- Changes autosave independently from Profile and Review Settings.

Examples of valid sequences:

- Dictation
- Dictation -> Meaning -> Word
- Dictation -> Pronunciation
- Meaning -> Word -> Dictation -> Pronunciation

### 15.6 Review Settings Behavior

Review Settings controls the global Review defaults used by Feature 14.

Rules:

- `reviewLimitWordsPerDay` defaults to 300.
- `reviewLimitWordsPerDay` accepts only 1-1000.
- `recapAfterAnswer` is a global boolean.
- Review order type and Review mode remain session-level choices and are not
  stored in Settings.
- Changes autosave independently from Profile and Practice Settings.

### 15.7 API Expectations

Exact DTO names can be finalized during implementation planning. The public
capabilities must support:

| Method | Endpoint | Outcome |
|---|---|---|
| `GET` | `/api/v1/settings` | Return profile, Practice Settings, and Review Settings for the authenticated user. |
| `PUT` | `/api/v1/profile` | Update name, bio, `removeAvatar`, and optional finalized `avatarAssetId`, then return updated profile. |
| `PUT` | `/api/v1/practice/settings` | Autosave global Practice mode sequence. |
| `PUT` | `/api/v1/review/settings` | Autosave review limit and recap-after-answer. |

Profile update now uses JSON. Avatar file bytes do not go through
`PUT /api/v1/profile`; the frontend performs the Feature 18
`presign -> direct upload -> finalize -> profile save` flow and then sends the
finalized `avatarAssetId` to `PUT /api/v1/profile`.

### 15.8 Data And Configuration Expectations

Profile storage needs durable fields for:

| Field | Purpose |
|---|---|
| `name` | Display name, required 2-100 chars. |
| `bio` | Optional plain text bio, max 500 chars. |
| `avatarUrl` | Public avatar URL returned to clients. |
| `currentAvatarAssetId` | Internal link to the owned finalized avatar asset currently reflected by `avatarUrl`. |

Avatar storage configuration must come from environment variables, user-secrets,
Docker Compose development config, or equivalent secret storage. Tracked config
must not contain real production storage secrets.

Practice/Review settings may reuse the Feature 14 settings storage or extend it
as needed, but must remain user-scoped and lazily defaulted when no settings row
exists.

### 15.9 Scope Boundaries

Out of scope:

- Change Password.
- Forgot Password links or account security sections in Settings.
- Email change or email re-verification.
- Avatar cropper/editor.
- Cloudinary upload, Cloudinary fallback, or Cloudinary cleanup bridge after
  Feature 18.
- Local filesystem fallback avatar storage.
- Production/staging S3-compatible storage decisions.
- Rich text or Markdown bio.
- Practice default order type.
- Review default order type.
- Review default mode.
- Speech settings such as autoplay or replay count.

### 15.10 Risk And Validation Plan

| Risk | Required Proof Before Release |
|---|---|
| Avatar upload accepts unsafe files | Backend validation rejects unsupported MIME types and files over 2MB. |
| Storage failure corrupts profile | Tests prove failed config/upload/finalize leaves old profile/avatar unchanged. |
| DB failure leaks uploaded image | Tests or smoke proof verify newly uploaded storage object is deleted when DB update fails. |
| Avatar replacement loses old avatar | Tests prove old avatar is deleted only after new upload and DB update succeed. |
| Avatar removal leaves stale profile | Tests prove remove sets avatar null and deletes the stored object. |
| Secret leakage | Config/diff review proves production storage secrets are not tracked. |
| Practice setting invalid sequence | Unit/API tests reject empty, duplicate, or unknown Practice modes. |
| Autosave failure hides error | UI test proves failed autosave shows error and keeps draft visible. |
| Profile identity stale in UI | Frontend tests prove updated name/avatar propagate to Settings and existing user identity surfaces. |
| Review limit invalid values | Unit/API/UI tests reject values below 1 and above 1000. |

### 15.11 Proposed Story Queue

1. **US-SETTINGS-001:** Add Settings page shell with Profile, Practice Settings, and Review Settings sections.
2. **US-SETTINGS-002:** Implement profile fields, validation, and UI propagation for name/avatar/bio/email.
3. **US-SETTINGS-003:** Implement avatar upload, replacement, removal, cleanup, and secret-safe config. The original Cloudinary provider is superseded by Feature 18.
4. **US-SETTINGS-004:** Implement Practice Settings global mode sequence autosave and validation.
5. **US-SETTINGS-005:** Implement Review Settings review limit and recap-after-answer autosave and validation.
6. **US-SETTINGS-006:** Run release regression for auth profile, Feature 14 Practice/Review settings, avatar failure paths, and settings UI.

### 15.12 Verification Ladder

```powershell
dotnet test src/backend/FluentA.slnx
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run
npm --prefix src/frontend run build
npm --prefix src/frontend run test:e2e -- settings-profile.spec.js settings-learning.spec.js
.\scripts\bin\harness-cli.exe story verify <approved-story-id>
.\scripts\bin\harness-cli.exe query matrix
git diff --check
```

Planning may split proof by story. Release proof must include real configured
avatar storage behavior in the active development environment, plus
deterministic tests for validation and failure semantics.

---

## 16. Next Feature Plan — FluentA SRS Algorithm

**Planning status:** Product decisions locked for implementation planning

**Mode:** High-risk scheduling algorithm change

**Supersedes:** SM-2 scheduling for the Feature 14 Review workflow.

**Source of truth:** `history/fluenta-srs-algorithm/CONTEXT.md`

### 16.1 Desired Outcomes

- FluentA Review uses a deterministic level-based SRS algorithm with only
  `correct` and `wrong` outcomes.
- Practice can add newly practiced words to Review, but Practice itself does
  not force SRS creation unless the learner chooses **Add to Review**.
- Review never requires retry-until-correct. Each answer immediately updates
  the word's SRS state and moves on.
- The old SM-2 fields and rating mapping are replaced by FluentA SRS levels,
  next review date, lapse count, and review history.

### 16.2 Locked Product Rules

| Rule | Required Behavior |
|---|---|
| Algorithm name | The product algorithm is named `FluentA SRS`, not SM-2. |
| Outcomes | Review has only `correct` and `wrong`. No Easy/Good/Hard/Again buttons. |
| No retry | Review does not allow retry-until-correct. A wrong answer is recorded and the session moves on. |
| No early review | Review queue includes only words due today or overdue. Users cannot update SRS early. |
| Initial add | At the end of Practice, learner chooses `Finish` or `Add to Review`. |
| Finish behavior | `Finish` ends Practice without creating SRS state for words that do not already have it. |
| Add to Review behavior | `Add to Review` creates SRS state for every practiced word that does not already have SRS state. |
| Existing SRS during Add to Review | Words that already have SRS state are skipped and keep their current level and due date. |
| Initial level | New SRS state starts at Level 0. |
| Initial due date | New Level 0 words are due one day after Add to Review. |
| Correct transition | Correct answers advance one level until Level 5. |
| Level 5 correct | Correct at Level 5 keeps Level 5 and schedules another review 60 days later. |
| Wrong transition | Wrong at any level resets or keeps the word at Level 0 and schedules review one day later. |
| Lapse count | Wrong at Level 1 through Level 5 increments `lapseCount`; wrong at Level 0 does not increment `lapseCount`. |
| Late review | If a word is overdue and answered correct, the next interval is calculated from the actual review date. |
| State fields | SRS state uses `level`, `nextReviewDate`, and `lapseCount`; it does not use `interval`, `easeFactor`, or `repetitions`. |
| Review history | Each Review answer stores `wordId`, `reviewedAt`, result, `levelBefore`, `levelAfter`, and `nextReviewDate`. |
| History interval | Review history does not store `nextIntervalDays` in MVP. |

### 16.3 Level Schedule

FluentA SRS uses these level transitions:

| Current level at review | Correct result | Next review date |
|---:|---:|---:|
| New Add to Review event | Level 0 | +1 day |
| 0 | Level 1 | +2 days |
| 1 | Level 2 | +4 days |
| 2 | Level 3 | +14 days |
| 3 | Level 4 | +39 days |
| 4 | Level 5 | +60 days |
| 5 | Level 5 | +60 days |

The `+N days` interval is always calculated from the actual event date:

- For Add to Review, event date is the date the learner clicks Add to Review.
- For Review, event date is the date the learner answers the due word.
- If the word is overdue and answered correct, the next due date still uses the
  actual review date, not the original missed due date.

### 16.4 Examples

Happy path:

```text
01/07: Practice finished, Add to Review
  -> Level 0, due 02/07

02/07: Level 0 review correct
  -> Level 1, due 04/07

04/07: Level 1 review correct
  -> Level 2, due 08/07

08/07: Level 2 review correct
  -> Level 3, due 22/07

22/07: Level 3 review correct
  -> Level 4, due 30/08

30/08: Level 4 review correct
  -> Level 5, due 29/10

29/10: Level 5 review correct
  -> Level 5, due 28/12
```

Wrong answer:

```text
08/07: Level 2 review wrong
  -> Level 0, due 09/07
  -> lapseCount increments by 1

09/07: Level 0 review wrong
  -> Level 0, due 10/07
  -> lapseCount does not increment

10/07: Level 0 review correct
  -> Level 1, due 12/07
```

Late review:

```text
04/07: Level 1 word was due
10/07: Learner reviews it late and answers correct
  -> Level 2, due 14/07
```

### 16.5 Practice Integration

Practice no longer automatically creates SRS state at full session completion.
At the end of Practice, the learner sees:

- **Finish**: exits Practice without adding new words to Review.
- **Add to Review**: creates Level 0 SRS state due tomorrow for all practiced
  words that do not already have SRS state.

Rules:

- Add to Review skips words that already have SRS state.
- Re-practicing a word does not reset SRS.
- Practice completion still has its own UI/session summary, but scheduling only
  changes when Add to Review is chosen for words without SRS state.

### 16.6 Data Model Expectations

Review state fields:

| Field | Purpose |
|---|---|
| `id` | Review state id. |
| `userId` | Owner. |
| `wordId` | Linked vocabulary word. |
| `level` | Integer 0-5. |
| `nextReviewDate` | Next due date. |
| `lapseCount` | Number of wrong answers at Level 1-5. |
| `lastReviewedAt` | Last Review answer timestamp. |
| `createdAt` / `updatedAt` | Standard timestamps. |

Review history fields:

| Field | Purpose |
|---|---|
| `id` | History id. |
| `userId` | Owner. |
| `wordId` | Linked vocabulary word. |
| `reviewedAt` | Review answer timestamp. |
| `result` | `correct` or `wrong`. |
| `levelBefore` | Level before answer. |
| `levelAfter` | Level after answer. |
| `nextReviewDate` | Due date after applying the answer. |

Removed or unused scheduling fields:

- `interval`
- `easeFactor`
- `repetitions`
- `ReviewRating`

Planning may retain legacy columns temporarily only as a migration bridge, but
the FluentA SRS behavior must not depend on them.

### 16.7 API Expectations

Exact DTO names can be finalized during implementation planning. The public
capabilities must support:

| Method | Endpoint | Outcome |
|---|---|---|
| `POST` | `/api/v1/practice/add-to-review` | Add practiced words without SRS state to Level 0, due tomorrow. |
| `POST` | `/api/v1/review` | Apply one correct/wrong answer through FluentA SRS and persist history. |
| `POST` | `/api/v1/review/sessions` | Build due Review queue using words due before the end of the learner's local day. |

All endpoints are authenticated and owner-scoped. Foreign, deleted, or
non-due words must be rejected for review answer updates.

### 16.8 Scope Boundaries

Out of scope:

- Easy/Good/Hard/Again ratings.
- SM-2 `easeFactor`, `interval`, or `repetitions` scheduling.
- Fuzzy scoring or confidence-weighted interval changes.
- Early review that mutates SRS before due date.
- Per-mode interval adjustments.
- Storing `nextIntervalDays` in review history.
- Auto-adding Practice words to Review without user choosing Add to Review.

### 16.9 Risk And Validation Plan

| Risk | Required Proof Before Release |
|---|---|
| Off-by-one level transition | Unit tests cover every correct transition from Level 0 through Level 5. |
| Wrong answer reset bug | Unit tests prove wrong at every level resets to Level 0 and schedules +1 day. |
| Lapse count drift | Tests prove wrong at Level 1-5 increments lapseCount and wrong at Level 0 does not. |
| Late review miscalculation | Tests prove correct answers use actual review date for next due date. |
| Early review mutation | API/integration tests reject non-due review answer updates. |
| Legacy SM-2 leakage | Tests and code review prove FluentA SRS does not use easeFactor, interval, repetitions, or ReviewRating. |
| Practice auto-add regression | E2E/API tests prove Finish does not create SRS and Add to Review creates only missing SRS states. |
| History audit gap | Tests prove each Review answer writes the required history fields. |

### 16.10 Proposed Story Queue

1. **US-SRS-001:** Replace SM-2 state with FluentA SRS level state and review history schema.
2. **US-SRS-002:** Implement deterministic FluentA SRS transition service and unit tests.
3. **US-SRS-003:** Update Practice finish/Add to Review behavior.
4. **US-SRS-004:** Update Review answer persistence to use FluentA SRS and write history.
5. **US-SRS-005:** Update Review queue validation to reject early/non-due SRS mutation.
6. **US-SRS-006:** Run release regression for Practice, Review, settings, and dashboard/reporting impacts.

### 16.11 Verification Ladder

```powershell
dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj --filter FluentASrs
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --filter Review
dotnet test src/backend/FluentA.slnx
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run
npm --prefix src/frontend run build
npm --prefix src/frontend run test:e2e -- practice-workflow.spec.js review-workflow.spec.js
.\scripts\bin\harness-cli.exe story verify <approved-story-id>
.\scripts\bin\harness-cli.exe query matrix
git diff --check
```

Planning may split proof by story. Release proof must cover all level
transitions, wrong-answer reset behavior, late review scheduling, Practice Add
to Review behavior, and removal of legacy SM-2 scheduling from the Review path.

---

## 17. Next Feature Plan — Database Performance Optimization

**Planning status:** Candidate feature for high-risk implementation planning

**Mode:** High-risk maintenance initiative for PostgreSQL query performance,
index strategy, connection stability, and database observability.

**Supabase Postgres guidance applied:** prioritize query performance,
connection management, schema/index design, concurrency, data access patterns,
and monitoring before advanced database changes.

**Depends on:** Current PostgreSQL 16, EF Core persistence, Hangfire PostgreSQL
storage, Redis-only transient state, and the existing owner-scoped API contract.

### 17.1 Desired Outcomes

- FluentA's growing tables keep interactive API paths under the existing p95
  target of 300ms for representative local and staging workloads.
- Hot read paths use intentional PostgreSQL indexes that match real `WHERE`,
  `JOIN`, `ORDER BY`, and soft-delete filters.
- Slow-query work is driven by `pg_stat_statements` and
  `EXPLAIN (ANALYZE, BUFFERS)` evidence, not guesswork.
- EF Core repositories avoid N+1 query patterns, unnecessary tracking, deep
  offset scans, and broad in-memory filtering on growing datasets.
- Connection usage stays stable under API plus Hangfire concurrency and does
  not exhaust PostgreSQL connections.
- Database optimization does not change product behavior, data ownership,
  authorization boundaries, or API response contracts.

### 17.2 Locked Engineering Rules

| Rule | Required Behavior |
|---|---|
| Evidence first | Every index or query rewrite must cite a baseline query plan, slow-query metric, or known high-growth access path. |
| Owner scope first | User-owned queries must continue filtering by authenticated owner before returning data. |
| FK index coverage | Every high-use foreign key used for joins, ownership checks, cascades, or deletes must have an index on the referencing side. |
| Composite index order | Composite indexes place equality columns first, then range/filter columns, then sort columns when supported by the access pattern. |
| Soft-delete filtering | Hot queries that always exclude deleted rows prefer partial indexes such as `WHERE deleted_at IS NULL` over bloated full indexes when the predicate is stable. |
| Covering indexes | `INCLUDE` columns are allowed only for proven read-heavy hot paths where index-only scans materially reduce heap fetches. |
| Index type fit | B-tree remains the default; GIN/trigram/full-text indexes are used only for search patterns that need them. |
| Short transactions | Transactions must hold locks only around database work; no external provider calls or long-running application work occur inside a database transaction. |
| Safe migrations | Large-table indexes need production-safe migration planning, including concurrent index creation where required and rollback notes. |
| Behavior preservation | No feature may rely on a faster query by weakening validation, ownership filtering, soft deletion, or consistency rules. |

### 17.3 Target Surfaces

Optimization planning starts with the current high-growth and high-frequency
tables:

| Area | Tables / Paths | Expected Optimization Focus |
|---|---|---|
| Review and dashboard | `word_review_states`, `word_review_histories`, `flashcard_cards`, `flashcard_decks`, `vocab_words`, `vocab_pages`, `vocab_boards` | Due queue, review answer ownership check, dashboard aggregation, review history summaries. |
| Vocabulary workspace | `vocab_boards`, `vocab_pages`, `vocab_words`, `vocab_custom_columns`, `vocab_custom_values`, `vocab_column_visibility` | Board/page loading, selected-page word table, custom value lookup, cell autosave synchronization. |
| Productivity workflows | `todo_items`, `habits`, `habit_entries`, `countdown_events`, `notifications`, `pomodoro_sessions` | Date-range lists, carry-over jobs, reminder jobs, notification inbox, Pomodoro history. |
| Journal | `journal_entries` | Newest-first list, learning-date calendar, Unicode search. |
| Kanban | `kanban_boards`, `kanban_columns`, `kanban_cards` | Board loading, column/card ordering, soft-deleted exclusion. |
| Runtime storage | EF Core `AppDbContext`, Npgsql pool, Hangfire PostgreSQL storage | Connection pool limits, Hangfire worker impact, statement timeout, migration safety. |

Planning may reorder these surfaces after the first slow-query baseline. The
Review, Vocabulary, Todo/Habit, Journal, Kanban, Pomodoro, Notification, and
Hangfire paths must remain independently measurable.

### 17.4 Performance Baseline Requirements

Before implementation, create a baseline report for a representative database
with enough data to expose non-trivial plans. The report must include:

1. Top queries by total time and mean time from `pg_stat_statements`.
2. Top high-call-count queries from `pg_stat_statements`.
3. `EXPLAIN (ANALYZE, BUFFERS)` for the highest-risk API paths.
4. Missing foreign-key index query output.
5. Current index list for target tables and approximate index sizes.
6. Current connection counts grouped by state while API and Hangfire are
   running.
7. Current table statistics freshness from `pg_stat_user_tables`.

Baseline artifacts belong in the approved story packet or validation report,
not only in terminal output.

### 17.5 Query And Index Expectations

The implementation should use EF Core migrations and explicit raw SQL only
when the migration needs PostgreSQL-specific behavior that EF cannot express.

Required index analysis:

| Pattern | Required Evaluation |
|---|---|
| Owner/date filters | Composite indexes for `user_id` plus date/range columns used by Todo, Habit, Journal, Pomodoro, Notification, and Review paths. |
| Due review queue | Indexes that support owner/board scoping, due-date filtering, and deterministic ordering without scanning all review states. |
| Page word loading | Indexes that support `page_id`, active rows, created order, and custom-value lookup by word ids. |
| Soft-deleted rows | Partial indexes for hot active-row queries where `deleted_at IS NULL` is always present. |
| Unique lazy defaults | Unique indexes for one-row-per-user settings/config tables must continue supporting concurrent default creation. |
| Search | Existing Journal search must remain backed by the correct search index type; any future broad search must choose trigram or full-text indexes based on query semantics. |
| Cascades and cleanup | FK-side indexes must protect delete, soft-delete, and cleanup jobs from full scans. |

Indexes are rejected when they duplicate an existing useful index, optimize a
non-hot query at write-cost expense, or only hide an inefficient data access
pattern that should be fixed in the repository.

### 17.6 EF Core Data Access Expectations

Repository work must prefer:

- Projection queries that fetch only the columns needed by the API DTO.
- `AsNoTracking()` for read-only paths.
- Batch loading with `Contains`/joins instead of per-row follow-up queries.
- Server-side grouping, counting, and filtering when the result set can grow.
- Keyset/cursor pagination for growing history or inbox feeds instead of deep
  `Skip`/`Take` pagination.
- Bounded result sizes for search, history, dashboard, and notification views.
- Stable ordering that matches the supporting index.

Repository work must avoid:

- Loading whole user domains into memory only to count, filter, or sort them.
- Hidden N+1 loops behind navigation properties.
- Query changes that remove owner checks or deleted-row filters.
- Client-side randomness on large due queues before a server-side limit has
  reduced the candidate set.

### 17.7 Connection And Operations Expectations

Connection work must account for both HTTP request traffic and Hangfire workers.

Required planning decisions:

| Concern | Requirement |
|---|---|
| Npgsql pooling | Define app-side pool settings appropriate for local, staging, and production instead of relying on accidental defaults. |
| PostgreSQL limits | Document expected `max_connections`, reserved operational connections, and app/Hangfire pool budgets. |
| Pooler strategy | If deploying through Supabase or another managed Postgres environment, use the provider's recommended connection pooler for high concurrency. |
| Timeouts | Add or document statement/command timeout expectations for runaway queries without breaking valid migrations. |
| Hangfire | Confirm Hangfire storage and worker concurrency do not starve normal API queries. |
| Maintenance | Document autovacuum/analyze expectations for high-churn tables and run `ANALYZE` after large migrations or seed loads. |

### 17.8 Scope Boundaries

Out of scope:

- Product workflow redesign.
- Public API shape changes.
- New user-visible settings or admin screens.
- Database sharding or bounded-context database split.
- Replacing EF Core as the main application persistence layer.
- Adding PostgreSQL Row-Level Security without a separate architecture decision.
- Moving durable product data into Redis.
- Changing soft-delete retention rules.
- Production tuning based on unsanitized production data copied into local
  artifacts.
- Blindly adding indexes to every foreign key or column without measured or
  growth-path justification.

### 17.9 Risk And Validation Plan

| Risk | Required Proof Before Release |
|---|---|
| Index does not match query shape | `EXPLAIN (ANALYZE, BUFFERS)` proves the intended index is used on representative data. |
| Duplicate or unused indexes slow writes | Index inventory and `pg_stat_user_indexes` review show no obvious duplicate/unused additions after validation. |
| Soft-delete partial index misses queries | Tests and query plans prove active-row queries include `deleted_at IS NULL` where required. |
| FK scans block cleanup or deletes | Missing-FK-index query returns no unresolved high-use FK gaps for target tables. |
| Migration locks production tables | Large-table migration plan uses concurrent index creation or an approved maintenance-window strategy. |
| EF rewrite changes behavior | Existing unit/integration/E2E tests for affected product paths still pass. |
| Owner isolation regression | API/integration tests continue proving foreign-user and deleted-resource non-disclosure. |
| Dashboard or review queues still overfetch | Query plans and repository tests prove server-side filtering/limits before materialization. |
| Connection exhaustion | Load or smoke proof shows API plus Hangfire stay within the documented connection budget. |
| Stale planner statistics | Validation records `ANALYZE` or autovacuum evidence after large data changes. |

### 17.10 Proposed Story Queue

1. **US-DBOPT-001:** Capture PostgreSQL performance baseline with
   `pg_stat_statements`, index inventory, connection usage, FK-index audit, and
   `EXPLAIN (ANALYZE, BUFFERS)` for the highest-risk API paths.
2. **US-DBOPT-002:** Add or refine indexes for Review, Flashcard dashboard,
   and Vocabulary workspace hot paths.
3. **US-DBOPT-003:** Add or refine indexes for Todo, Habit, Countdown,
   Notification, Journal, Kanban, and Pomodoro hot paths.
4. **US-DBOPT-004:** Rewrite EF Core repository queries that overfetch, track
   read-only entities, perform N+1 loading, or paginate growing feeds with deep
   offsets.
5. **US-DBOPT-005:** Define Npgsql, Hangfire, and PostgreSQL connection budget
   settings for local/staging/production.
6. **US-DBOPT-006:** Run release proof comparing baseline vs optimized query
   plans, API timings, integration tests, and Harness matrix evidence.

### 17.11 Verification Ladder

```powershell
docker compose -f docker-compose.dev.yml up -d
dotnet tool restore
dotnet tool run dotnet-ef database update `
  --project src/backend/FluentA.Infrastructure `
  --startup-project src/backend/FluentA.API
dotnet test src/backend/FluentA.slnx
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run
npm --prefix src/frontend run build
.\scripts\bin\harness-cli.exe story verify <approved-story-id>
.\scripts\bin\harness-cli.exe query matrix
git diff --check
```

Database-specific proof must additionally include saved SQL or report artifacts
for:

- `pg_stat_statements` top total-time, mean-time, and call-count queries.
- `EXPLAIN (ANALYZE, BUFFERS)` before and after each optimized hot path.
- Missing foreign-key index audit.
- Index size and duplicate-index review.
- Connection usage while API and Hangfire are both running.
- Table statistics freshness after migrations or representative seed loading.

Planning may split verification by story. Release proof must compare measured
baseline and optimized results, and must state any query that was inspected but
intentionally left unchanged.

---

## 18. Next Feature Plan — MinIO Asset Storage

**Planning status:** Product decisions locked for high-risk implementation
planning

**Mode:** High-risk platform and account-storage initiative

**Depends on:** Feature 15 profile/avatar behavior, current Auth ownership
rules, PostgreSQL durable metadata, Hangfire background jobs, and local Docker
Compose development runtime.

**Source of truth:** `history/minio-asset-storage/CONTEXT.md`

### 18.1 Desired Outcomes

- FluentA has a shared, user-owned asset storage foundation backed by MinIO in
  local development.
- Avatar is the first user-facing use case for the asset foundation.
- Existing Cloudinary avatar storage is removed from the avatar flow.
- Future asset use cases such as vocabulary images, journal images, habit icons,
  countdown icons, and attachments can extend the same asset model later.
- Frontend upload uses presigned URLs so browser upload traffic goes directly
  to MinIO without exposing MinIO secrets to the client.
- Asset metadata in PostgreSQL records ownership, type, object key, public URL,
  content type, size, lifecycle state, and soft deletion.
- Pending uploads are finalized explicitly and cleaned up if abandoned.

### 18.2 Locked Product And Engineering Rules

| Rule | Required Behavior |
|---|---|
| Asset foundation | MinIO is introduced as a shared asset storage foundation, not an avatar-only patch. |
| First user-facing scope | Only profile avatar behavior changes in the first delivery. Other product asset surfaces are deferred. |
| Existing Cloudinary avatars | Existing Cloudinary avatars are not migrated or preserved. Users may need to upload avatars again. |
| Cloudinary removal | Cloudinary is removed from the avatar flow with no fallback and no cleanup bridge. |
| Local development | `docker-compose.dev.yml` runs MinIO with a default development bucket. |
| Production decision | Staging and production storage provider strategy is not decided by this feature. |
| Avatar visibility | Avatar assets are public-read and exposed to the frontend by public URL. |
| Upload model | Browser uploads use presigned URLs issued by FluentA. The frontend never receives MinIO secrets. |
| Finalize model | Upload uses two steps: presign, direct upload to MinIO, then backend finalize. |
| Pending expiry | Pending avatar uploads expire after 1 hour. |
| Pending cleanup | A cleanup job deletes expired pending objects that were uploaded but not finalized. |
| Finalize verification | Backend finalize verifies object existence, user/pending key ownership, content type, and size through MinIO object metadata. |
| Content validation | Avatar accepts only JPG, PNG, and WebP, with a maximum size of 2MB. |
| Asset ownership | Initial asset records are user-owned only. System/global assets are deferred. |
| Asset type | `assetType` is a controlled enum/domain type. Initial allowed value is `avatar`. |
| Asset metadata | Metadata stores both object key and public URL. Object key is used for management/deletion; public URL is returned to clients. |
| Shared asset API | Presign and finalize use a shared asset API, for example `/api/v1/assets/presign` and `/api/v1/assets/finalize`, with `assetType=avatar`. |
| Asset API scope | The first asset API includes presign, finalize, list, and delete, but only supports `avatar`. |
| Current avatar delete | Deleting the asset currently used as profile avatar also clears profile avatar to null. |
| Avatar replacement cleanup | Finalizing a new avatar deletes the old MinIO object and soft-deletes old asset metadata. |
| Old object deletion order | Replacing or removing an avatar deletes the old object only after the database update succeeds. |
| New object rollback | If upload succeeds but database update/finalize fails, the backend deletes the new object and preserves the old profile/avatar. |

### 18.3 Asset Lifecycle

Presigned upload flow:

1. Authenticated frontend requests a presigned upload URL from the asset API with
   `assetType=avatar`, file name, content type, and size.
2. Backend validates owner, asset type, content type, and size, creates a
   pending asset record or pending upload token, and returns a presigned MinIO
   upload URL plus object key/pending id.
3. Frontend uploads the object directly to MinIO using the presigned URL.
4. Frontend calls the asset finalize endpoint.
5. Backend verifies the MinIO object with a metadata/`HEAD` check.
6. Backend marks the new asset finalized, updates the authenticated user's
   profile avatar, returns the new public `avatarUrl`, and then deletes the old
   avatar object plus soft-deletes old metadata when replacement applies.

Abandoned upload flow:

1. Backend has issued a pending upload.
2. Frontend never calls finalize, or finalize fails before the asset is made
   current.
3. A cleanup job deletes pending objects older than 1 hour and marks the
   metadata expired or deleted.

Delete flow:

1. Authenticated user calls the asset delete endpoint for one of their assets.
2. Backend verifies ownership and asset state.
3. If the asset is the current profile avatar, backend clears the profile avatar
   first.
4. Backend deletes the MinIO object after the database update succeeds and
   soft-deletes the asset metadata.

### 18.4 Data Model Expectations

Planning may finalize exact entity and column names, but durable asset metadata
must support:

| Field | Purpose |
|---|---|
| `id` | Asset metadata id. |
| `userId` | Owner. Required in the first delivery. |
| `assetType` | Controlled enum/domain type; initial value `avatar`. |
| `objectKey` | MinIO object key used for management and deletion. |
| `publicUrl` | Public URL returned to clients for avatar display. |
| `contentType` | Stored content type, restricted to allowed avatar image types. |
| `sizeBytes` | Stored object size, restricted to 2MB for avatar. |
| `status` | Pending, finalized/current, expired, or deleted lifecycle state. |
| `expiresAt` | Pending upload expiry timestamp. Required for cleanup. |
| `createdAt` / `updatedAt` | Standard timestamps. |
| `deletedAt` | Soft-delete timestamp for metadata history. |

The profile response still returns `avatarUrl` only. Provider object keys,
bucket names, presigned URLs, and asset metadata internals must not leak through
normal profile DTOs.

### 18.5 API Expectations

Exact DTO names can be finalized during implementation planning. The public
capabilities must support:

| Method | Endpoint | Outcome |
|---|---|---|
| `POST` | `/api/v1/assets/presign` | Authenticated user requests a presigned upload URL for `assetType=avatar`. |
| `POST` | `/api/v1/assets/finalize` | Authenticated user finalizes a pending avatar object after direct upload. |
| `GET` | `/api/v1/assets` | Authenticated user lists their asset metadata; initial supported type is `avatar`. |
| `DELETE` | `/api/v1/assets/{id}` | Authenticated user deletes one of their assets; deleting current avatar clears profile avatar. |
| `GET` | `/api/v1/settings` | Returns profile with current `avatarUrl` after Feature 18 is implemented. |
| `PUT` | `/api/v1/profile` | Continues to update name and bio; avatar changes consume finalized asset behavior rather than Cloudinary file upload. |

All asset API endpoints are authenticated and owner-scoped. Foreign assets,
deleted assets, expired pending uploads, and unsupported asset types must be
rejected without disclosing cross-user data.

### 18.6 Local Development Configuration

Local development must include:

- MinIO service in `docker-compose.dev.yml`.
- A default development bucket for FluentA assets.
- Secret-safe local credentials suitable only for development.
- API configuration for MinIO endpoint, bucket, access key, secret key, and
  public base URL.
- Startup or bootstrap instructions that make the default bucket available
  before avatar upload proof runs.

Tracked files must not contain production MinIO, S3, or storage-provider
secrets. Staging and production provider choice remains out of scope.

### 18.7 Scope Boundaries

Out of scope:

- Migrating, copying, or preserving existing Cloudinary avatars.
- Keeping Cloudinary as fallback or cleanup bridge.
- Vocabulary images.
- Journal images or attachments.
- Habit or Countdown icon file uploads.
- System/global assets.
- Private asset reads, backend image proxying, or signed read URLs.
- Avatar cropper/editor.
- GIF, SVG, files larger than 2MB, or non-image avatar uploads.
- Backend downloading the image body to verify actual image signatures in the
  first delivery.
- Production/staging storage provider decision.
- CDN integration.
- Virus scanning or moderation.

### 18.8 Risk And Validation Plan

| Risk | Required Proof Before Release |
|---|---|
| Presigned upload exposes secrets | Config/diff review proves MinIO secrets stay server-side and responses expose only presigned URLs scoped to the pending object. |
| User uploads unsupported file | API tests reject unsupported content types and files over 2MB before issuing presigned URLs and during finalize metadata checks. |
| Foreign user finalizes or deletes asset | API/integration tests prove owner scoping for presign, finalize, list, and delete. |
| Pending uploads accumulate | Job or integration proof shows pending objects older than 1 hour are deleted and metadata is expired/deleted. |
| Finalize trusts frontend object key | Tests prove finalize accepts only pending object keys issued to the authenticated user. |
| DB failure leaks new object | Tests or smoke proof verify uploaded objects are deleted when finalize/database update fails. |
| Avatar replacement loses old avatar too early | Tests prove old object deletion happens only after new asset/profile DB update succeeds. |
| Deleting current avatar leaves broken profile | Tests prove deleting the current avatar asset clears profile avatar to null. |
| Cloudinary code remains active | Build/config review proves Cloudinary avatar flow, fallback, and dependency wiring are removed or unreachable. |
| Public URL is wrong in local dev | Browser/API smoke proves a finalized avatar public URL renders from local MinIO. |
| Asset metadata expands unsafely | Domain/API tests prove only controlled `avatar` asset type is accepted in the first delivery. |

### 18.9 Proposed Story Queue

1. **US-ASSET-001:** Add local MinIO development runtime, bucket bootstrap, and
   secret-safe API configuration.
2. **US-ASSET-002:** Add user-owned asset metadata model, migration, repository,
   and controlled `avatar` asset type.
3. **US-ASSET-003:** Implement presign and finalize asset API for avatar with
   owner scope, metadata validation, and public URL generation.
4. **US-ASSET-004:** Replace Cloudinary avatar flow with MinIO asset finalize,
   profile avatar update, old object cleanup, and rollback behavior.
5. **US-ASSET-005:** Implement asset list/delete API and expired pending upload
   cleanup job.
6. **US-ASSET-006:** Run release proof for MinIO local upload/render, profile
   propagation, cleanup, failure paths, and Cloudinary removal.

### 18.10 Verification Ladder

```powershell
docker compose -f docker-compose.dev.yml up -d
dotnet tool restore
dotnet tool run dotnet-ef database update `
  --project src/backend/FluentA.Infrastructure `
  --startup-project src/backend/FluentA.API
dotnet test src/backend/FluentA.slnx
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run
npm --prefix src/frontend run build
npm --prefix src/frontend run test:e2e -- settings-profile.spec.js
.\scripts\bin\harness-cli.exe story verify <approved-story-id>
.\scripts\bin\harness-cli.exe query matrix
git diff --check
```

Planning may split proof by story. Release proof must include live local MinIO
presign/upload/finalize/render behavior, expired pending cleanup evidence,
owner-isolation checks, avatar replacement/delete rollback checks, and evidence
that Cloudinary avatar wiring is removed or unreachable.

---

## 19. Next Feature Plan — FluentA Worker Runtime

**Planning status:** Product and runtime decisions locked for high-risk
implementation planning

**Mode:** High-risk architecture/runtime refactor for recurring and future
background jobs

**Depends on:** Current Hangfire PostgreSQL storage, `IScheduledProductivityJobs`,
existing recurring job IDs, Feature 18 pending asset cleanup, current
PostgreSQL/Redis/MinIO local runtime, and the API/realtime composition root.

**Source of truth:** `history/fluent-worker-runtime/CONTEXT.md`

### 19.1 Current State

Hangfire currently runs inside the `FluentA.API` process. API startup wires the
Hangfire server, registers recurring jobs, exposes HTTP controllers, and hosts
SignalR. The recurring jobs are implemented through Application and
Infrastructure contracts, but the runtime owner is still the API process.

Current recurring jobs:

| Job id | Cron | Behavior |
|---|---|---|
| `todo-carry-over` | `5 0 * * *` | Carry overdue incomplete todos into the current day. |
| `habit-reminders` | `0 20 * * *` | Create notifications for unchecked scheduled habits. |
| `countdown-alerts` | `*/5 * * * *` | Create countdown-complete notifications and mark alerted countdowns. |
| `pending-asset-cleanup` | `15 * * * *` | Retire expired pending asset uploads. |
| `database-cleanup` | `0 2 * * 0` | Permanently delete selected product records soft-deleted for more than 30 days. |

### 19.2 Desired Outcomes

- `FluentA.Worker` exists as a separate .NET project at
  `src/backend/FluentA.Worker`.
- API no longer starts a Hangfire server and no longer registers recurring job
  schedules.
- Worker owns Hangfire server execution and recurring job registration.
- All existing recurring jobs run from the Worker with the same IDs, cron
  expressions, and behavior.
- Worker exposes minimal health endpoints for local and operational checks.
- API remains independently startable when Worker is offline.
- The feature prepares the architecture for future one-off/background jobs
  without implementing a new enqueue use case.

### 19.3 Locked Rules

| Rule | Required Behavior |
|---|---|
| Worker process | `FluentA.Worker` is a real separate process, not only a folder or namespace refactor. |
| API ownership | `FluentA.API` does not run Hangfire server and does not register recurring jobs after this feature. |
| Job migration | All current recurring jobs move to Worker ownership: todo carry-over, habit reminders, countdown alerts, pending asset cleanup, and database cleanup. |
| Registration owner | Worker owns recurring job registration and updates schedules on startup. |
| Job implementation location | Existing job implementation remains in Application/Infrastructure. Worker is a composition root and does not contain business/job logic. |
| Hangfire storage | Keep existing Hangfire PostgreSQL storage. Do not split Hangfire to a separate database/schema in this feature. |
| No broker replacement | Do not replace Hangfire with RabbitMQ, Kafka, SQS, Azure Service Bus, or another queue/broker. |
| API startup independence | API starts normally when Worker is not running; only recurring/background jobs stop executing. |
| Future job posture | Worker is the intended executor for future one-off/background jobs, but this feature does not add a new enqueue use case. |
| Health endpoints | Worker exposes `/health/live` for liveness and `/health/ready` for readiness. |
| Readiness checks | `/health/ready` verifies at least PostgreSQL/Hangfire storage reachability. |
| Dashboard | Do not expose Hangfire dashboard in this feature. |
| Local command | Local dev supports `dotnet run --project src/backend/FluentA.Worker`. |
| Docker Compose | Local Docker Compose includes a Worker service. |
| Local ports | API keeps port `5000`; Worker uses a separate local health port such as `5001`. |

### 19.4 Runtime Shape

Target local/runtime shape:

```text
React SPA
  -> FluentA.API
       - REST controllers
       - SignalR hub
       - auth and request logging
       - no Hangfire server
       - no recurring job registration

FluentA.Worker
  -> Hangfire server
  -> recurring job registration
  -> Application/Infrastructure job services
  -> health endpoints

PostgreSQL
  -> product data
  -> Hangfire storage

Redis
  -> refresh sessions
  -> Pomodoro transient state
```

### 19.5 Worker Responsibilities

Worker must:

- Configure the same application/infrastructure dependencies needed by scheduled
  jobs.
- Start Hangfire server with configured worker count.
- Register or update stable recurring jobs on startup.
- Keep existing recurring job IDs and cron expressions unless planning records a
  separate product decision.
- Emit structured logs for startup, recurring registration, job execution, and
  health/readiness failures.
- Expose `/health/live` and `/health/ready` on the worker health port.

Worker must not:

- Own HTTP product APIs.
- Own SignalR hub behavior.
- Contain job business logic that belongs in Application/Infrastructure.
- Expose Hangfire dashboard.
- Introduce a new external message broker.

### 19.6 API Responsibilities After Refactor

API must:

- Continue serving REST controllers and SignalR.
- Continue using shared application/infrastructure services needed by request
  flows.
- Start successfully when Worker is offline.
- Avoid direct Hangfire package/runtime references unless planning proves an
  unavoidable compile-time bridge that does not start server or register jobs.

API must not:

- Call recurring job registration at startup.
- Start Hangfire server.
- Host recurring background job execution.

### 19.7 Local Development Expectations

Local development must support both modes:

```powershell
dotnet run --project src/backend/FluentA.API --launch-profile http
dotnet run --project src/backend/FluentA.Worker
```

Docker Compose must also support running the local Worker service alongside
PostgreSQL, Redis, MinIO, and API-related dependencies. The API keeps its local
HTTP port at `5000`; the Worker maps a separate health port such as `5001`.

### 19.8 Scope Boundaries

Out of scope:

- Hangfire dashboard.
- Admin UI for jobs.
- Replacing Hangfire.
- Separate Hangfire database/schema.
- New user-visible product behavior.
- New API enqueue endpoint for one-off jobs.
- Moving job implementation/business logic into `FluentA.Worker`.
- Production deployment automation beyond documenting the intended separate
  worker process.
- New message broker or outbox implementation.

### 19.9 Risk And Validation Plan

| Risk | Required Proof Before Release |
|---|---|
| API still starts Hangfire | Code/build review proves API no longer starts Hangfire server or registers recurring jobs. |
| Worker fails to register jobs | Integration or live smoke proves Worker startup registers all five stable recurring job IDs with expected cron expressions. |
| Job behavior changes during move | Existing job unit/integration tests continue passing and at least one live Worker smoke proves scheduled service execution path. |
| API depends on Worker availability | Smoke proof starts API without Worker and verifies REST/OpenAPI or an authenticated API path still responds. |
| Worker cannot reach storage | `/health/ready` fails when PostgreSQL/Hangfire storage is unavailable and succeeds when it is reachable. |
| Health endpoint gives false signal | `/health/live` and `/health/ready` are tested separately. |
| Duplicate execution | Local proof verifies only Worker owns Hangfire server; API does not run a competing server. |
| Docker Compose drift | `docker compose -f docker-compose.dev.yml config` and local startup proof include Worker service and health port. |
| Dashboard exposed accidentally | Route/config review proves Hangfire dashboard is not mapped. |

### 19.10 Proposed Story Queue

1. **US-WORKER-001:** Create `src/backend/FluentA.Worker`, wire shared
   configuration, dependencies, logging, and health endpoints.
2. **US-WORKER-002:** Move Hangfire server startup and recurring job
   registration from API to Worker while preserving job IDs and cron schedules.
3. **US-WORKER-003:** Remove API Hangfire runtime ownership and prove API starts
   independently without Worker.
4. **US-WORKER-004:** Add local Docker Compose Worker service and development
   runbook updates.
5. **US-WORKER-005:** Run release proof for Worker health, recurring
   registration, API independence, no dashboard exposure, and existing job
   behavior.

### 19.11 Verification Ladder

```powershell
docker compose -f docker-compose.dev.yml config
dotnet build src/backend/FluentA.Worker/FluentA.Worker.csproj --no-restore
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
dotnet test src/backend/FluentA.slnx
dotnet run --project src/backend/FluentA.Worker
dotnet run --project src/backend/FluentA.API --launch-profile http
.\scripts\bin\harness-cli.exe story verify <approved-story-id>
.\scripts\bin\harness-cli.exe query matrix
git diff --check
```

Release proof must show the Worker registers all existing recurring jobs,
`/health/live` and `/health/ready` behave distinctly, API can start without the
Worker process, and no Hangfire dashboard is exposed.

---

## 20. Next Feature Plan — Backend Bounded Context Split

**Planning status:** Product and architecture decisions locked for high-risk
implementation planning

**Mode:** High-risk backend architecture, API contract, database schema, and
frontend cutover refactor

**Depends on:** The shipped Flashcard, Practice, and Review workflow split,
FluentA SRS state/history, current Vocabulary-to-Flashcard synchronization,
current review dashboard behavior, and the modular-monolith Clean Architecture
runtime.

**Source of truth:** `history/backend-bounded-context-split/CONTEXT.md`

### 20.1 Current State

The product already exposes separate learning workflows:

- `Flashcard` is the read-only page-deck viewer.
- `Practice` is the page-deck first-learning/re-practice workflow.
- `Review` is the board-scoped SRS workflow.

The backend still keeps most of these concerns inside the current Flashcards
bounded context. Application service, repository, domain entities, EF
configuration, controller methods, settings, dashboard queries, practice
summary writes, SRS queue creation, SRS answer persistence, and Flashcard deck
reads are coupled through the same backend module.

This feature aligns backend ownership with the shipped product boundaries while
preserving the modular monolith as the deployment model.

### 20.2 Desired Outcomes

- Backend code is split into three internal bounded contexts:
  `Flashcard`, `Practice`, and `Review`.
- Each bounded context has its own application service, application port,
  infrastructure repository, DTOs/contracts, and domain entity ownership.
- API routes are cut over to context-aligned endpoint surfaces.
- Frontend API clients, routes, and tests use the new endpoint contract.
- PostgreSQL table ownership is represented with context schemas:
  `flashcards`, `practice`, and `review`.
- Review owns all SRS state, SRS history, SRS scheduling, Review settings, and
  learning dashboard/stats.
- Practice can request Review state creation only through an explicit Review
  application port.
- Vocabulary-to-learning synchronization is handled by context-owned event
  handlers while preserving current transactional guarantees.

### 20.3 Locked Decisions

| Decision | Required Behavior |
|---|---|
| Bounded context level | Split into three internal bounded contexts inside the same modular monolith. Do not create separately deployed services. |
| API contract | Replace the mixed Flashcards API shape with context-aligned endpoints. |
| Cutover style | Perform a one-time cutover: update frontend/tests and remove old endpoints in the same feature. |
| SRS ownership | Review owns SRS state, SRS history, Review settings, and FluentA SRS scheduling. |
| Practice-to-Review boundary | Practice must not write Review tables directly. Practice calls a Review application port for `Add to Review`. |
| Dashboard ownership | Review owns learning dashboard/stats including due/overdue, retention, forecast, board stats, and new-to-review counts. |
| Database boundary | Move learning tables into PostgreSQL schemas by bounded context. |
| Dev migration posture | Dev/local may use destructive or reset migrations while the app is pre-production. Production/user-data deployment requires a preserve-data migration path. |
| Frontend scope | Frontend API client, route flows, Vitest, and Playwright proof are in scope. |
| API controllers | Use `FlashcardsController`, `PracticeController`, and `ReviewController`, each calling only its corresponding application service. |
| Domain ownership | Move domain entities to their owning bounded context. |
| Shared kernel | Do not create a shared Learning kernel in this feature. Duplicate small enums/value objects where needed and map through explicit contracts. |
| Vocabulary sync | Vocabulary emits events; Flashcard handles deck/card sync; Review handles review state/history cleanup. Current atomic behavior must be preserved where required. |

### 20.4 Target Backend Shape

Target code ownership:

```text
FluentA.Domain/
  BoundedContexts/
    Flashcards/
      Entities/
        FlashcardDeck.cs
        FlashcardCard.cs
    Practice/
      Entities/
        PracticeSettings.cs
        PracticeSessionSummary.cs
    Review/
      Entities/
        ReviewSettings.cs
        WordReviewState.cs
        WordReviewHistory.cs
      FluentAsrsScheduler.cs

FluentA.Application/
  BoundedContexts/
    Flashcards/
      FlashcardService.cs
      IFlashcardRepository.cs
      DTOs/
    Practice/
      PracticeService.cs
      IPracticeRepository.cs
      IReviewEnrollmentPort.cs
      DTOs/
    Review/
      ReviewService.cs
      IReviewRepository.cs
      DTOs/

FluentA.Infrastructure/
  Flashcards/
    EfFlashcardRepository.cs
  Practice/
    EfPracticeRepository.cs
  Review/
    EfReviewRepository.cs

FluentA.API/
  Controllers/
    FlashcardsController.cs
    PracticeController.cs
    ReviewController.cs
```

Planning may adjust exact filenames, but ownership must stay aligned with the
locked decisions.

### 20.5 Domain Ownership

| Context | Owns | Must not own |
|---|---|---|
| Flashcard | Page deck/card read model, deck/card synchronization from Vocabulary, viewer session reads. | Practice summaries, Practice settings, SRS state/history, Review settings, SRS scheduling. |
| Practice | Practice settings, practice session summaries, practice workflow persistence, request to add practiced words to Review. | Direct Review table writes, SRS scheduling, due queues, dashboard stats. |
| Review | Review settings, due queue, SRS state/history, FluentA SRS scheduling, review answer persistence, learning dashboard/stats. | Flashcard viewer behavior, Practice attempt/session summary ownership. |

Review state remains linked to vocabulary words. New vocabulary words still do
not create Review state automatically. `Add to Review` creates missing Level 0
state through Review ownership.

### 20.6 Database Target

Target PostgreSQL schemas and tables:

| Context | Target tables |
|---|---|
| Flashcard | `flashcards.decks`, `flashcards.cards` |
| Practice | `practice.settings`, `practice.session_summaries` |
| Review | `review.settings`, `review.word_states`, `review.word_histories` |

Development/local implementation may choose a destructive reset migration while
the product has no production users. Before deploying to any production
environment with user data, planning must add or verify a preserve-data
migration path that moves existing data without losing deck/card content,
practice summaries, settings, Review state, or Review history.

### 20.7 API Cutover Shape

The old mixed API surface is removed in this feature. Planning must map every
current endpoint to a context-owned endpoint before implementation. The target
shape is:

| Context | Target endpoint family | Expected ownership |
|---|---|---|
| Flashcard | `/api/v1/flashcards/...` | Deck list and read-only card session reads. |
| Practice | `/api/v1/practice/...` | Practice setup, settings, session summaries, and Add to Review command. |
| Review | `/api/v1/review/...` | Review sessions, review answers, settings, and dashboard/stats. |

`Practice` may expose an `Add to Review` endpoint, but the implementation must
call Review through an application port. `Review` owns the actual SRS state
creation.

### 20.8 Vocabulary Sync And Cleanup

Vocabulary remains the source of truth for word/page/board content. Sync rules
must stay behavior-compatible:

- Creating an active vocabulary word creates or updates the related Flashcard
  page-deck card as it does today.
- Updating a word synchronizes copied card content.
- Deleting a word, page, or board removes related Flashcard cards and related
  Review state/history.
- The existing owner-scoping and deleted-row non-disclosure behavior must be
  preserved.
- Current same-transaction guarantees must be preserved where the existing
  product depends on immediate consistency.

Target ownership:

```text
Vocabulary event
  -> Flashcard handler owns deck/card sync
  -> Review handler owns SRS state/history cleanup
```

No message broker, outbox, or asynchronous sync is required in this feature
unless planning proves synchronous handlers cannot preserve the existing
transaction rules.

### 20.9 Scope Boundaries

Out of scope:

- Separate deployable services.
- Separate databases.
- New message broker, queue, or outbox system.
- A shared Learning kernel.
- User-visible workflow changes beyond endpoint-backed frontend cutover.
- New learning modes or SRS algorithm changes.
- Changing Practice mode semantics.
- Changing Review random-mode semantics.
- Preserving production user data with destructive migration. Destructive reset
  is allowed only for dev/local before production.

### 20.10 Risk And Validation Plan

| Risk | Required Proof Before Release |
|---|---|
| API contract regression | Frontend, API tests, and Playwright prove Flashcard, Practice, Review, settings, and dashboard flows work through the new endpoint families. |
| Context boundary leakage | Code review or architecture tests prove controllers call only their context service and Practice uses a Review application port for SRS state creation. |
| Data loss from schema move | Dev reset migration is explicitly documented, or preserve-data migration proof exists before production/user-data deployment. |
| SRS ownership regression | Unit/API tests prove Review remains the only owner of `word_states`, `word_histories`, settings, scheduling, and dashboard stats. |
| Vocabulary sync breaks | Backend tests or integration smoke prove word create/update/delete still sync cards and cleanup Review state/history. |
| Dashboard behavior changes | Focused tests prove due/overdue, retention, forecast, board stats, and new-to-review counts match pre-refactor behavior. |
| Endpoint remnants linger | Route/API scan proves removed legacy endpoints are unreachable after cutover. |
| Frontend stale API client | Frontend lint, Vitest, build, and E2E prove no old endpoint dependency remains. |
| EF schema drift | Migration/model snapshot review proves tables are under the intended PostgreSQL schemas and indexes/FKs still support hot paths. |

### 20.11 Proposed Story Queue

1. **US-BC-001:** Map the current mixed Flashcards backend surface to target
   Flashcard, Practice, and Review contracts, including endpoint mapping,
   entity ownership, repository split, and migration strategy.
2. **US-BC-002:** Split domain entities and application contracts into
   Flashcard, Practice, and Review bounded contexts without changing runtime
   behavior.
3. **US-BC-003:** Split infrastructure repositories and EF configuration into
   context-owned persistence paths.
4. **US-BC-004:** Move tables into `flashcards`, `practice`, and `review`
   PostgreSQL schemas, with dev reset migration allowed and production
   preserve-data requirements documented.
5. **US-BC-005:** Split API controllers and cut over public endpoints to the
   new context-aligned contract.
6. **US-BC-006:** Update frontend API clients, route flows, settings,
   dashboard usage, and tests for the new endpoints.
7. **US-BC-007:** Rework Vocabulary sync/cleanup handlers so Flashcard owns
   deck/card sync and Review owns SRS cleanup while preserving atomic behavior.
8. **US-BC-008:** Prove release behavior across Flashcard viewer, Practice,
   Add to Review, Review sessions, dashboard/stats, settings, ownership, and
   schema boundaries.

### 20.12 Verification Ladder

```powershell
dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj
dotnet test src/backend/FluentA.slnx
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
dotnet tool run dotnet-ef migrations script --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run
npm --prefix src/frontend run build
npm --prefix src/frontend run test:e2e -- flashcard-viewer.spec.js practice-workflow.spec.js review-workflow.spec.js settings-profile.spec.js
.\scripts\bin\harness-cli.exe story verify <approved-story-id>
.\scripts\bin\harness-cli.exe query matrix
git diff --check
```

Planning may split proof by story. Release proof must cover backend context
boundaries, endpoint cutover, EF schema ownership, Vocabulary sync/cleanup,
Review SRS ownership, Practice-to-Review port behavior, frontend API cutover,
and no remaining dependency on removed legacy endpoints.

---

## 21. Vocabulary Page Fixed Columns And Board Preferences

### 21.1 Objective

Replace vocabulary page custom-column behavior with a fixed vocabulary word
table contract and a simpler board-wide preference model. The Pages vocabulary
table should remain spreadsheet-like, but the set of persisted word fields is
no longer user-defined.

### 21.2 Locked Decisions

| Decision | Required Behavior |
|---|---|
| Fixed vocabulary columns | Pages use a fixed `vocab_words` column set: `word`, `meaning_vn`, `ipa_pronunciation`, `definition`, `word_class`, `example`, `note`, `synonyms`, and `antonyms`. |
| Pronunciation content | `ipa_pronunciation` stores IPA-style content that may begin and end with slash characters, for example `/.../`; validation and rendering must preserve those slash characters exactly. |
| Required fields | `word`, `meaning_vn`, `ipa_pronunciation`, `word_class`, and `example` are required. |
| Nullable fields | `definition`, `note`, `synonyms`, and `antonyms` may be null. |
| Word class | `word_class` remains an enum-backed field. |
| Removed fixed fields | Remove vocabulary word fields `thesaurus`, `collocation`, `interval`, `ease_factor`, `repetitions`, `next_review_date`, and `state` from the vocabulary page contract. SRS state belongs to Review, not Vocabulary. |
| Remove custom columns | Remove the custom-column feature from vocabulary pages. Users can no longer create arbitrary text/number columns or custom values. |
| Removed tables | Drop `vocab_column_visibility`, `vocab_custom_columns`, and `vocab_custom_values`. |
| Preference table | Add `vocab_board_preferences` for per-user, per-board table preferences. |
| Preference scope | One preference row applies to all pages in the same board for that user. Different boards may have different preferences. |
| Preference uniqueness | Enforce one active preference per `(user_id, board_id)`. |
| Hide/show behavior | Nullable fixed columns can be hidden or shown from the frontend. Required columns remain visible. |
| Column order | Users can drag columns to reorder them. The order is saved in `vocab_board_preferences` and reused on every page in that board. |
| Column width | Users can resize columns by dragging column headers. Widths are saved in `vocab_board_preferences` and reused on every page in that board. |
| Horizontal overflow | If visible columns exceed the viewport, the table scrolls horizontally instead of squeezing fields until content becomes unusable. |
| Board language | Keep `vocab_boards.language`; users choose the target language when creating a board, and existing language-aware labels and speech behavior remain intact. |
| Board/page ordering | Remove `sort_order` from `vocab_boards` and `vocab_pages`. List both by `created_at` descending, with newest items first; manual board/page ordering is not supported. |

### 21.3 Target Vocabulary Word Shape

`vocab_words` should represent page vocabulary content with these user-facing
fields:

| Field | Required | Type | Notes |
|---|---:|---|---|
| `word` | yes | text | Main vocabulary word or phrase. |
| `meaning_vn` | yes | text | Vietnamese meaning. |
| `ipa_pronunciation` | yes | text | Pronunciation text; slash characters are user content and must be preserved. |
| `definition` | no | text | Optional definition or explanation. |
| `word_class` | yes | enum | Existing word-class enum contract. |
| `example` | yes | text | Example sentence. |
| `note` | no | text | Optional learner note. |
| `synonyms` | no | text | Optional synonym list or free text. |
| `antonyms` | no | text | Optional antonym list or free text. |

Planning may choose exact C# and TypeScript property casing, but API responses
must stay consistent with existing FluentA DTO conventions.

### 21.4 Target Preference Shape

`vocab_board_preferences` stores only presentation preferences for the current
user and board. It does not store vocabulary content.

Minimum durable data:

| Field | Purpose |
|---|---|
| `id` | Preference row identity. |
| `user_id` | Owner scope. |
| `board_id` | Board scope shared by all pages in the board. |
| `hidden_columns` | Nullable fixed column keys hidden by this user for this board. |
| `column_order` | Ordered list of fixed column keys. |
| `column_widths` | Width by fixed column key. |
| `created_at` | Creation timestamp. |
| `updated_at` | Last preference update timestamp. |

The implementation may use JSON columns or a more structured schema if
planning finds a stronger reason, but the public behavior must remain the same.

### 21.5 API And Frontend Behavior

- Loading a board's pages must also make the current user's board table
  preferences available to the vocabulary table.
- Updating hidden columns, column order, or column widths persists through the
  backend for the current `(user_id, board_id)`.
- Preference updates must be owner-scoped. A user cannot read or write another
  user's board preferences.
- If no preference row exists, the frontend uses the default column order and
  default widths, then creates or upserts preferences when the user customizes
  the table.
- The frontend must not expose controls to create or delete custom columns.
- Existing spreadsheet autosave remains cell-scoped for fixed vocabulary
  fields.
- Existing drag-to-reorder column behavior remains, but it targets the fixed
  column list only.
- Column resize handles must not change row content, row order, or autosave
  semantics.

### 21.6 Migration And Cleanup

This feature changes durable vocabulary schema. Planning must include an EF
migration that:

- Adds the new vocabulary word fields needed by the target shape.
- Drops or replaces removed vocabulary word fields after any required data
  mapping decision is made.
- Drops `vocab_column_visibility`, `vocab_custom_columns`, and
  `vocab_custom_values`.
- Adds `vocab_board_preferences` with owner and board foreign keys.
- Adds the uniqueness constraint for `(user_id, board_id)`.
- Keeps Review-owned SRS state in Review tables rather than reintroducing
  interval/ease/repetition state to Vocabulary.

Data migration for existing `thesaurus` and `collocation` content must be
decided during planning before destructive removal. The expected mapping is:
`thesaurus` content becomes `synonyms` where that preserves user value, and
`collocation` has no replacement unless planning identifies an accepted target.

### 21.7 Scope Boundaries

Out of scope:

- Arbitrary user-created vocabulary columns.
- Custom text/number values.
- Per-page preference differences inside the same board.
- SRS algorithm changes.
- Review queue or Review history changes beyond removing legacy Vocabulary
  leakage.
- Flashcard practice/review UX redesign.
- Import/export changes unless required to keep existing tests compiling.

### 21.8 Validation Plan

| Risk | Required Proof Before Release |
|---|---|
| Schema/data loss | EF migration review proves removed tables/columns and new preferences match the locked contract, with explicit handling for existing `thesaurus` and `collocation` data. |
| API contract regression | Backend tests prove fixed word CRUD, cell-scoped updates, preference read/write, owner scoping, and null handling. |
| IPA slash corruption | Unit or integration tests prove `ipa_pronunciation` preserves leading/trailing slash characters through create, edit, read, and autosave. |
| Custom-column remnants | Static scan and frontend tests prove custom-column create/delete/value paths are removed. |
| Table preference behavior | Frontend tests prove hide/show nullable columns, required-column visibility, drag reorder, width resize persistence, and board-wide reuse across pages. |
| Horizontal overflow | UI or Playwright proof shows the table scrolls horizontally when visible columns exceed the viewport. |
| Review ownership regression | Backend or static proof confirms Vocabulary no longer stores legacy interval/ease/repetition/next-review/state fields and Review remains the SRS owner. |

### 21.9 Proposed Story Queue

1. **US-VOCAB-006:** Replace the Vocabulary page data model and API contract.
   This story adds the fixed `vocab_words` field set, removes legacy
   custom-column storage and APIs, drops obsolete Vocabulary-owned review
   fields, and adds `vocab_board_preferences`.
2. **US-VOCAB-007:** Update the Vocabulary table frontend. This story removes
   custom-column controls, renders only fixed columns, supports hide/show for
   nullable columns, persists board-wide column order and widths, and provides
   horizontal scrolling for wide tables.
3. **US-VOCAB-008:** Run release proof across migration, word CRUD,
   spreadsheet autosave, flashcard sync, preference persistence, owner scoping,
   IPA slash preservation, and removed custom-column paths.

### 21.10 Verification Ladder

```powershell
dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj --filter Vocabulary
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --filter Vocabulary
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
dotnet tool run dotnet-ef migrations script --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run -- VocabTable
npm --prefix src/frontend run build
npm --prefix src/frontend run test:e2e -- vocabulary.spec.js
.\scripts\bin\harness-cli.exe query matrix
git diff --check
```

## 22. Next Feature Plan — Productivity Schema Cleanup And Countdowns Redesign

### 22.1 Objective

This is the first follow-up feature after the current vocabulary work. It
cleans up legacy schema and UI contracts in Todo, Kanban, and Journal, then
rebuilds Countdowns around a richer but tighter model: date-based events,
multiple alerts, optional MinIO-backed cover art, and explicit create/delete
ownership.

This feature also requires full codebase cleanup. Removing a column or table is
not enough by itself. Planning and implementation must remove or rewrite every
dependent DTO, validator, repository query, frontend state path, test, and
product document that still assumes the old fields exist.

### 22.2 Feature Boundary

In scope:

- Remove `todo_items.sort_order`, `todo_items.is_carried_over`, and
  `todo_items.original_date`, plus all drag-reorder, move-between-days, and
  carry-over logic tied to those fields.
- Remove `kanban_cards.tags`, tag filtering, and title-search-only card
  filtering paths that depend on the previous card metadata shape.
- Rename `journal_entries` to `journal`, rename `learning_date` to `date`,
  remove `plain_text_content`, remove preview-based list/search behavior, and
  extend the existing TipTap editor to the new toolbar contract.
- Rename `countdown_events` to `countdowns` and redesign the feature around
  create/delete only, optional cover upload, and 1-5 scheduled alerts.
- Synchronize the new names through database, domain entities, repositories,
  API DTOs, frontend routes, labels, tests, and product docs where reasonable.

Out of scope:

- Flashcard, Practice, and Review redesign.
- `flashcard_decks.type` removal and any deck/card ownership redesign tied to
  the later Flashcard/Practice/Review feature.
- Habit, Pomodoro, Dashboard, or broader notification-center redesign beyond
  the countdown notifications needed for this contract.

### 22.3 Locked Product Decisions

The full stable decision ledger lives in
`history/productivity-schema-cleanup-and-countdowns-redesign/CONTEXT.md`.
Implementation must preserve those decision IDs. At a high level, the locked
product shape is:

- Todo keeps day and week planning, but loses carry-over, drag reorder,
  move-to-another-day editing, and sort-order persistence.
- Kanban keeps boards, columns, card move/reorder, priority, deadline, and
  description, but removes tags and board-level title search.
- Journal keeps list, detail, autosave, calendar, title search, and rich-text
  editing, but removes preview/plain-text-content behavior and standardizes on a
  required writing `date`.
- Countdowns become a create/delete-only flow with optional immutable cover
  media, fixed Vietnam timezone alert scheduling, and auto-retirement after the
  target lifecycle ends.

### 22.4 Todo Target Contract

#### Outcomes

- A logged-in user can open `/todo` and view only their own tasks.
- Day view still defaults to the selected date and remains the primary task
  workspace.
- Desktop week view still shows Monday-Sunday columns and supports creating
  tasks for any day in the visible week.
- Todo list items show only the task title. Optional note content remains
  editable in create/detail surfaces but is not shown in the compact list row.
- Completed tasks remain visible in the same day/week list instead of
  disappearing after toggle.

#### Behavioral Rules

- `sort_order`, `is_carried_over`, and `original_date` are removed from schema
  and behavior.
- Todo reads must no longer mutate records as a side effect. Fetching a day or
  week cannot carry tasks forward.
- A task always stays bound to the date chosen at creation time.
- Task date cannot be changed after creation. Moving a task to another date
  requires delete-and-recreate.
- Week view is create/view only. It does not support drag reorder, drag move,
  bulk create, or bulk move.
- Incomplete tasks appear first and sort by `created_at desc`.
- Completed tasks appear after incomplete tasks and sort by
  `completed_at desc`.
- Existing `completed_at` remains the source of truth for completion ordering;
  this feature must not add a replacement completion timestamp.

#### API Implications

- `PATCH /api/v1/todos/{id}` no longer accepts `date` or `sortOrder`.
- Day and week list endpoints return tasks grouped by their stored assigned
  date, without carry-over mutation.

### 22.5 Kanban Target Contract

#### Outcomes

- A logged-in user can continue to manage owned boards, columns, and cards on
  `/kanban`.
- Board cards display only `title`, `priority`, and `deadline`.
- Card `description` remains supported for create/edit/detail behavior, but it
  is no longer rendered in the compact board card.

#### Behavioral Rules

- `tags` is removed from `kanban_cards` and from all API/frontend contracts.
- Board-level title search is removed with the old lightweight search bar
  behavior.
- Client-side filtering remains available only for `priority` and `deadline`.
- Existing card move/reorder and column management behavior stays intact unless
  a code path depends directly on removed tag/search state.

#### API Implications

- Card create/update DTOs no longer accept or return tag collections.
- Any tag-filter or title-search query parameter, selector, badge list, or test
  fixture must be removed instead of left dormant.

### 22.6 Journal Target Contract

#### Outcomes

- A logged-in user can open `/journal`, list owned entries, open one entry,
  edit it, autosave it, delete it, search by title, and browse the calendar by
  writing date.
- Journal list cards show only `title` and `date`.
- Creating an entry requires `title` and writing `date`; `content` remains
  optional.
- `date` means the learner's writing date (`ngay viet`) and may differ from
  `created_at`.

#### Behavioral Rules

- `journal_entries` is renamed to `journal`.
- `learning_date` is renamed to `date`.
- `plain_text_content` is removed from schema and no replacement preview column
  is introduced in this feature.
- Journal search remains, but it targets title only. Content search and
  highlighted preview snippets are removed.
- Autosave remains for existing entries after explicit creation.
- Calendar behavior remains keyed by `date`, not by `created_at`.
- Content stays as sanitized rich text and is still optional.

#### Editor Contract

- Continue using TipTap rather than replacing the editor stack.
- Required editor capabilities for this feature are Heading 1-4, undo, redo,
  bullet list, ordered list, task list, bold, italic, underline, highlight,
  text alignment (left, center, right, justify), and view-only zoom control.
- Default journal font is `Open Sans`.
- Default journal font size is `14`.
- Task list is rich-text checklist content only and does not create or sync Todo
  tasks.

#### API And Route Implications

- The target API surface is singular where reasonable: `/api/v1/journal`.
- Frontend continues to use `/journal`.
- Legacy plural naming must be removed or compatibility-wrapped deliberately
  during implementation; it must not remain by accident.

### 22.7 Countdowns Target Contract

#### Outcomes

- A logged-in user can open `/countdowns`, see only their own active or
  recently completed countdowns, create a countdown, and delete a countdown.
- Countdown edit is removed from the product contract. Any change requires
  deleting and recreating the countdown.
- Countdown cards are sorted with active/upcoming items first by nearest
  `target_date`, followed by completed items.
- If a cover exists, the list card uses that cover as the background image with
  overlaid text. If no cover exists, the card falls back to a light preset
  visual treatment.

#### Core Model Rules

- `countdown_events` is renamed to `countdowns`.
- Frontend route is renamed from `/countdown` to `/countdowns`; the old route
  is removed rather than kept as a parallel long-term contract.
- Countdown stores `target_date` as a calendar `date`, not a timestamp.
- `target_date` must be today or a future date.
- `color` and `icon` are removed.
- A countdown may have zero or one cover. Cover is optional.
- If a countdown is created with a cover, that cover cannot later be replaced
  or removed because edit is not supported.
- If a countdown is created without a cover, a cover cannot be added later.

#### Alert Rules

- Every countdown must have at least one alert and at most five alerts.
- Each alert creates one separate in-app notification.
- Allowed alert day values are fixed enums:
  `OnTargetDay`, `1DayBefore`, `3DaysBefore`, and `7DaysBefore`.
- `alert_time` is user-chosen local clock time such as `09:00`.
- Duplicate alerts with the same alert-day enum and the same alert time are
  rejected.
- Reusing the same alert-day enum with different alert times is allowed as long
  as the countdown stays within the 1-5 alert cap.
- Countdown creation fails if any computed alert would already be in the past
  at the moment of creation.
- Notification content should stay intentionally simple: countdown name plus the
  alert milestone.

#### Scheduling And Lifecycle Rules

- Countdown alert business time is fixed to `Asia/Ho_Chi_Minh` for this app.
  There is no user-configurable countdown timezone setting in this feature.
- Backend persists the durable event target as `target_date`, stores local
  `alert_time`, and computes `scheduled_at_utc` so worker/jobs run reliably.
- Manual delete cancels future, not-yet-fired alerts. Notifications already
  created in the inbox remain.
- A completed countdown stays in the main list for seven days after
  `target_date`.
- After that seven-day window, the countdown is soft-deleted automatically.

### 22.8 Cover Upload And Asset Lifecycle

- Countdown cover upload must reuse the same shared asset pattern already used
  for avatar: presign -> direct browser upload -> finalize -> link by durable
  asset metadata.
- Countdown create UI includes an explicit upload button rather than asking the
  user for a raw URL.
- Allowed formats are `jpg`, `png`, and `webp`.
- Maximum file size is 2MB.
- Frontend should resize and lightly compress large images before upload to
  improve form responsiveness while leaving final validation to the backend.
- Backend stores the final public cover URL in Countdown-facing data, while the
  shared asset system remains the source of truth for ownership, upload status,
  and MinIO object cleanup.
- Manual countdown deletion and seven-day automatic countdown retirement must
  also retire the linked cover asset through the same cleanup flow.

### 22.9 Cleanup And Rename Requirements

- Schema cleanup must be matched by repository/query cleanup, DTO cleanup,
  validator cleanup, API-client cleanup, frontend state cleanup, and test-fixture
  cleanup.
- Any code path that only existed for removed fields must be deleted, not left
  behind as unreachable compatibility code, unless planning explicitly records a
  temporary migration shim.
- Table renames must be synchronized with entity names, DbSet names, mappings,
  route labels, and product docs where that rename improves clarity.
- The implementation pass must include a static scan for removed identifiers
  such as `sortOrder`, `IsCarriedOver`, `OriginalDate`, `tags`,
  `plainTextContent`, `learningDate`, `countdownEvents`, `color`, and `icon`.

### 22.10 Scope Boundaries

Out of scope for this feature:

- Review, SRS, flashcard card ownership, practice flow, and deck redesign.
- Adding countdown edit-back after the create/delete simplification.
- Todo recurrence, Kanban subtasks, Journal AI writing tools, or a richer
  notification inbox UX.
- User-configurable multi-timezone behavior.

### 22.11 Validation Plan

| Risk | Required Proof Before Release |
|---|---|
| Schema/contract drift | EF migration review proves removed columns/tables, table renames, and countdown alert storage match the target contract exactly. |
| Dead-code residue | Static scan proves removed fields and old route names no longer leak through backend DTOs, frontend API clients, forms, selectors, or tests. |
| Todo regression | Backend/frontend proof shows day/week planning still works without carry-over or sort-order logic, and completed ordering uses `completed_at`. |
| Kanban regression | UI/API proof shows tag/search removal does not break board load, card CRUD, move, priority filter, or deadline filter behavior. |
| Journal regression | Proof shows title-only search, required writing date, autosave, calendar, and the extended TipTap toolbar all work without preview/plain-text-content storage. |
| Countdown scheduling bugs | Backend tests prove fixed `Asia/Ho_Chi_Minh` alert calculation, duplicate rejection, past-alert rejection, 1-5 alert limits, and `scheduled_at_utc` persistence. |
| Asset lifecycle leaks | Proof shows countdown cover upload/finalize/link works through shared assets, and cover cleanup runs on manual delete plus seven-day auto-retirement. |

### 22.12 Proposed Story Queue

1. **US-PROD-001:** Clean up Todo, Kanban, and Journal schema/contracts.
   Remove the retired fields, rename Journal durable data, and rewrite the
   affected API/frontend behavior to the new compact contracts.
2. **US-PROD-002:** Redesign Countdowns around create/delete, multi-alert
   scheduling, and optional shared-asset cover upload.
3. **US-PROD-003:** Run cleanup proof across migrations, route renames, removed
   identifiers, asset lifecycle, notification scheduling, and product-doc
   synchronization.

### 22.13 Verification Ladder

```powershell
dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj --filter "Todo|Kanban|Journal|Countdown|Asset"
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --filter "Todo|Kanban|Journal|Countdown|Asset"
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
dotnet tool run dotnet-ef migrations script --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run -- Todo Kanban Journal Countdown
npm --prefix src/frontend run build
npm --prefix src/frontend run test:e2e -- productivity.spec.js
.\scripts\bin\harness-cli.exe query matrix
git diff --check
```

## 23. Next Feature Plan — Flashcard, Practice, And Review Source-Of-Truth Redesign

### 23.1 Objective

Redesign the learning stack so Flashcard, Practice, and Review all read from
`vocab_words` directly instead of relying on synchronized `flashcard_decks` and
`flashcard_cards`, while Review keeps a separate dedicated SRS state owned by
each `vocab_word`.

The feature must remove duplicated learning data, preserve the user's intended
three-part workflow, and replace the older "page deck sync + practice summary +
review history" model with a cleaner page-scoped Practice layer and
board-scoped Review layer.

### 23.2 Feature Boundary

This feature delivers:

- Flashcard as a read-only recap flow scoped to one `vocab_page`.
- Practice as page-scoped drills plus per-word `Add to Review`.
- Review as board-scoped SRS over active `review_state` rows linked directly to
  `vocab_words`.
- Minimal `practice_sessions` and `review_sessions` persistence needed for
  practiced badges and resumable same-day review sessions.
- Cleanup of duplicate learning tables and stale logic that still depends on
  synchronized flashcard deck/card ownership.

This feature does not add resumable Flashcard sessions, practice-history UI,
review-history UI, AI pronunciation scoring, fuzzy matching, or per-session
mode overrides beyond the already existing global Practice settings and Review
settings surfaces.

### 23.3 Locked Product Decisions

- `vocab_words` is the single source of truth for learning content.
- `flashcard_decks` and `flashcard_cards` are removed from the target model.
- Each `vocab_page` is the learner-facing deck for Flashcard and Practice.
- Review is board-scoped and pulls words through `board -> page -> vocab_word`.
- Learning ownership is per `vocab_word.id`; equal surface text in different
  rows remains separate learning items.
- A user can create review state only by pressing `Add to Review` from Practice.
- New `review_state` starts at `level 0`, `status = active`, due tomorrow.
- Re-adding an inactive word reuses the same `review_state` row, resets it to
  `level 0`, sets `status = active`, resets `last_review_date` to `null`, and
  schedules tomorrow.
- `review_state` uses `active` and `inactive` only; no extra inactive-reason
  enum is added.
- Review uses the current FluentA level ladder `1 / 2 / 4 / 14 / 39 / 60`
  days.
- Correct review answers increase one level up to `5`.
- Wrong review answers decrease one level down to `0`.
- Level `5` words stay in Review every `60` days until the learner manually
  removes them.
- Daily-limit and due-date business logic uses fixed local day
  `Asia/Ho_Chi_Minh`.
- Durable datetimes still store UTC in the database.

### 23.4 Shared Learning Content Contract

- Flashcard front shows `word`, optional `definition`, `class`, and `ipa`.
- Flashcard back shows optional `meaning_vn`, `example`, `synonyms`, `note`,
  and `antonyms`.
- Practice recap and Review recap use the same content contract.
- Empty optional fields stay hidden.
- Flashcard, Practice recap, and Review recap always read the latest live
  `vocab_word` content rather than snapshots.
- Board and page labels always use the latest live vocabulary names.

### 23.5 Flashcard Contract

- Flashcard list stays grouped by board with expand/collapse page sections like
  the current frontend pattern.
- Boards sort by `board.created_at desc`.
- Pages inside a board sort by `page.created_at desc`.
- Pages with no words still appear and show `No words yet`.
- Pages with words expose `Start Flashcard`.
- Pages with no words disable the action.
- Flashcard list does not show `Practiced` or `Viewed` badges.
- Flashcard route is page-based rather than deck-based.
- Opening a page always starts from the first word of that page.
- Flashcard does not persist partial progress or completion state.
- The final Flashcard screen shows `Let's practice` and `Back to decks`.
- `Let's practice` opens Practice for that exact page.
- `Back to decks` returns to the Flashcard list.

### 23.6 Practice Contract

- Practice is scoped to one selected `vocab_page`.
- Practice includes every active `vocab_word` in that page, even if a word is
  already in Review.
- Practice order supports `Sequential` and `Shuffle`.
- Sequential uses `vocab_word.created_at asc`.
- Shuffle randomizes the selected page queue only.
- Practice keeps the current global mode-sequence setting using the existing
  three modes: `dictation`, `meaningToWord`, and `pronunciation`.
- Matching for typed answers uses exact `trim + lowercase`.
- Practice pronunciation may retry indefinitely until correct or `Reveal/Skip`.
- `Reveal/Skip` completes the current step and the session continues.
- Unsupported browser speech recognition does not block Practice start; the
  pronunciation step shows unsupported state and still allows `Reveal/Skip`.
- Each word completes the configured exercises first, then shows recap.
- Practice recap actions are `Previous`, `Add to Review` or
  `Already in Review` / `Added`, and `Next`.
- Clicking `Add to Review` does not auto-advance.
- If the word already has active review state, recap shows disabled
  `Already in Review`.
- If the word was added earlier in the same Practice session, recap shows
  disabled `Added`.
- Practice does not resume. Reopening a page starts from the beginning.
- Review-state changes already made through `Add to Review` stay durable even
  if the learner exits Practice before finishing the page.
- Practice end screen has `Finish` only.
- Practice has no completion summary screen and no immediate CTA to Review.

### 23.7 Practiced State Contract

- `practice_sessions` is a minimal page-level marker, not a history feed.
- One row exists per `user_id + page_id`.
- The row is created only when the learner finishes the whole page and presses
  `Finish`.
- Re-completing the same page updates `last_completed_at`.
- `created_at` keeps the first completed timestamp.
- Practice list alone shows the practiced state.
- Page with words and no row: action `Practice`, no badge.
- Page with words and a row: badge `Practiced`, action `Practice again`.
- Page with no words and no row: disabled action, `No words yet`, no badge.
- Page with no words and a row: disabled action, `No words yet`, badge
  `Practiced`.
- Flashcard does not read or display practiced state.

### 23.8 Review Queue Contract

- Review starts from a chosen board and uses active `review_state` rows linked
  to active words in that board.
- Due words mean words whose `next_review_date` falls on today or any earlier
  local day in `Asia/Ho_Chi_Minh`.
- Review daily limit is a global user setting.
- Queue selection first filters active due words, then prioritizes lower
  `level`, then older `vocab_word.created_at`.
- Sequential uses that prioritized order.
- Shuffle first selects that prioritized limited queue, then shuffles inside
  the selected queue.
- Review mode is fixed to `random`; each queued word randomly receives one of
  `dictation`, `meaningToWord`, or `pronunciation`.
- Review matching for typed answers uses exact `trim + lowercase`.
- Review has no `Reveal/Skip`.
- Dictation and Meaning-to-Word allow one graded submission only.
- Pronunciation allows at most two transcript checks; after that, the word is
  graded wrong.
- Each word appears at most once per session.
- Correct or wrong, the word leaves the session immediately after grading.
- If `recapAfterAnswer = true`, recap appears after grading and offers `Next`
  only.
- If `recapAfterAnswer = false`, the session advances immediately.
- When a Review session finishes, every word in the same board that is still
  due on that business day is moved to tomorrow, not only the words excluded
  from the initial queue.
- Review summary shows only `Correct / Wrong / Total`.
- Summary counts only words the learner actually answered.

### 23.9 Review Session Contract

- Review supports resumable same-day sessions per `user + board`.
- `review_sessions.status` uses `active`, `completed`, and `replaced`.
- At most one `active` session may exist for the same `user + board` at a
  time.
- The session stores `order_type`, `session_date`, `started_at`, and optional
  `completed_at`.
- `session_date` is the local Vietnam date when the learner pressed
  `Start Review`.
- Queue membership persists in `review_session_items`.
- Each item stores one `vocab_word_id`, `is_reviewed`, and `created_at`.
- Within one session, the same `vocab_word.id` cannot appear twice.
- `Start Review` on the same board and same local day opens a modal if an
  unfinished session exists.
- The modal actions are `Continue Review`, `Start New Session`, and `Cancel`.
- `Cancel`, outside click, and `Esc` only close the modal.
- `Start New Session` immediately marks the old same-day session as `replaced`
  and builds a new queue.
- If an unfinished session belongs to a previous local day, no modal appears;
  that old session becomes `replaced` and a new session starts for today.
- Continuing a session uses only items where `is_reviewed = false`.
- Continuing a sequential session rebuilds the remaining queue by the normal
  review priority rules.
- Continuing a shuffle session shuffles the remaining items again.
- The session uses its original `started_at` when resumed.
- A `replaced` session keeps `completed_at = null`.
- Replacing a session does not mutate unfinished item rows to `is_reviewed = true`;
  they remain historical session facts.
- If all remaining items are unavailable, the learner sees an empty state and
  can press `Finish`, which marks the session `completed`.
- If a session crosses midnight, the due-date deferral rule still treats
  tomorrow as the day after `session_date`, not the wall-clock finish date.
- Review sessions are kept in the database for internal use only; there is no
  session-history UI in this feature.

### 23.10 Review State Contract

- `review_state` is unique per `user_id + vocab_word_id`.
- The table stores `status`, `level`, `created_at`, `last_review_date`, and
  `next_review_date`.
- `created_at` means the latest add-or-readd moment into Review, not the first
  lifetime appearance.
- New add or re-add sets `last_review_date = null`.
- `last_review_date` updates immediately after each reviewed word.
- `last_review_date` stores datetime, not date-only.
- `next_review_date` stores datetime, keeps the answer-time clock component,
  and is still judged by local day rather than exact time.
- When a due word is moved to tomorrow because it remains due after finishing a
  Review session, the clock component of `next_review_date` stays unchanged.
- Changing a row to `inactive` keeps its existing `level`, `created_at`,
  `last_review_date`, and `next_review_date`.

### 23.11 Level 5 Management Contract

- Level `5` management lives under a second-level Settings route.
- Settings should expose routes for Profile, Level 5, Review settings, and
  Practice settings.
- Level 5 list is global across the app, not board-scoped.
- Default filter is `All`, with `Active` and `Inactive` filters.
- Search filters by `word`.
- Sort order is active first, then inactive, with more recently level-5-reviewed
  words first inside each group.
- Each row shows `word`, `board/page`, `status`, and the latest level-5
  `last_review_date`.
- Active items can be removed one-by-one or in bulk.
- Inactive items are view-only.
- Remove action changes `status` to `inactive`; it does not delete the row and
  does not reset `level 5`.
- If an inactive level-5 word is re-added from Practice, it becomes `active`,
  resets to `level 0`, and schedules tomorrow.

### 23.12 Review List And Empty-State Contract

- Review board picker shows all boards.
- Board label format is `Board name (N due)`.
- Boards sort by `due count desc`, then `board.created_at desc`.
- Review page defaults to no board selected.
- With no board selected, the page shows an empty state such as
  `Select a board to start review`.
- After choosing a board with no due words and no active session, the page
  shows `No words due today` and disables `Start Review`.
- If a board has an active same-day session, `Start Review` remains enabled
  even when due count is `0`, because it may open the continue modal.
- The board picker shows only due count; there is no separate `In progress`
  badge.
- Returning from Review summary resets the page to its default unselected
  state.

### 23.13 Cleanup, Soft Delete, And Restore Contract

- Removing duplicated learning data means implementation must delete old sync,
  DTO, repository, query, controller, API-client, and frontend logic that
  exists only for `flashcard_decks`, `flashcard_cards`, old practice summaries,
  and legacy review-history behavior.
- The redesign must remove practice-summary history UI and per-answer
  review-history persistence from the target model.
- Soft-deleting a single `vocab_word` changes its `review_state` to
  `inactive`, hides it from Review queues and due counts, and hides it from
  Level 5 UI while the word stays deleted.
- Soft-deleting a `page` changes review states for words in that page to
  `inactive`, deletes related `practice_sessions`, and causes matching
  `review_session_items` to be treated as already handled in any active board
  session.
- Soft-deleting a `board` changes review states for words in that board to
  `inactive`, deletes related `practice_sessions`, and deletes related
  `review_sessions` plus `review_session_items`.
- While a word, page, or board source stays deleted, related Level 5 entries
  stay hidden from Settings.
- If an item becomes inactive or deleted while a same-day review session is
  still active, continuing the session should skip it by marking the session
  item handled.
- If a page or board is restored later, its old `review_state` rows remain
  `inactive` until the learner re-adds those words from Practice.
- If a soft-deleted word is restored later and had level `5`, it reappears in
  Level 5 UI as `inactive`.
- Restoring a page does not restore deleted `practice_sessions`; the page is
  considered not practiced.

### 23.14 Scope Boundaries

Out of scope for this feature:

- Flashcard resume/bookmark state.
- Practice session history screens or analytics.
- Review session history screens or analytics.
- Per-answer review-history browsing.
- Fuzzy answer matching, typo tolerance, or AI speech scoring.
- Automatic restoration of review activity when deleted vocabulary content is
  restored.
- Additional review modes beyond `dictation`, `meaningToWord`, and
  `pronunciation`.

### 23.15 Validation Plan

| Risk | Required Proof Before Release |
|---|---|
| Duplicate learning data remains alive | Migration review plus static scans prove `flashcard_decks`, `flashcard_cards`, old practice-summary usage, and review-history usage are fully removed from active learning paths. |
| Content contract drift | Backend/frontend proof shows Flashcard, Practice recap, and Review recap all render the same live `vocab_word` fields and hide empty optional values. |
| Practice-to-Review state bugs | Tests prove per-word `Add to Review`, `Already in Review`, re-add from inactive, no Practice resume, and practiced badge persistence. |
| Review queue and overflow bugs | Tests prove due filtering by Vietnam-local day, low-level priority, shuffle selection, same-day resume, and end-of-session due-date deferral. |
| Soft-delete lifecycle bugs | Tests prove word/page/board deletion and restore behavior for `review_state`, `review_sessions`, `review_session_items`, `practice_sessions`, and Level 5 visibility. |
| Session ambiguity | Tests prove same-day continue modal, previous-day replacement, unique active session per board, and empty-session finish behavior. |
| Settings regression | UI/API proof shows Review settings, Practice settings, and Level 5 management align with the new source-of-truth model. |

### 23.16 Proposed Story Queue

1. **US-LEARN-001:** Replace synchronized flashcard deck/card reads with
   page-word source-of-truth reads for Flashcard and Practice.
2. **US-LEARN-002:** Introduce the new Review domain model
   (`review_state`, `review_sessions`, `review_session_items`) and remove old
   review-history/session-summary behavior.
3. **US-LEARN-003:** Rebuild Practice around per-word `Add to Review`,
   practiced badges, and inactive re-add flow.
4. **US-LEARN-004:** Rebuild Review around board-level due queues, same-day
   resume modal, overflow handling, and Level 5 management.
5. **US-LEARN-005:** Run cleanup proof across migrations, API routes, frontend
   routes, settings navigation, and stale identifier removal.

### 23.17 Verification Ladder

```powershell
dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj --filter "Flashcard|Practice|Review|Vocabulary|Srs"
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --filter "Flashcard|Practice|Review|Vocabulary|Srs"
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
dotnet tool run dotnet-ef migrations script --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run -- Flashcard Practice Review Settings
npm --prefix src/frontend run build
npm --prefix src/frontend run test:e2e -- learning-navigation.spec.js practice-workflow.spec.js review-workflow.spec.js
.\scripts\bin\harness-cli.exe query matrix
git diff --check
```

## 24. Next Feature Plan — Settings Route Split

### 24.1 Objective

Redesign Settings so Profile, Review settings, Practice settings, and Level 5
management live as separate second-level Settings routes instead of one
combined settings page. The goal is to make settings easier to navigate,
prepare the UI for future settings growth, and align all settings surfaces with
the route pattern already introduced by Level 5 management.

### 24.2 Feature Boundary

This feature delivers the Settings route split, desktop settings navigation,
and manual save behavior for the existing Profile, Review, Practice, and Level
5 settings surfaces.

This feature does not add new Practice behavior, new Review behavior, new Level
5 list logic, mobile-specific settings navigation, or changes to the underlying
profile/avatar, practice-settings, review-settings, or Level 5 API contracts
unless planning finds a small compatibility adjustment required by the route
split.

### 24.3 Locked Product Decisions

- `/settings` redirects to `/settings/profile`.
- Settings exposes these second-level routes:
  - `/settings/profile`
  - `/settings/review`
  - `/settings/practice`
  - `/settings/level5`
- A fixed desktop sidebar is the primary Settings navigation.
- The sidebar contains `Profile`, `Review`, `Practice`, and `Level 5`.
- Level 5 must move into the same settings layout and sidebar as the other
  routes.
- Mobile responsive behavior is deferred to a later feature.
- All three editable settings routes use explicit manual save behavior.
- Profile, Review, and Practice must not autosave in this feature.

### 24.4 Profile Settings Contract

- `/settings/profile` keeps the full current profile feature set.
- The route includes avatar preview, avatar upload, avatar removal, saved
  avatars, full name, read-only email, and bio.
- Avatar upload still starts only when the user saves the profile.
- Profile save validates the same full-name, bio, file-size, and file-type
  rules as the current profile settings implementation.
- Successful save updates the authenticated user profile and current Settings
  cache.
- Failed save keeps the user's draft visible and shows an error state.

### 24.5 Practice Settings Contract

- `/settings/practice` configures only the existing global Practice mode
  sequence.
- The configurable modes remain `dictation`, `meaningToWord`, and
  `pronunciation`.
- The user can include or exclude modes, but at least one mode must remain
  enabled.
- The user can reorder the active mode sequence.
- Changes are draft-only until the user presses the route's save action.
- This feature does not add default Practice session order, per-mode advanced
  settings, or new Practice modes.

### 24.6 Review Settings Contract

- `/settings/review` configures only the existing Review settings:
  `dailyLimit` and `recapAfterAnswer`.
- Changes are draft-only until the user presses the route's save action.
- This feature does not add default review order, due-date policy controls,
  overflow controls, or Level 5 advanced options.

### 24.7 Level 5 Settings Contract

- `/settings/level5` keeps the existing Level 5 management behavior from
  Section 23.
- Level 5 remains global across the app, not board-scoped.
- Default filter remains `All`, with `Active` and `Inactive` filters.
- Search continues to filter by `word`.
- Active level-5 items can still be removed one-by-one or in bulk.
- Inactive items remain view-only.
- This feature changes Level 5 layout/navigation only; it does not change
  Level 5 state transitions or list semantics.

### 24.8 Navigation And Layout Contract

- Each Settings route renders inside one shared desktop settings shell.
- The shared shell owns the fixed left sidebar and route content area.
- The active sidebar item is visually indicated.
- Settings routes should keep the existing authenticated workspace header
  affordances that are still useful, including logout.
- Navigation between Settings routes must not discard saved server state.
- Unsaved local drafts may be route-local; this feature does not require
  cross-route draft preservation after navigating away.

### 24.9 Scope Boundaries

Out of scope for this feature:

- Mobile-specific responsive navigation for Settings.
- New profile fields.
- New avatar asset lifecycle behavior.
- New Review settings beyond `dailyLimit` and `recapAfterAnswer`.
- New Practice settings beyond mode inclusion and ordering.
- New Level 5 filters, sorting, state transitions, or bulk actions.
- Reworking Flashcard, Practice, or Review session behavior.

### 24.10 Validation Plan

| Risk | Required Proof Before Release |
|---|---|
| Route regression | Browser proof shows `/settings` redirects to `/settings/profile`, and all four second-level routes load behind authentication. |
| Settings save regression | Frontend/API proof shows Profile, Review, and Practice save only after explicit save actions and no longer autosave while editing. |
| Profile/avatar regression | Proof shows avatar preview/upload/remove, saved avatars, full-name edit, read-only email, and bio save still work on `/settings/profile`. |
| Practice settings regression | Proof shows mode inclusion, at-least-one-mode guard, reordering, save, reload, and error state behavior on `/settings/practice`. |
| Review settings regression | Proof shows daily limit, recap toggle, save, reload, and validation/error behavior on `/settings/review`. |
| Level 5 layout regression | Proof shows Level 5 remains functional inside the shared settings sidebar without changing list filters, search, single remove, or bulk remove semantics. |

### 24.11 Proposed Story Queue

1. **US-SETTINGS-002:** Introduce the shared Settings shell, sidebar, route
   split, and `/settings` redirect.
2. **US-SETTINGS-003:** Move Profile, Practice settings, Review settings, and
   Level 5 into the split Settings routes with manual save behavior.
3. **US-SETTINGS-004:** Run settings regression proof across routing,
   profile/avatar save, practice save, review save, and Level 5 management.

### 24.12 Verification Ladder

```powershell
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run -- Settings
npm --prefix src/frontend run build
npm --prefix src/frontend run test:e2e -- learning-navigation.spec.js
.\scripts\bin\harness-cli.exe query matrix
git diff --check
```
