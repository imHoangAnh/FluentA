import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import csharp from 'highlight.js/lib/languages/csharp'
import css from 'highlight.js/lib/languages/css'
import javascript from 'highlight.js/lib/languages/javascript'
import python from 'highlight.js/lib/languages/python'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Braces,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  UnderlineIcon,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { createLowlight } from 'lowlight'
import { useEffect, useState } from 'react'

const lowlight = createLowlight({ csharp, css, javascript, python, typescript, xml })
const zoomLevels = [0.9, 1, 1.1, 1.25] as const

type JournalRichTextEditorProps = {
  content: string
  disabled?: boolean
  onChange: (html: string) => void
}

type ToolbarButtonProps = {
  active?: boolean
  disabled?: boolean
  label: string
  onClick: () => void
  children: React.ReactNode
}

function ToolbarButton({ active = false, disabled = false, label, onClick, children }: ToolbarButtonProps) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={active ? 'journal-toolbar-button journal-toolbar-button--active' : 'journal-toolbar-button'}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  )
}

export function JournalRichTextEditor({ content, disabled = false, onChange }: JournalRichTextEditorProps) {
  const [zoomLevel, setZoomLevel] = useState<(typeof zoomLevels)[number]>(1)
  const editor = useEditor({
    content,
    editable: !disabled,
    immediatelyRender: true,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [1, 2, 3, 4] },
      }),
      Underline,
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({
        autolink: true,
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      CodeBlockLowlight.configure({ lowlight }),
    ],
    editorProps: {
      attributes: {
        'aria-label': 'Journal content',
        'data-testid': 'journal-content-input',
        class: 'journal-rich-text-content',
      },
    },
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getHTML()),
  })

  useEffect(() => {
    editor?.setEditable(!disabled)
  }, [disabled, editor])

  useEffect(() => {
    if (editor && editor.getHTML() !== content) {
      editor.commands.setContent(content, false)
    }
  }, [content, editor])

  if (!editor) {
    return <div className="journal-rich-text-shell journal-rich-text-shell--loading">Loading editor...</div>
  }

  const setLink = () => {
    const current = editor.getAttributes('link').href as string | undefined
    const href = window.prompt('Link URL', current ?? 'https://')
    if (href === null) return
    if (!href.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: href.trim() }).run()
  }

  const adjustZoom = (direction: -1 | 1) => {
    setZoomLevel((current) => {
      const index = zoomLevels.indexOf(current)
      const nextIndex = Math.max(0, Math.min(zoomLevels.length - 1, index + direction))
      return zoomLevels[nextIndex]
    })
  }

  return (
    <div
      className={disabled ? 'journal-rich-text-shell journal-rich-text-shell--disabled' : 'journal-rich-text-shell'}
      style={{ ['--journal-editor-zoom' as string]: String(zoomLevel) }}
    >
      <div className="journal-toolbar" aria-label="Journal formatting toolbar" role="toolbar">
        <ToolbarButton label="Undo" disabled={disabled || !editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><Undo2 size={17} /></ToolbarButton>
        <ToolbarButton label="Redo" disabled={disabled || !editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><Redo2 size={17} /></ToolbarButton>
        <ToolbarButton label="Heading 1" active={editor.isActive('heading', { level: 1 })} disabled={disabled} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 size={17} /></ToolbarButton>
        <ToolbarButton label="Heading 2" active={editor.isActive('heading', { level: 2 })} disabled={disabled} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={17} /></ToolbarButton>
        <ToolbarButton label="Heading 3" active={editor.isActive('heading', { level: 3 })} disabled={disabled} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={17} /></ToolbarButton>
        <ToolbarButton label="Heading 4" active={editor.isActive('heading', { level: 4 })} disabled={disabled} onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}><span className="journal-toolbar-text">H4</span></ToolbarButton>
        <ToolbarButton label="Bold" active={editor.isActive('bold')} disabled={disabled} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={17} /></ToolbarButton>
        <ToolbarButton label="Italic" active={editor.isActive('italic')} disabled={disabled} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={17} /></ToolbarButton>
        <ToolbarButton label="Underline" active={editor.isActive('underline')} disabled={disabled} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon size={17} /></ToolbarButton>
        <ToolbarButton label="Strikethrough" active={editor.isActive('strike')} disabled={disabled} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={17} /></ToolbarButton>
        <ToolbarButton label="Highlight" active={editor.isActive('highlight')} disabled={disabled} onClick={() => editor.chain().focus().toggleHighlight().run()}><Highlighter size={17} /></ToolbarButton>
        <ToolbarButton label="Bullet list" active={editor.isActive('bulletList')} disabled={disabled} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={17} /></ToolbarButton>
        <ToolbarButton label="Numbered list" active={editor.isActive('orderedList')} disabled={disabled} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={17} /></ToolbarButton>
        <ToolbarButton label="Task list" active={editor.isActive('taskList')} disabled={disabled} onClick={() => editor.chain().focus().toggleTaskList().run()}><ListChecks size={17} /></ToolbarButton>
        <ToolbarButton label="Align left" active={editor.isActive({ textAlign: 'left' })} disabled={disabled} onClick={() => editor.chain().focus().setTextAlign('left').run()}><AlignLeft size={17} /></ToolbarButton>
        <ToolbarButton label="Align center" active={editor.isActive({ textAlign: 'center' })} disabled={disabled} onClick={() => editor.chain().focus().setTextAlign('center').run()}><AlignCenter size={17} /></ToolbarButton>
        <ToolbarButton label="Align right" active={editor.isActive({ textAlign: 'right' })} disabled={disabled} onClick={() => editor.chain().focus().setTextAlign('right').run()}><AlignRight size={17} /></ToolbarButton>
        <ToolbarButton label="Justify" active={editor.isActive({ textAlign: 'justify' })} disabled={disabled} onClick={() => editor.chain().focus().setTextAlign('justify').run()}><AlignJustify size={17} /></ToolbarButton>
        <ToolbarButton label="Zoom out" disabled={disabled || zoomLevel === zoomLevels[0]} onClick={() => adjustZoom(-1)}><ZoomOut size={17} /></ToolbarButton>
        <button className="journal-toolbar-zoom" disabled type="button">{Math.round(zoomLevel * 100)}%</button>
        <ToolbarButton label="Zoom in" disabled={disabled || zoomLevel === zoomLevels[zoomLevels.length - 1]} onClick={() => adjustZoom(1)}><ZoomIn size={17} /></ToolbarButton>
        <ToolbarButton label="Blockquote" active={editor.isActive('blockquote')} disabled={disabled} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={17} /></ToolbarButton>
        <ToolbarButton label="Code block" active={editor.isActive('codeBlock')} disabled={disabled} onClick={() => editor.chain().focus().toggleCodeBlock().run()}><Braces size={17} /></ToolbarButton>
        <ToolbarButton label="Link" active={editor.isActive('link')} disabled={disabled} onClick={setLink}><Link2 size={17} /></ToolbarButton>
        <ToolbarButton label="Horizontal rule" disabled={disabled} onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus size={17} /></ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
