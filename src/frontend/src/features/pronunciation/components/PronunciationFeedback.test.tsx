import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { PronunciationAssessment } from '../api/pronunciation.api'
import { PronunciationFeedback } from './PronunciationFeedback'
import { ShortcutGuide } from './ShortcutGuide'

const assessment: PronunciationAssessment = {
  correct: true, accuracyScore: 88, completenessScore: 100, feedbackMode: 'syllable',
  words: [{
    text: 'countryside', accuracyScore: 88, units: [],
    syllables: [
      { text: 'kʌn', accuracyScore: 88, phonemes: [
        { text: 'k', correct: true, accuracyScore: 80 },
        { text: 'ʌ', correct: true, accuracyScore: 81 },
        { text: 'n', correct: false, accuracyScore: 59.99 },
      ] },
      { text: 'tɹi', accuracyScore: 80, phonemes: [] },
      { text: 'saɪd', accuracyScore: 60, phonemes: [] },
      { text: 'deɪ', accuracyScore: 59.99, phonemes: [{ text: 'd', correct: false, accuracyScore: 60 }] },
    ],
  }],
}

describe('PronunciationFeedback', () => {
  it('shows successful assessments with strict color boundaries and no word labels or scores', () => {
    render(<PronunciationFeedback assessment={assessment} />)
    expect(screen.getByRole('button', { name: 'Green syllable /kʌn/' })).toHaveClass('pronunciation-tone--good')
    expect(screen.getByRole('button', { name: 'Yellow syllable /tɹi/' })).toHaveClass('pronunciation-tone--practice')
    expect(screen.getByRole('button', { name: 'Yellow syllable /saɪd/' })).toHaveClass('pronunciation-tone--practice')
    expect(screen.getByRole('button', { name: 'Red syllable /deɪ/' })).toHaveClass('pronunciation-tone--priority')
    expect(screen.getByTestId('pronunciation-feedback').textContent).toBe('/kʌn//tɹi//saɪd//deɪ/')
  })

  it('opens colored phonemes on hover and closes on leave', () => {
    render(<PronunciationFeedback assessment={assessment} />)
    const trigger = screen.getByRole('button', { name: 'Green syllable /kʌn/' })
    fireEvent.pointerEnter(trigger, { pointerType: 'mouse' })
    const tooltip = screen.getByRole('tooltip')
    expect(tooltip.textContent).toBe('/k//ʌ//n/')
    expect(within(tooltip).getByLabelText('Yellow phoneme k')).toHaveClass('pronunciation-tone--practice')
    expect(within(tooltip).getByLabelText('Green phoneme ʌ')).toHaveClass('pronunciation-tone--good')
    expect(within(tooltip).getByLabelText('Red phoneme n')).toHaveClass('pronunciation-tone--priority')
    expect(trigger).toHaveAttribute('aria-describedby', tooltip.id)
    fireEvent.pointerLeave(trigger)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('supports keyboard focus and Escape without triggering page shortcuts', () => {
    const shortcut = vi.fn()
    render(<div onKeyDown={shortcut}><PronunciationFeedback assessment={assessment} /></div>)
    const trigger = screen.getByRole('button', { name: 'Green syllable /kʌn/' })
    fireEvent.focus(trigger)
    expect(screen.getByRole('tooltip')).toBeVisible()
    fireEvent.keyDown(trigger, { key: 'Escape' })
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    expect(shortcut).not.toHaveBeenCalled()
    fireEvent.focus(trigger)
    fireEvent.blur(trigger)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('pins on tap, dismisses outside, and discards stale assessment details', () => {
    const view = render(<PronunciationFeedback assessment={assessment} />)
    const trigger = screen.getByRole('button', { name: 'Green syllable /kʌn/' })
    fireEvent.click(trigger)
    fireEvent.pointerLeave(trigger, { pointerType: 'touch' })
    expect(screen.getByRole('tooltip')).toBeVisible()
    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    fireEvent.click(trigger)
    view.rerender(<PronunciationFeedback assessment={{ ...assessment, accuracyScore: 89 }} />)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('keeps repeated syllables in different words and their phonemes separate', () => {
    render(<PronunciationFeedback assessment={{ ...assessment, words: [
      { ...assessment.words[0], text: 'today', syllables: [{ text: 'deɪ', accuracyScore: 90, phonemes: [{ text: 'd', correct: true, accuracyScore: 94 }] }] },
      { ...assessment.words[0], text: 'day', syllables: [{ text: 'deɪ', accuracyScore: 55, phonemes: [{ text: 'd', correct: false, accuracyScore: 65 }] }] },
    ] }} />)
    fireEvent.pointerEnter(screen.getByRole('button', { name: 'Red syllable /deɪ/' }))
    expect(within(screen.getByRole('tooltip')).getByLabelText('Yellow phoneme d')).toBeInTheDocument()
    fireEvent.pointerEnter(screen.getByRole('button', { name: 'Green syllable /deɪ/' }))
    expect(within(screen.getByRole('tooltip')).getByLabelText('Green phoneme d')).toBeInTheDocument()
  })

  it('reads old saved phoneme feedback without inventing syllable boundaries', () => {
    render(<PronunciationFeedback assessment={{
      correct: false, accuracyScore: 76, feedbackMode: 'phoneme',
      words: [{ text: 'go', accuracyScore: 76, units: [{ text: 'ɡ', correct: false }, { text: 'oʊ', correct: true }] }],
    }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Yellow syllable /ɡoʊ/' }))
    expect(screen.getByLabelText('Red phoneme ɡ')).toBeInTheDocument()
    expect(screen.getByLabelText('Green phoneme oʊ')).toBeInTheDocument()
  })

  it('keeps word fallback readable when the provider has no syllables', () => {
    render(<PronunciationFeedback assessment={{
      correct: true, accuracyScore: 90, feedbackMode: 'word',
      words: [{ text: '你好', accuracyScore: 90, units: [] }],
    }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Green syllable 你好' }))
    expect(screen.getByTestId('pronunciation-feedback')).toHaveTextContent('你好')
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })
})

describe('ShortcutGuide', () => {
  it('uses bracketed keycaps for the active pronunciation actions', () => {
    render(<ShortcutGuide mode="pronunciation" />)
    for (const key of ['[Tab]', '[R]', '[Space]', '[Esc]']) expect(screen.getByText(key)).toBeInTheDocument()
  })
})
