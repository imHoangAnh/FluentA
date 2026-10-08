import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { useRef } from 'react'

export function ImageView({ node, selected, updateAttributes, editor }: NodeViewProps) {
  const imageRef = useRef<HTMLImageElement>(null)
  const drag = useRef<{ startX: number; width: number; ratio: number; nextWidth: number } | null>(null)
  const alignment = node.attrs.alignment as 'left' | 'center' | 'right'
  return <NodeViewWrapper className="rich-text-image-block" style={{ textAlign: alignment }} data-image-block="true">
    <span className="rich-text-image-frame" contentEditable={false} style={{ position: 'relative', display: 'inline-block', maxWidth: '100%', width: node.attrs.width ? `${node.attrs.width}px` : undefined }}>
      <img ref={imageRef} src={node.attrs.src || undefined} alt={node.attrs.alt || ''} data-asset-id={node.attrs.assetId} data-image-align={alignment}
        width={node.attrs.width ?? undefined} height={node.attrs.height ?? undefined} draggable={false}
        style={{ display: 'block', maxWidth: '100%', height: 'auto', width: '100%' }} />
      {selected && editor.isEditable && <button type="button" aria-label="Resize image" className="rich-text-image-resize" onPointerDown={event => {
        event.preventDefault()
        const image = imageRef.current
        if (!image || !image.naturalWidth) return
        const width = image.getBoundingClientRect().width
        drag.current = { startX: event.clientX, width, ratio: image.naturalHeight / image.naturalWidth, nextWidth: width }
        event.currentTarget.setPointerCapture(event.pointerId)
      }} onPointerMove={event => {
        if (!drag.current || !imageRef.current) return
        const max = imageRef.current.closest('[data-image-block]')!.getBoundingClientRect().width
        const width = Math.round(Math.max(50, Math.min(max, 4096, 4096 / drag.current.ratio, drag.current.width + event.clientX - drag.current.startX)))
        drag.current.nextWidth = width
        imageRef.current.parentElement!.style.width = `${width}px`
      }} onPointerUp={() => {
        if (!drag.current) return
        updateAttributes({ width: Math.round(drag.current.nextWidth), height: Math.max(1, Math.round(drag.current.nextWidth * drag.current.ratio)) })
        drag.current = null
      }} onPointerCancel={() => {
        drag.current = null
        if (imageRef.current) imageRef.current.parentElement!.style.width = node.attrs.width ? `${node.attrs.width}px` : ''
      }}>↘</button>}
    </span>
  </NodeViewWrapper>
}

