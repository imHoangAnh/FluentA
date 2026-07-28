import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/shared/components/ui/context-menu'

describe('shared menu styling', () => {
  it('uses the polished surface and accessible item target for context menus', async () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger>Open actions</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>Rename</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    )

    fireEvent.contextMenu(screen.getByText('Open actions'))

    const menu = await screen.findByRole('menu')
    const item = screen.getByRole('menuitem', { name: 'Rename' })

    expect(menu).toHaveClass('rounded-lg', 'border-border', 'p-1.5')
    expect(item).toHaveClass('min-h-10', 'rounded-md', 'data-[highlighted]:bg-secondary')
  })
})
