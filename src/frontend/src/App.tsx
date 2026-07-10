import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from './routes/auth/LoginPage'
import { RegisterPage } from './routes/auth/RegisterPage'
import { GoogleCallbackPage } from './routes/auth/GoogleCallbackPage'
import { VerifyEmailPage } from './routes/auth/VerifyEmailPage'
import { ForgotPasswordPage } from './routes/auth/ForgotPasswordPage'
import { ResetPasswordPage } from './routes/auth/ResetPasswordPage'
import { DashboardPage } from './routes/dashboard/DashboardPage'
import { WorkspacePage } from './routes/workspace/WorkspacePage'
import { FlashcardsPage } from './routes/flashcards/FlashcardsPage'
import { FlashcardViewerPage } from './routes/flashcards/FlashcardViewerPage'
import { PracticeSessionPage } from './routes/flashcards/PracticeSessionPage'
import { ReviewSessionPage } from './routes/flashcards/ReviewSessionPage'
import { SettingsLayout } from './routes/settings/SettingsLayout'
import { SettingsPage } from './routes/settings/SettingsPage'
import { SettingsPracticePage } from './routes/settings/SettingsPracticePage'
import { SettingsReviewPage } from './routes/settings/SettingsReviewPage'
import { LevelFiveSettingsPage } from './routes/settings/LevelFiveSettingsPage'
import { TodoPage } from './routes/todo/TodoPage'
import { CountdownPage } from './routes/countdown/CountdownPage'
import { HabitPage } from './routes/habits/HabitPage'
import { HabitStatsPage } from './routes/habits/HabitStatsPage'
import { JournalPage } from './routes/journal/JournalPage'
import { KanbanPage } from './routes/kanban/KanbanPage'
import { NotesPage } from './routes/notes/NotesPage'
import { PomodoroPage } from './routes/pomodoro/PomodoroPage'
import { NotificationsPage } from './routes/notifications/NotificationsPage'
import { ProtectedRoute } from './lib/auth/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vocabulary"
        element={
          <ProtectedRoute>
            <WorkspacePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/todo"
        element={
          <ProtectedRoute>
            <TodoPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/countdowns"
        element={
          <ProtectedRoute>
            <CountdownPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/flashcards"
        element={
          <ProtectedRoute>
            <FlashcardsPage entryMode="flashcards" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/flashcards/practice"
        element={
          <ProtectedRoute>
            <FlashcardsPage entryMode="practice" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/habits"
        element={
          <ProtectedRoute>
            <HabitPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/habits/:habitId/stats"
        element={
          <ProtectedRoute>
            <HabitStatsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/journal"
        element={
          <ProtectedRoute>
            <JournalPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notes"
        element={
          <ProtectedRoute>
            <NotesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/kanban"
        element={
          <ProtectedRoute>
            <KanbanPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pomodoro"
        element={
          <ProtectedRoute>
            <PomodoroPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>}
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="profile" replace />} />
        <Route path="profile" element={<SettingsPage />} />
        <Route path="practice" element={<SettingsPracticePage />} />
        <Route path="review" element={<SettingsReviewPage />} />
        <Route path="level5" element={<LevelFiveSettingsPage />} />
      </Route>
      <Route
        path="/flashcards/pages/:pageId"
        element={
          <ProtectedRoute>
            <FlashcardViewerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/review"
        element={
          <ProtectedRoute>
            <ReviewSessionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/flashcards/pages/:pageId/practice"
        element={
          <ProtectedRoute>
            <PracticeSessionPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
