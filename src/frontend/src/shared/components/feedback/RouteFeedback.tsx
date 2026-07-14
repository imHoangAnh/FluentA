import { isRouteErrorResponse, useRouteError } from 'react-router-dom'

export function RouteLoading() {
  return <div className="screen-status" role="status">Loading FluentA...</div>
}

export function RouteError() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error) ? error.statusText : 'Unable to load this page.'
  return <div className="screen-status" role="alert">{message}</div>
}
