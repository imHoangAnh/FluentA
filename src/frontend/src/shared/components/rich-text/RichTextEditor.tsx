import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Highlighter, ImagePlus, Italic, List, ListOrdered, Minus, Quote, Redo2, Strikethrough, Underline, Undo2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Color, TextStyle } from '@tiptap/extension-text-style'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import { BlockImage } from './BlockImage'
import { cn } from '@/shared/lib/utils'

export type RichTextEditorHandle = {
  openImagePicker: () => void
  insertText: (text: string) => void
  insertQuote: (text: string) => void
  focus: () => void
}

type RichTextEditorProps = {
  contentClassName?: string
  disabled?: boolean
  content: string
  editorApiRef?: React.MutableRefObject<RichTextEditorHandle | null>
  onChange: (html: string) => void
  onBlur?: () => void
  onImageFiles?: (files: File[]) => Promise<Array<{ id: string; displayUrl: string; alt?: string }>>
  onImageUploadError?: (message: string) => void
  onImageUploadingChange?: (uploading: boolean) => void
  shellClassName?: string
  toolbarAriaLabel?: string
  toolbarClassName?: string
  toolbarHost?: HTMLElement | null
  textStyleSelect?: boolean
}

const COLORS = [{ name: 'Default', value: '' }, { name: 'Teal', value: '#0f9f8f' }, { name: 'Red', value: '#ef4444' }, { name: 'Orange', value: '#f97316' }, { name: 'Amber', value: '#f59e0b' }, { name: 'Green', value: '#10b981' }, { name: 'Blue', value: '#3b82f6' }, { name: 'Indigo', value: '#6366f1' }, { name: 'Purple', value: '#a855f7' }, { name: 'Pink', value: '#ec4899' }, { name: 'Gray', value: '#6b7280' }]

export function RichTextEditor(props: RichTextEditorProps) {
  const { content, disabled = false, toolbarHost, toolbarAriaLabel = 'Journal formatting tools' } = props
  const latest = useRef(props)
  latest.current = props
  const fileInput = useRef<HTMLInputElement>(null)
  const uploading = useRef(false)
  const [isUploading, setIsUploading] = useState(false)
  const [colorPicker, setColorPicker] = useState(false)
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false, code: false, codeBlock: false, heading: { levels: [1, 2, 3, 4, 5, 6] } }),
      TextStyle, Color, Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }), BlockImage,
    ],
    content,
    editable: !disabled,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: { class: cn('journal-rich-text-content', props.contentClassName), 'aria-label': 'Journal rich text editor', role: 'textbox', 'aria-multiline': 'true' },
      handleDOMEvents: {
        paste: (_view, event) => {
          const files = Array.from(event.clipboardData?.files ?? []).filter(file => file.type.startsWith('image/'))
          if (!files.length) return false
          event.preventDefault()
          void insertImages(files)
          return true
        },
        drop: (_view, event) => {
          const files = Array.from(event.dataTransfer?.files ?? []).filter(file => file.type.startsWith('image/'))
          if (!files.length) return false
          event.preventDefault()
          void insertImages(files)
          return true
        },
      },
    },
    onUpdate: ({ editor: instance }) => latest.current.onChange(instance.getHTML()),
    onBlur: () => latest.current.onBlur?.(),
  })

  useEffect(() => { if (editor && !editor.isDestroyed) editor.setEditable(!disabled, false) }, [editor, disabled])
  useEffect(() => {
    if (editor && !editor.isDestroyed && editor.schema && content !== editor.getHTML()) editor.commands.setContent(content, { emitUpdate: false })
  }, [content, editor])
  useEffect(() => {
    const ref = latest.current.editorApiRef
    if (!ref) return
    if (!editor || editor.isDestroyed) {
      ref.current = null
      return
    }
    ref.current = {
      openImagePicker: () => fileInput.current?.click(),
      insertText: (text: string) => {
        if (!editor.isDestroyed) editor.chain().focus().insertContent(text).run()
      },
      insertQuote: (text: string) => {
        if (!editor.isDestroyed) {
          editor.chain().focus().insertContent({
            type: 'blockquote',
            content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
          }).run()
        }
      },
      focus: () => {
        if (!editor.isDestroyed) editor.chain().focus().run()
      },
    }
    return () => {
      ref.current = null
    }
  }, [editor, props.editorApiRef])

  async function insertImages(files: File[]) {
    if (!editor || editor.isDestroyed || !latest.current.onImageFiles || latest.current.disabled || uploading.current) return
    uploading.current = true
    setIsUploading(true)
    latest.current.onImageUploadingChange?.(true)
    try {
      const uploads = await latest.current.onImageFiles(files)
      if (editor.isDestroyed) return
      editor.chain().focus().insertContent(uploads.flatMap(upload => [
        { type: 'image', attrs: { src: upload.displayUrl, assetId: upload.id, alt: upload.alt ?? '', alignment: 'left' } },
        { type: 'paragraph' },
      ])).run()
    } catch (error) {
      if (!editor.isDestroyed) latest.current.onImageUploadError?.(error instanceof Error ? error.message : 'Image upload failed.')
    } finally {
      uploading.current = false
      if (!editor.isDestroyed) { setIsUploading(false); latest.current.onImageUploadingChange?.(false) }
    }
  }

  if (!editor) return null
  const button = (name: string, icon: React.ReactNode, action: () => void, active = false, unavailable = false) => (
    <button key={name} type="button" aria-label={name} aria-pressed={active} className={cn('journal-toolbar-button', active && 'journal-toolbar-button--active')}
      disabled={disabled || unavailable} onClick={action}>{icon}</button>
  )
  const imageSelected = editor.isActive('image')
  const align = (value: 'left' | 'center' | 'right' | 'justify') => {
    if (imageSelected && value !== 'justify') editor.chain().focus().updateAttributes('image', { alignment: value }).run()
    else if (!imageSelected) editor.chain().focus().setTextAlign(value).run()
  }
  const toolbar = <div className={cn('journal-toolbar', props.toolbarClassName)} role="toolbar" aria-label={toolbarAriaLabel} onMouseDown={event => event.preventDefault()}>
    {props.textStyleSelect ? <select
      className="journal-text-style-select"
      aria-label="Text style"
      disabled={disabled}
      value={editor.isActive('heading') ? String(editor.getAttributes('heading').level) : 'paragraph'}
      onMouseDown={event => event.stopPropagation()}
      onChange={event => {
        if (event.target.value === 'paragraph') editor.chain().focus().setParagraph().run()
        else editor.chain().focus().setHeading({ level: Number(event.target.value) as 1 | 2 | 3 | 4 | 5 | 6 }).run()
      }}
    >
      <option value="paragraph">Paragraph</option>
      {([1, 2, 3, 4, 5, 6] as const).map(level => <option key={level} value={level}>Heading {level}</option>)}
    </select> : <>
      {([1, 2, 3, 4, 5, 6] as const).map(level => button(`Heading ${level}`, <span>H{level}</span>, () => { editor.chain().focus().toggleHeading({ level }).run() }, editor.isActive('heading', { level })))}
      {button('Paragraph', <span>P</span>, () => { editor.chain().focus().setParagraph().run() }, editor.isActive('paragraph'))}
    </>}
    {button('Bold', <Bold size={16} />, () => { editor.chain().focus().toggleBold().run() }, editor.isActive('bold'))}
    {button('Italic', <Italic size={16} />, () => { editor.chain().focus().toggleItalic().run() }, editor.isActive('italic'))}
    {button('Underline', <Underline size={16} />, () => { editor.chain().focus().toggleUnderline().run() }, editor.isActive('underline'))}
    {button('Strike', <Strikethrough size={16} />, () => { editor.chain().focus().toggleStrike().run() }, editor.isActive('strike'))}
    <div className="journal-color-picker-wrapper">
      {button('Text color', <span>A</span>, () => setColorPicker(!colorPicker), colorPicker)}
      {colorPicker && <div className="journal-color-picker-dropdown" role="dialog" aria-label="Choose text color">{COLORS.map(color => <button key={color.name} type="button" aria-label={`Color ${color.name}`} className="journal-color-swatch" style={{ backgroundColor: color.value || 'var(--ds-foreground)' }} onClick={() => { if (color.value) editor.chain().focus().setColor(color.value).run(); else editor.chain().focus().unsetColor().run(); setColorPicker(false) }} />)}</div>}
    </div>
    {button('Highlight', <Highlighter size={16} />, () => { editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run() }, editor.isActive('highlight'))}
    {button('Blockquote', <Quote size={16} />, () => { editor.chain().focus().toggleBlockquote().run() }, editor.isActive('blockquote'))}
    {button('Bullet list', <List size={16} />, () => { editor.chain().focus().toggleBulletList().run() }, editor.isActive('bulletList'))}
    {button('Ordered list', <ListOrdered size={16} />, () => { editor.chain().focus().toggleOrderedList().run() }, editor.isActive('orderedList'))}
    {button('Align left', <AlignLeft size={16} />, () => align('left'))}
    {button('Align center', <AlignCenter size={16} />, () => align('center'))}
    {button('Align right', <AlignRight size={16} />, () => align('right'))}
    {button('Justify', <AlignJustify size={16} />, () => align('justify'), false, imageSelected)}
    {button('Horizontal rule', <Minus size={16} />, () => { editor.chain().focus().setHorizontalRule().run() })}
    {latest.current.onImageFiles && button('Insert image', <ImagePlus size={16} />, () => fileInput.current?.click(), false, isUploading)}
    {button('Undo', <Undo2 size={16} />, () => { editor.chain().focus().undo().run() })}
    {button('Redo', <Redo2 size={16} />, () => { editor.chain().focus().redo().run() })}
    {isUploading && <span role="status">Uploading image...</span>}
  </div>
  return <div className={cn('journal-rich-text-shell', props.shellClassName)}>
    {toolbarHost === undefined ? toolbar : toolbarHost ? createPortal(toolbar, toolbarHost) : null}
    <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden aria-label="Choose images" onChange={event => { void insertImages(Array.from(event.target.files ?? [])); event.target.value = '' }} />
    <EditorContent editor={editor} />
  </div>
}
