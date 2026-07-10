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
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Redo2,
  Underline,
  Undo2,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type JournalRichTextEditorProps = {
  disabled?: boolean
  content: string
  onChange: (html: string) => void
  onBlur?: () => void
  onImageFiles?: (files: File[]) => Promise<Array<{ id: string; publicUrl: string; alt?: string }>>
  onImageUploadError?: (message: string) => void
}

function runCommand(command: string, value?: string) {
  if (typeof document.execCommand !== 'function') {
    return false
  }

  return document.execCommand(command, false, value)
}

export function JournalRichTextEditor({
  disabled = false,
  content,
  onChange,
  onBlur,
  onImageFiles,
  onImageUploadError,
}: JournalRichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null)
  const [zoom, setZoom] = useState(100)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

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
    runCommand(command, value)
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
        `<p><img src="${upload.publicUrl}" alt="${escapeHtml(upload.alt ?? '')}" data-note-asset-id="${upload.id}" /></p>`).join('')
      insertHtml(html)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Image upload failed.'
      onImageUploadError?.(message)
    } finally {
      setIsUploadingImage(false)
    }
  }

  return (
    <div className="journal-rich-text-shell" style={{ ['--journal-editor-zoom' as string]: `${zoom / 100}` }}>
      <div className="journal-toolbar" role="toolbar" aria-label="Journal formatting tools">
        <button className="journal-toolbar-button" type="button" aria-label="Heading 1" disabled={disabled} onClick={() => apply('formatBlock', 'h1')}>
          <Heading1 size={16} />
        </button>
        <button className="journal-toolbar-button" type="button" aria-label="Heading 2" disabled={disabled} onClick={() => apply('formatBlock', 'h2')}>
          <Heading2 size={16} />
        </button>
        <button className="journal-toolbar-button" type="button" aria-label="Heading 3" disabled={disabled} onClick={() => apply('formatBlock', 'h3')}>
          <Heading3 size={16} />
        </button>
        <button className="journal-toolbar-button" type="button" aria-label="Heading 4" disabled={disabled} onClick={() => apply('formatBlock', 'h4')}>
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
        <button
          className="journal-toolbar-button"
          type="button"
          aria-label="Add link"
          disabled={disabled}
          onClick={() => {
            const url = window.prompt('Enter a URL')
            if (url) apply('createLink', url)
          }}
        >
          <Link2 size={16} />
        </button>
        <button className="journal-toolbar-button" type="button" aria-label="Undo" disabled={disabled} onClick={() => apply('undo')}>
          <Undo2 size={16} />
        </button>
        <button className="journal-toolbar-button" type="button" aria-label="Redo" disabled={disabled} onClick={() => apply('redo')}>
          <Redo2 size={16} />
        </button>
        <label className="journal-toolbar-zoom">
          <span className="journal-toolbar-text">{zoom}%</span>
          <input
            aria-label="Journal zoom"
            disabled={disabled}
            max={150}
            min={80}
            step={10}
            style={{ display: 'none' }}
            type="range"
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
          />
        </label>
      </div>

      <div
        ref={editorRef}
        aria-label="Journal rich text editor"
        className="journal-rich-text-content"
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
