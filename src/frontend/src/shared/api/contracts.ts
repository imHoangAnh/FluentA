export type ApiResponse<T> = {
  success: boolean
  message?: string | null
  data?: T
  errors: ApiError[]
  traceId?: string | null
}

export type ApiError = { code: string; message: string; field?: string | null }

export type PagedResult<T> = {
  items: T[]
  pageNumber: number
  pageSize: number
  totalItems: number
  totalPages: number
}
