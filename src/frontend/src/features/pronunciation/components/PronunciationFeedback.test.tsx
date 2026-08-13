import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PronunciationFeedback } from './PronunciationFeedback'
import { ShortcutGuide } from './ShortcutGuide'

describe('PronunciationFeedback', () => {
  it('renders phoneme text colors and underline without exposing score details', () => {
    render(
      <PronunciationFeedback
        assessment={{
          correct: false,
          accuracyScore: 76,
          completenessScore: 100,
          feedbackMode: 'phoneme',
          words: [{
            text: 'go',
            accuracyScore: 76,
            errorType: 'Mispronunciation',
            units: [{ text: 'ɡ', correct: false }, { text: 'oʊ', correct: true }],
          }],
        }}
      />,
    )

    expect(screen.getByTestId('pronunciation-feedback')).toBeInTheDocument()
    expect(screen.getByLabelText('Needs practice pronunciation ɡ')).toHaveClass('pronunciation-feedback-unit--wrong')
    expect(screen.getByLabelText('Correct pronunciation oʊ')).toHaveClass('pronunciation-feedback-unit--correct')
    expect(screen.getByTestId('pronunciation-feedback')).not.toHaveTextContent('76')
  })
})

describe('ShortcutGuide', () => {
  it('uses bracketed keycaps for the active pronunciation actions', () => {
    render(<ShortcutGuide mode="pronunciation" />)

    expect(screen.getByText('[Tab]')).toBeInTheDocument()
    expect(screen.getByText('[R]')).toBeInTheDocument()
    expect(screen.getByText('[Space]')).toBeInTheDocument()
    expect(screen.getByText('[Esc]')).toBeInTheDocument()
  })
})
