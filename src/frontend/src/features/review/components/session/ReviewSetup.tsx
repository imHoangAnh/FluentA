import { AudioLines, Languages, Mic, Play, Sparkles } from 'lucide-react'
import { SelectMenu } from '@/shared/components/ui/select-menu'
import type { ReviewMode, ReviewOrderType } from '../../api/review.api'

export type ReviewBoardOption = {
  boardId: string
  boardName: string
  boardLanguage: string
  dueCount: number
  totalWords: number
}

type ReviewSetupProps = {
  boardId: string
  boards: ReviewBoardOption[]
  reviewMode: ReviewMode
  orderType: ReviewOrderType
  recapEnabled: boolean
  noBoardSelected: boolean
  noDueWords: boolean
  isStarting: boolean
  hasStartError: boolean
  onBoardChange: (value: string) => void
  onModeChange: (value: ReviewMode) => void
  onOrderChange: (value: ReviewOrderType) => void
  onRecapChange: (value: boolean) => void
  onStart: () => void
}

export function ReviewSetup({ boardId, boards, reviewMode, orderType, recapEnabled, noBoardSelected, noDueWords, isStarting, hasStartError, onBoardChange, onModeChange, onOrderChange, onRecapChange, onStart }: ReviewSetupProps) {
  return (
    <div className="review-setup-container">
      <div className="review-setup-card">
        <div className="review-setup-body">
          <div className="review-setup-field">
            <label className="review-setup-label" htmlFor="board-select">Vocabulary board</label>
            <SelectMenu
              id="board-select"
              className="review-setup-select-wrapper"
              buttonClassName="review-setup-select"
              value={boardId}
              onChange={onBoardChange}
              aria-label="Vocabulary board"
              options={[{ value: '', label: 'Select a board' }, ...boards.map((board) => ({ value: board.boardId, label: `${board.boardName} (${board.dueCount} due)` }))]}
            />
            {noBoardSelected ? <p className="review-setup-state" data-testid="review-setup-state">Select a board to start review</p> : noDueWords ? <p className="review-setup-state" data-testid="review-setup-state">No words due today</p> : null}
          </div>

          <div className="review-setup-field">
            <label className="review-setup-label">Review mode</label>
            <div className="rs-selection-grid" role="group" aria-label="Review Mode">
              <button type="button" className={`rs-selection-card ${reviewMode === 'random' ? 'active' : ''}`} onClick={() => onModeChange('random')}>
                <Sparkles className="rs-selection-card__icon" size={24} />
                <div className="rs-selection-card__info"><strong>All 3 Modes</strong><span>Random mix of Dictation, Meaning &amp; Pronunciation</span></div>
              </button>
              <button type="button" className={`rs-selection-card ${reviewMode === 'meaningToWord' ? 'active' : ''}`} onClick={() => onModeChange('meaningToWord')}>
                <Languages className="rs-selection-card__icon" size={24} />
                <div className="rs-selection-card__info"><strong>Meaning → Word</strong><span>Recall word from definition</span></div>
              </button>
              <button type="button" className={`rs-selection-card ${reviewMode === 'dictation' ? 'active' : ''}`} onClick={() => onModeChange('dictation')}>
                <AudioLines className="rs-selection-card__icon" size={24} />
                <div className="rs-selection-card__info"><strong>Dictation</strong><span>Listen &amp; type the spoken word</span></div>
              </button>
              <button type="button" className={`rs-selection-card ${reviewMode === 'pronunciation' ? 'active' : ''}`} onClick={() => onModeChange('pronunciation')}>
                <Mic className="rs-selection-card__icon" size={24} />
                <div className="rs-selection-card__info"><strong>Pronunciation</strong><span>Speak into mic for AI scoring</span></div>
              </button>
            </div>
          </div>

          <div className="review-setup-field">
            <label className="review-setup-label">Card order</label>
            <div className="review-setup-options" role="group" aria-label="Review order">
              <button type="button" className={`review-mode ${orderType === 'sequential' ? 'review-mode--active' : ''}`} onClick={() => onOrderChange('sequential')}><span>Sequential</span></button>
              <button type="button" className={`review-mode ${orderType === 'shuffle' ? 'review-mode--active' : ''}`} onClick={() => onOrderChange('shuffle')}><span>Shuffle</span></button>
            </div>
          </div>

          <label className="review-recap-toggle"><input type="checkbox" checked={recapEnabled} onChange={(event) => onRecapChange(event.target.checked)} /><span>Show recap after each answer</span></label>

          <div className="review-setup-actions">
            <button className="review-setup-start-btn" type="button" disabled={!boardId || noDueWords || isStarting} onClick={onStart}><Play size={20} fill="currentColor" />Start review</button>
            {hasStartError ? <p className="flashcard-status flashcard-status--error">Unable to start review right now.</p> : null}
          </div>
        </div>
      </div>
    </div>
  )
}
