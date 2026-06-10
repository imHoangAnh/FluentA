import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from './routes/auth/LoginPage'
import { RegisterPage } from './routes/auth/RegisterPage'
import { GoogleCallbackPage } from './routes/auth/GoogleCallbackPage'
import { WorkspacePage } from './routes/workspace/WorkspacePage'
import { FlashcardsPage } from './routes/flashcards/FlashcardsPage'
import { ReviewSessionPage } from './routes/flashcards/ReviewSessionPage'
import { ProtectedRoute } from './lib/auth/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <WorkspacePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/flashcards"
        element={
          <ProtectedRoute>
            <FlashcardsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/flashcards/decks/:deckId/review"
        element={
          <ProtectedRoute>
            <ReviewSessionPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
