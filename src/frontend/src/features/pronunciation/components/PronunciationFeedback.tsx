import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { PronunciationAssessment, PronunciationUnitFeedback } from '../api/pronunciation.api'
import './PronunciationFeedback.css'

function cleanUnitText(value: string) {
  return value.trim().replace(/^\/+|\/+$/g, '')
}

function colorForScore(score: number | null | undefined, correct?: boolean) {
  if (score == null) return correct ? 'good' : 'priority'
  return score > 80 ? 'good' : score >= 60 ? 'practice' : 'priority'
}

const colorLabels = { good: 'Green', practice: 'Yellow', priority: 'Red' }

type ActiveTooltip = {
  key: string
  trigger: HTMLButtonElement
  phonemes: PronunciationUnitFeedback[]
  assessment: PronunciationAssessment
}

export function PronunciationFeedback({ assessment }: { assessment: PronunciationAssessment | null }) {
  const tooltipId = useId()
  const tooltipRef = useRef<HTMLDivElement>(null)
  const pinned = useRef(false)
  const [active, setActive] = useState<ActiveTooltip | null>(null)

  useLayoutEffect(() => {
    if (!active || !tooltipRef.current) return
    const trigger = active.trigger.getBoundingClientRect()
    const tooltip = tooltipRef.current.getBoundingClientRect()
    const left = Math.max(8, Math.min(trigger.left + (trigger.width - tooltip.width) / 2, window.innerWidth - tooltip.width - 8))
    const above = trigger.top - tooltip.height - 8
    const top = above >= 8 ? above : Math.min(trigger.bottom + 8, window.innerHeight - tooltip.height - 8)
    tooltipRef.current.style.left = `${left}px`
    tooltipRef.current.style.top = `${Math.max(8, top)}px`
  }, [active])

  useEffect(() => {
    if (!active) return
    const close = () => { pinned.current = false; setActive(null) }
    const outside = (event: PointerEvent) => {
      if (!active.trigger.contains(event.target as Node)) close()
    }
    document.addEventListener('pointerdown', outside)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('pointerdown', outside)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [active])

  // A recording, recovered assessment, or new card must not retain a stale popup.
  const currentActive = active?.assessment === assessment && active.trigger.isConnected ? active : null
  if (!assessment || assessment.words.length === 0) return null

  const close = () => { pinned.current = false; setActive(null) }
  const open = (key: string, trigger: HTMLButtonElement, phonemes: PronunciationUnitFeedback[]) => {
    if (phonemes.length === 0) return
    pinned.current = false
    setActive({ key, trigger, phonemes, assessment })
  }

  return (
    <div className="pronunciation-feedback-row" role="status" aria-live="polite" data-testid="pronunciation-feedback" data-pronunciation-feedback onKeyDown={event => event.stopPropagation()}>
      {assessment.words.map((word, wordIndex) => (
        <span className="pronunciation-feedback-word" key={`${word.text}-${wordIndex}`}>
          {(word.syllables?.length ? word.syllables : [{
            text: assessment.feedbackMode === 'phoneme' ? word.units.map(unit => cleanUnitText(unit.text)).join('') : word.text,
            accuracyScore: word.accuracyScore,
            phonemes: assessment.feedbackMode !== 'word' ? word.units : [],
          }]).map((syllable, syllableIndex) => {
            const key = `${wordIndex}:${syllableIndex}`
            const color = colorForScore(syllable.accuracyScore)
            const text = assessment.feedbackMode === 'word' && !word.syllables?.length
              ? syllable.text : `/${cleanUnitText(syllable.text)}/`
            const expanded = currentActive?.key === key
            return (
              <button
                type="button"
                className={`pronunciation-syllable pronunciation-tone--${color}`}
                key={key}
                aria-label={`${colorLabels[color]} syllable ${text}`}
                aria-expanded={syllable.phonemes.length > 0 ? expanded : undefined}
                aria-describedby={expanded ? tooltipId : undefined}
                onPointerEnter={event => { if (event.pointerType !== 'touch') open(key, event.currentTarget, syllable.phonemes) }}
                onPointerLeave={event => { if (!pinned.current && document.activeElement !== event.currentTarget) close() }}
                onFocus={event => open(key, event.currentTarget, syllable.phonemes)}
                onBlur={close}
                onClick={event => {
                  if (expanded && pinned.current) close()
                  else { open(key, event.currentTarget, syllable.phonemes); pinned.current = true }
                }}
                onKeyDown={event => {
                  if (event.key === 'Escape') { event.preventDefault(); close() }
                }}
              >{text}</button>
            )
          })}
        </span>
      ))}
      {currentActive && createPortal(
        <div id={tooltipId} className="pronunciation-phoneme-tooltip" role="tooltip" ref={tooltipRef}>
          {currentActive.phonemes.map((phoneme, index) => {
            const color = colorForScore(phoneme.accuracyScore, phoneme.correct)
            return <span className={`pronunciation-tone--${color}`} key={index} aria-label={`${colorLabels[color]} phoneme ${phoneme.text}`}>/{cleanUnitText(phoneme.text)}/</span>
          })}
        </div>, document.body,
      )}
    </div>
  )
}
