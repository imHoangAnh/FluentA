export const DASHBOARD_WIDGET_IDS = ['review', 'todo', 'countdown', 'habits', 'project', 'pomodoro'] as const

export type DashboardWidgetId = typeof DASHBOARD_WIDGET_IDS[number]

export type DashboardWidgetDefinition = {
  id: DashboardWidgetId
  label: string
}

export const DASHBOARD_WIDGET_CATALOG: readonly DashboardWidgetDefinition[] = [
  { id: 'review', label: 'Review queue' },
  { id: 'todo', label: 'Todo' },
  { id: 'countdown', label: 'Countdowns' },
  { id: 'habits', label: 'Habit tracker' },
  { id: 'project', label: 'Project' },
  { id: 'pomodoro', label: 'Pomodoro' },
]

export const DEFAULT_DASHBOARD_WIDGETS: readonly DashboardWidgetId[] = ['review', 'todo', 'countdown']

export const DASHBOARD_WIDGET_SLOT_CLASSES = [
  'col-span-7',
  'col-span-5',
  'col-span-5',
  'col-span-7',
  'col-span-7',
  'col-span-5',
] as const

export function dashboardWidgetRows(widgetCount: number) {
  return widgetCount > 4 ? 'grid-rows-3' : 'grid-rows-2'
}

export function dashboardWidgetSlotClass(index: number) {
  return DASHBOARD_WIDGET_SLOT_CLASSES[index] ?? DASHBOARD_WIDGET_SLOT_CLASSES[0]
}

export function dashboardWidgetLabel(id: DashboardWidgetId) {
  return DASHBOARD_WIDGET_CATALOG.find((widget) => widget.id === id)?.label ?? id
}
