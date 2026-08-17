import { arrayMove } from '@dnd-kit/sortable'
import { DASHBOARD_WIDGET_IDS, DEFAULT_DASHBOARD_WIDGETS, type DashboardWidgetId } from './dashboard-widgets'

export const DASHBOARD_WIDGET_STORAGE_KEY = 'dashboard-widget-layout'
export const LEGACY_DASHBOARD_WIDGET_STORAGE_KEY = 'dashboard-visible-widgets'
const DASHBOARD_WIDGET_STORAGE_VERSION = 1
const MIN_DASHBOARD_WIDGETS = 3
const MAX_DASHBOARD_WIDGETS = DASHBOARD_WIDGET_IDS.length

type StoredDashboardWidgetLayout = {
  version: number
  order: unknown
}

function isDashboardWidgetId(value: unknown): value is DashboardWidgetId {
  return typeof value === 'string' && (DASHBOARD_WIDGET_IDS as readonly string[]).includes(value)
}

function uniqueKnownIds(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.filter(isDashboardWidgetId).filter((id, index, ids) => ids.indexOf(id) === index)
}

export function normalizeDashboardWidgetOrder(value: unknown): DashboardWidgetId[] {
  const knownIds = uniqueKnownIds(value)
  const next = [...knownIds]

  for (const defaultId of DEFAULT_DASHBOARD_WIDGETS) {
    if (next.length >= MIN_DASHBOARD_WIDGETS) break
    if (!next.includes(defaultId)) next.push(defaultId)
  }

  for (const catalogId of DASHBOARD_WIDGET_IDS) {
    if (next.length >= MIN_DASHBOARD_WIDGETS) break
    if (!next.includes(catalogId)) next.push(catalogId)
  }

  return next.slice(0, MAX_DASHBOARD_WIDGETS)
}

function readStoredValue(storage: Storage | undefined, key: string) {
  if (!storage) return null
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

function browserStorage() {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  } catch {
    return undefined
  }
}

function parseStoredOrder(raw: string | null) {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as StoredDashboardWidgetLayout
    if (parsed?.version !== DASHBOARD_WIDGET_STORAGE_VERSION) return null
    const order = normalizeDashboardWidgetOrder(parsed.order)
    return order.length >= MIN_DASHBOARD_WIDGETS ? order : null
  } catch {
    return null
  }
}

function parseLegacyVisibility(raw: string | null) {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const order = DASHBOARD_WIDGET_IDS.filter((id) => parsed[id] === true)
    return order.length > 0 ? normalizeDashboardWidgetOrder(order) : null
  } catch {
    return null
  }
}

export function readDashboardWidgetOrder(storage?: Storage) {
  const source = storage ?? browserStorage()
  const storedOrder = parseStoredOrder(readStoredValue(source, DASHBOARD_WIDGET_STORAGE_KEY))
  if (storedOrder) return storedOrder

  const legacyOrder = parseLegacyVisibility(readStoredValue(source, LEGACY_DASHBOARD_WIDGET_STORAGE_KEY))
  if (legacyOrder) {
    persistDashboardWidgetOrder(legacyOrder, source)
    return legacyOrder
  }

  return [...DEFAULT_DASHBOARD_WIDGETS]
}

export function persistDashboardWidgetOrder(order: readonly DashboardWidgetId[], storage?: Storage) {
  const source = storage ?? browserStorage()
  if (!source) return
  try {
    source.setItem(DASHBOARD_WIDGET_STORAGE_KEY, JSON.stringify({ version: DASHBOARD_WIDGET_STORAGE_VERSION, order: normalizeDashboardWidgetOrder(order) }))
  } catch {
    // Browser storage can be unavailable or full; the in-memory state remains usable.
  }
}

export function toggleDashboardWidget(order: readonly DashboardWidgetId[], id: DashboardWidgetId) {
  const current = normalizeDashboardWidgetOrder(order)
  if (current.includes(id)) {
    return current.length <= MIN_DASHBOARD_WIDGETS ? current : current.filter((widgetId) => widgetId !== id)
  }
  return current.length >= MAX_DASHBOARD_WIDGETS ? current : [...current, id]
}

export function reorderDashboardWidgets(order: readonly DashboardWidgetId[], activeId: string, overId: string) {
  const current = normalizeDashboardWidgetOrder(order)
  const oldIndex = current.indexOf(activeId as DashboardWidgetId)
  const newIndex = current.indexOf(overId as DashboardWidgetId)
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return current
  return arrayMove(current, oldIndex, newIndex)
}
