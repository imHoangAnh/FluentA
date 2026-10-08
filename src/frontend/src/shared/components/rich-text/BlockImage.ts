import Image from '@tiptap/extension-image'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ImageView } from './ImageView'

export const BlockImage = Image.extend({
  draggable: false,
  addAttributes() {
    return {
      ...this.parent?.(),
      assetId: { default: null, parseHTML: element => element.getAttribute('data-asset-id') ?? element.getAttribute('data-note-asset-id'), renderHTML: attrs => ({ 'data-asset-id': attrs.assetId }) },
      alignment: { default: 'left', parseHTML: element => element.getAttribute('data-image-align') ?? 'left', renderHTML: attrs => ({ 'data-image-align': attrs.alignment }) },
    }
  },
  parseHTML() { return [{ tag: 'img[data-asset-id]' }, { tag: 'img[data-note-asset-id]' }] },
  addNodeView() { return ReactNodeViewRenderer(ImageView) },
}).configure({ inline: false, allowBase64: false })
