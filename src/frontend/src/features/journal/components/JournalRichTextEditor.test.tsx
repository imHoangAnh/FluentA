import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { JournalRichTextEditor } from './JournalRichTextEditor'

describe('JournalRichTextEditor', () => {
  it('keeps the Journal formatting toolbar inline by default', () => {
    const { container } = render(
      <JournalRichTextEditor content="<p>Journal entry</p>" onChange={vi.fn()} />,
    )

    const shell = container.querySelector('.journal-rich-text-shell')
    const toolbar = screen.getByRole('toolbar', { name: 'Journal formatting tools' })

    expect(shell).toContainElement(toolbar)
    expect(toolbar.parentElement).toBe(shell)
  })
})
