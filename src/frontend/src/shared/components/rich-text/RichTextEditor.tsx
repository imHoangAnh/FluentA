import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Highlighter,
  Italic,
  List,
  ListChecks,
  ListOrdered,
  Redo2,
  Underline,
  Undo2,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/shared/lib/utils'

type RichTextEditorProps = {
  contentClassName?: string
  disabled?: boolean
  content: string
  onChange: (html: string) => void
  onBlur?: () => void
  onImageFiles?: (files: File[]) => Promise<Array<{ id: string; displayUrl: string; alt?: string }>>
  onImageUploadError?: (message: string) => void
  shellClassName?: string
  toolbarAriaLabel?: string
  toolbarClassName?: string
  toolbarHost?: HTMLElement | null
}

function runCommand(command: string, value?: string) {
  if (typeof document.execCommand !== 'function') {
    return false
  }

  return document.execCommand(command, false, value)
}

const COLOR_PALETTE = [
  { name: 'Default', value: 'inherit', bg: 'var(--ds-foreground)' },
  { name: 'Teal', value: '#0f9f8f', bg: '#0f9f8f' },
  { name: 'Red', value: '#ef4444', bg: '#ef4444' },
  { name: 'Orange', value: '#f97316', bg: '#f97316' },
  { name: 'Amber', value: '#f59e0b', bg: '#f59e0b' },
  { name: 'Green', value: '#10b981', bg: '#10b981' },
  { name: 'Blue', value: '#3b82f6', bg: '#3b82f6' },
  { name: 'Indigo', value: '#6366f1', bg: '#6366f1' },
  { name: 'Purple', value: '#a855f7', bg: '#a855f7' },
  { name: 'Pink', value: '#ec4899', bg: '#ec4899' },
  { name: 'Gray', value: '#6b7280', bg: '#6b7280' },
  { name: 'Dark Gray', value: '#1f2937', bg: '#1f2937' },
]

function TextColorIcon({ color = '#0f9f8f', size = 16 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m4 16 6-12 6 12" />
      <path d="M7 11h6" />
      <line x1="3" y1="20" x2="21" y2="20" stroke={color} strokeWidth="3.5" />
    </svg>
  )
}

export function RichTextEditor({
  contentClassName,
  disabled = false,
  content,
  onChange,
  onBlur,
  onImageFiles,
  onImageUploadError,
  shellClassName,
  toolbarAriaLabel = 'Journal formatting tools',
  toolbarClassName,
  toolbarHost,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null)
  const colorPickerRef = useRef<HTMLDivElement | null>(null)
  const [activeColor, setActiveColor] = useState<string>('#0f9f8f')
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  useEffect(() => {
    if (!isColorPickerOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setIsColorPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isColorPickerOpen])

  useEffect(() => {
    const element = editorRef.current
    if (!element) return
    if (element.innerHTML !== content) {
      element.innerHTML = content
    }
  }, [content])

  function focusEditor() {
    editorRef.current?.focus()
  }

  function apply(command: string, value?: string) {
    focusEditor()
    if (command === 'hiliteColor') {
      if (!runCommand('hiliteColor', value)) {
        runCommand('backColor', value)
      }
    } else {
      runCommand(command, value)
    }
    onChange(editorRef.current?.innerHTML ?? '')
  }

  function insertHtml(html: string) {
    focusEditor()
    const inserted = runCommand('insertHTML', html)
    if (!inserted && editorRef.current) {
      editorRef.current.innerHTML = `${editorRef.current.innerHTML}${html}`
    }

    onChange(editorRef.current?.innerHTML ?? '')
  }

  async function insertUploadedImages(files: File[]) {
    if (!onImageFiles || files.length === 0 || disabled || isUploadingImage) {
      return
    }

    setIsUploadingImage(true)
    try {
      const uploads = await onImageFiles(files)
      if (uploads.length === 0) {
        return
      }

      const html = uploads.map((upload) =>
        `<p><img src="${upload.displayUrl}" alt="${escapeHtml(upload.alt ?? '')}" data-note-asset-id="${upload.id}" /></p>`).join('')
      insertHtml(html)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Image upload failed.'
      onImageUploadError?.(message)
    } finally {
      setIsUploadingImage(false)
    }
  }

  const toolbar = (
    <div className={cn('journal-toolbar', toolbarClassName)} role="toolbar" aria-label={toolbarAriaLabel} onMouseDown={(e) => e.preventDefault()}>
        <button className="journal-toolbar-button" type="button" aria-label="Heading 1" disabled={disabled} onClick={() => apply('formatBlock', '<H1>')}>
          <Heading1 size={16} />
        </button>
        <button className="journal-toolbar-button" type="button" aria-label="Heading 2" disabled={disabled} onClick={() => apply('formatBlock', '<H2>')}>
          <Heading2 size={16} />
        </button>
        <button className="journal-toolbar-button" type="button" aria-label="Heading 3" disabled={disabled} onClick={() => apply('formatBlock', '<H3>')}>
          <Heading3 size={16} />
        </button>
        <button className="journal-toolbar-button" type="button" aria-label="Heading 4" disabled={disabled} onClick={() => apply('formatBlock', '<H4>')}>
          <Heading4 size={16} />
        </button>
        <button className="journal-toolbar-button" type="button" aria-label="Bold" disabled={disabled} onClick={() => apply('bold')}>
          <Bold size={16} />
        </button>
        <button className="journal-toolbar-button" type="button" aria-label="Italic" disabled={disabled} onClick={() => apply('italic')}>
          <Italic size={16} />
        </button>
        <button className="journal-toolbar-button" type="button" aria-label="Underline" disabled={disabled} onClick={() => apply('underline')}>
          <Underline size={16} />
        </button>
        <div className="journal-color-picker-wrapper" ref={colorPickerRef}>
          <button
            className={cn('journal-toolbar-button', isColorPickerOpen && 'journal-toolbar-button--active')}
            type="button"
            aria-label="Text color"
            disabled={disabled}
            onClick={() => setIsColorPickerOpen((prev) => !prev)}
          >
            <TextColorIcon color={activeColor} size={16} />
          </button>

          {isColorPickerOpen ? (
            <div className="journal-color-picker-dropdown" role="dialog" aria-label="Choose text color">
              {COLOR_PALETTE.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  title={item.name}
                  aria-label={`Color ${item.name}`}
                  className="journal-color-swatch"
                  style={{ backgroundColor: item.bg }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setActiveColor(item.value === 'inherit' ? '#0f9f8f' : item.value)
                    apply('foreColor', item.value)
                    setIsColorPickerOpen(false)
                  }}
                >
                  {item.value === 'inherit' ? <span className="text-[9px] font-bold text-background">A</span> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <button className="journal-toolbar-button" type="button" aria-label="Highlight" disabled={disabled} onClick={() => apply('hiliteColor', '#fef08a')}>
          <Highlighter size={16} />
        </button>
        <button className="journal-toolbar-button" type="button" aria-label="Bullet list" disabled={disabled} onClick={() => apply('insertUnorderedList')}>
          <List size={16} />
        </button>
        <button className="journal-toolbar-button" type="button" aria-label="Ordered list" disabled={disabled} onClick={() => apply('insertOrderedList')}>
          <ListOrdered size={16} />
        </button>
        <button
          className="journal-toolbar-button"
          type="button"
          aria-label="Task list"
          disabled={disabled}
          onClick={() => apply('insertHTML', '<ul data-type="taskList"><li><label><input type="checkbox" /></label><div><p>Task item</p></div></li></ul>')}
        >
          <ListChecks size={16} />
        </button>
        <button className="journal-toolbar-button" type="button" aria-label="Align left" disabled={disabled} onClick={() => apply('justifyLeft')}>
          <AlignLeft size={16} />
        </button>
        <button className="journal-toolbar-button" type="button" aria-label="Align center" disabled={disabled} onClick={() => apply('justifyCenter')}>
          <AlignCenter size={16} />
        </button>
        <button className="journal-toolbar-button" type="button" aria-label="Align right" disabled={disabled} onClick={() => apply('justifyRight')}>
          <AlignRight size={16} />
        </button>
        <button className="journal-toolbar-button" type="button" aria-label="Justify" disabled={disabled} onClick={() => apply('justifyFull')}>
          <AlignJustify size={16} />
        </button>
        <button className="journal-toolbar-button" type="button" aria-label="Undo" disabled={disabled} onClick={() => apply('undo')}>
          <Undo2 size={16} />
        </button>
        <button className="journal-toolbar-button" type="button" aria-label="Redo" disabled={disabled} onClick={() => apply('redo')}>
          <Redo2 size={16} />
        </button>
    </div>
  )

  return (
    <div className={cn('journal-rich-text-shell', shellClassName)}>
      {toolbarHost === undefined ? toolbar : toolbarHost ? createPortal(toolbar, toolbarHost) : null}

      <div
        ref={editorRef}
        aria-label="Journal rich text editor"
        className={cn('journal-rich-text-content', contentClassName)}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onBlur={onBlur}
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
        onDrop={(event) => {
          const files = Array.from(event.dataTransfer?.files ?? []).filter((file) => file.type.startsWith('image/'))
          if (files.length === 0) return
          event.preventDefault()
          void insertUploadedImages(files)
        }}
        onPaste={(event) => {
          const files = Array.from(event.clipboardData?.files ?? []).filter((file) => file.type.startsWith('image/'))
          if (files.length === 0) return
          event.preventDefault()
          void insertUploadedImages(files)
        }}
      />
    </div>
  )
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}
