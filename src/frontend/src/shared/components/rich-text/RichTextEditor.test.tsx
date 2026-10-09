import '@/test/rich-text-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RichTextEditor } from './RichTextEditor'

describe('RichTextEditor', () => {
  it('uses the compact Journal Text style select for H1-H6 and Paragraph', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<RichTextEditor textStyleSelect content="<p>Journal entry</p>" onChange={onChange} />)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Text style' }), '6')
    expect(screen.getByRole('textbox')).toContainHTML('<h6>Journal entry</h6>')
    expect(onChange).toHaveBeenLastCalledWith(expect.stringContaining('<h6>Journal entry</h6>'))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Text style' }), 'paragraph')
    expect(screen.getByRole('textbox')).toContainHTML('<p>Journal entry</p>')
  })

  it('changes actual heading/list content using Tiptap and omits removed tools', async () => {
    const onChange = vi.fn()
    render(<RichTextEditor content="<p>Journal entry</p>" onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Heading 6' }))
    await waitFor(() => expect(screen.getByRole('textbox')).toContainHTML('<h6>Journal entry</h6>'))
    expect(onChange).toHaveBeenLastCalledWith(expect.stringContaining('<h6>Journal entry</h6>'))
    await userEvent.click(screen.getByRole('button', { name: 'Paragraph' }))
    await userEvent.click(screen.getByRole('button', { name: 'Bullet list' }))
    expect(screen.getByRole('textbox').querySelector('ul > li')).toHaveTextContent('Journal entry')
    await userEvent.click(screen.getByRole('button', { name: 'Ordered list' }))
    expect(screen.getByRole('textbox').querySelector('ol > li')).toHaveTextContent('Journal entry')
    for (const name of ['Link', 'Code', 'Code block', 'Blockquote', 'Task list', 'Table', 'Font size']) expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
  })

  it('retains durable image references and layout even when storage gives no source', () => {
    render(<RichTextEditor content='<img data-asset-id="owned-image" width="250" height="125" data-image-align="center"><p>After image</p>' onChange={vi.fn()} />)
    const image = screen.getByRole('textbox').querySelector('img')!
    expect(image).toHaveAttribute('data-asset-id', 'owned-image')
    expect(image).toHaveAttribute('width', '250')
    expect(image.closest('[data-image-block]')).toHaveStyle({ textAlign: 'center' })
    expect(screen.getByRole('textbox')).toHaveTextContent('After image')
  })

  it('keeps the formatting toolbar inline by default and opening does not dirty the draft', () => {
    const onChange = vi.fn()
    const { container } = render(<RichTextEditor content="<p>Journal entry</p>" onChange={onChange} />)
    const shell = container.querySelector('.journal-rich-text-shell')
    expect(shell).toContainElement(screen.getByRole('toolbar', { name: 'Journal formatting tools' }))
    expect(onChange).not.toHaveBeenCalled()
  })
})
