import { afterEach, describe, expect, it } from 'vitest'
import {
  DASHBOARD_WIDGET_STORAGE_KEY,
  LEGACY_DASHBOARD_WIDGET_STORAGE_KEY,
  normalizeDashboardWidgetOrder,
  readDashboardWidgetOrder,
  reorderDashboardWidgets,
  toggleDashboardWidget,
} from '@/features/dashboard/dashboard-widget-preferences'
import { dashboardWidgetRows, dashboardWidgetSlotClass } from '@/features/dashboard/dashboard-widgets'

afterEach(() => window.localStorage.clear())

describe('dashboard widget preferences', () => {
  it('starts with the approved three widgets', () => {
    expect(readDashboardWidgetOrder()).toEqual(['review', 'todo', 'countdown'])
  })

  it('keeps the minimum and maximum widget boundaries', () => {
    const minimum = ['review', 'todo', 'countdown'] as const
    expect(toggleDashboardWidget(minimum, 'review')).toEqual(minimum)

    const maximum = ['review', 'todo', 'countdown', 'habits', 'project', 'pomodoro'] as const
    expect(toggleDashboardWidget(maximum, 'review')).toEqual(maximum.slice(1))
    expect(toggleDashboardWidget(minimum, 'habits')).toEqual([...minimum, 'habits'])
  })

  it('migrates the legacy visibility map and repairs invalid order values', () => {
    window.localStorage.setItem(LEGACY_DASHBOARD_WIDGET_STORAGE_KEY, JSON.stringify({ review: true, todo: false, countdown: true, habits: true }))
    expect(readDashboardWidgetOrder()).toEqual(['review', 'countdown', 'habits'])
    expect(JSON.parse(window.localStorage.getItem(DASHBOARD_WIDGET_STORAGE_KEY) ?? '{}')).toEqual({ version: 1, order: ['review', 'countdown', 'habits'] })

    window.localStorage.setItem(DASHBOARD_WIDGET_STORAGE_KEY, JSON.stringify({ version: 1, order: ['unknown', 'project', 'project'] }))
    expect(readDashboardWidgetOrder()).toEqual(['project', 'review', 'todo'])
    expect(normalizeDashboardWidgetOrder(null)).toEqual(['review', 'todo', 'countdown'])
  })

  it('compacts reorder operations without creating interior gaps', () => {
    expect(reorderDashboardWidgets(['review', 'todo', 'countdown', 'habits'], 'habits', 'review')).toEqual(['habits', 'review', 'todo', 'countdown'])
  })

  it('keeps the approved row and slot sequence', () => {
    expect([0, 1, 2, 3, 4, 5].map(dashboardWidgetSlotClass)).toEqual(['col-span-7', 'col-span-5', 'col-span-5', 'col-span-7', 'col-span-7', 'col-span-5'])
    expect(dashboardWidgetRows(3)).toBe('grid-rows-2')
    expect(dashboardWidgetRows(4)).toBe('grid-rows-2')
    expect(dashboardWidgetRows(5)).toBe('grid-rows-3')
    expect(dashboardWidgetRows(6)).toBe('grid-rows-3')
  })
})
