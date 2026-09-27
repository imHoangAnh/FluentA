import type { HubConnection } from '@microsoft/signalr'
import { ensureRealtimeAuthIsFresh, hasAuthLogoutMarker } from './client'

const apiUrl = import.meta.env.VITE_API_URL ?? 'https://localhost:7000/api/v1'
const hubUrl = `${apiUrl.replace(/\/api\/v1\/?$/, '')}/hubs/sync`
const retryDelays = [1_000, 5_000, 15_000, 30_000]

/** Each restart revalidates the cookie before opening a new authenticated hub. */
export function connectAuthenticatedSync(
  configure: (connection: HubConnection) => void,
  onConnected?: () => void,
) {
  let disposed = false
  let connection: HubConnection | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let attempt = 0
  let starting = false

  function schedule() {
    if (disposed || timer || hasAuthLogoutMarker()) return
    const delay = retryDelays[Math.min(attempt++, retryDelays.length - 1)]
    timer = setTimeout(() => { timer = undefined; void start() }, delay)
  }

  async function start() {
    if (disposed || starting || hasAuthLogoutMarker()) return
    starting = true
    try {
      const { HubConnectionBuilder } = await import('@microsoft/signalr')
      if (disposed) return
      await ensureRealtimeAuthIsFresh()
      if (disposed || hasAuthLogoutMarker()) return
      if (!connection) {
        connection = new HubConnectionBuilder().withUrl(hubUrl).build()
        configure(connection)
        connection.onclose(schedule)
      }
      await connection.start()
      if (disposed || hasAuthLogoutMarker()) {
        await connection.stop()
        return
      }
      attempt = 0
      onConnected?.()
    } catch {
      schedule()
    } finally {
      starting = false
    }
  }

  void start()
  return () => {
    disposed = true
    if (timer) clearTimeout(timer)
    if (connection) void connection.stop().catch(() => undefined)
  }
}
