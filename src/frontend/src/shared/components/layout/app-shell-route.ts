export type AppShellRouteOptions = Readonly<{
  title: string
  description?: string
  contentClassName?: string
}>

export type AppShellRouteHandle = Readonly<{
  appShell: AppShellRouteOptions
}>

export function appShellRoute(options: AppShellRouteOptions): AppShellRouteHandle {
  return { appShell: options }
}

export function readAppShellRoute(handle: unknown): AppShellRouteOptions | null {
  if (!handle || typeof handle !== 'object' || !('appShell' in handle)) {
    return null
  }

  const candidate = (handle as { appShell?: unknown }).appShell
  if (!candidate || typeof candidate !== 'object') {
    return null
  }

  const { title, description, contentClassName } = candidate as Record<string, unknown>
  if (typeof title !== 'string'
    || (description !== undefined && typeof description !== 'string')
    || (contentClassName !== undefined && typeof contentClassName !== 'string')) {
    return null
  }

  return {
    title,
    description: description as string | undefined,
    contentClassName: contentClassName as string | undefined,
  }
}
