import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { habitIconOptions } from './habit-icon-options'
import { HabitIconGlyph } from './habit-icons'

describe('HabitIconGlyph', () => {
  it('keeps the approved semantic icon list exhaustive and renderable', () => {
    expect(habitIconOptions.map((option) => option.value)).toEqual([
      'Default',
      'Book',
      'Exercise',
      'Water',
      'Meditation',
      'Study',
      'Work',
      'Health',
    ])

    for (const option of habitIconOptions) {
      const { container, unmount } = render(<HabitIconGlyph icon={option.value} />)
      expect(container.querySelector('svg')).not.toBeNull()
      unmount()
    }
  })
})
