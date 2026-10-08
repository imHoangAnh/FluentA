export type ApiEnvelope<T> = {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: Record<string, string[]>
  }
}
export type ApiResponse<T> = {
  success: boolean
  message?: string | null
  data?: T
  errors: ApiError[]
  traceId?: string | null
}

export type ApiError = { code: string; message: string; field?: string | null }
