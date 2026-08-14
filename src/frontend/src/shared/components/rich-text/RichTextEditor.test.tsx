import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RichTextEditor } from './RichTextEditor'

describe('RichTextEditor', () => {
  it('wires heading and list toolbar actions to semantic editor commands', async () => {
    const execCommand = vi.fn().mockReturnValue(true)
    Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand })
    const onChange = vi.fn()
    const { getByRole } = render(
      <RichTextEditor content="<p>Journal entry</p>" onChange={onChange} />,
    )

    await userEvent.click(getByRole('button', { name: 'Heading 1' }))
    await userEvent.click(getByRole('button', { name: 'Bullet list' }))
    await userEvent.click(getByRole('button', { name: 'Ordered list' }))

    expect(execCommand).toHaveBeenNthCalledWith(1, 'formatBlock', false, '<H1>')
    expect(execCommand).toHaveBeenNthCalledWith(2, 'insertUnorderedList', false, undefined)
    expect(execCommand).toHaveBeenNthCalledWith(3, 'insertOrderedList', false, undefined)

    Object.defineProperty(document, 'execCommand', { configurable: true, value: undefined })
  })

  it('keeps the Journal formatting toolbar inline by default', () => {
    const { container } = render(
      <RichTextEditor content="<p>Journal entry</p>" onChange={vi.fn()} />,
    )

    const shell = container.querySelector('.journal-rich-text-shell')
    const toolbar = screen.getByRole('toolbar', { name: 'Journal formatting tools' })

    expect(shell).toContainElement(toolbar)
    expect(toolbar.parentElement).toBe(shell)
  })
})
