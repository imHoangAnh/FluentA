import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

type RefreshHandler = () => Promise<string | null>

let getAccessToken: () => string | null = () => null
let setAccessToken: (token: string | null) => void = () => undefined
let refreshAccess: RefreshHandler = async () => null

export const rawApiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:5000/api/v1',
  withCredentials: true,
})

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:5000/api/v1',
  withCredentials: true,
})

export function configureAuthTransport(options: {
  getAccessToken: () => string | null
  setAccessToken: (token: string | null) => void
  refreshAccess: RefreshHandler
}) {
  getAccessToken = options.getAccessToken
  setAccessToken = options.setAccessToken
  refreshAccess = options.refreshAccess
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig & { _retry?: boolean }) => {
  const token = getAccessToken()
  if (token && !config._retry) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
    const url = original?.url ?? ''
    const isRefreshRequest = url.includes('/auth/refresh')
    const isAuthEntry = url.includes('/auth/login') || url.includes('/auth/register')

    if (error.response?.status !== 401 || !original || original._retry || isRefreshRequest || isAuthEntry) {
      throw error
    }

    original._retry = true
    const token = await refreshAccess()
    if (!token) {
      setAccessToken(null)
      throw error
    }

    original.headers.Authorization = `Bearer ${token}`
    return apiClient(original)
  },
)
