import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios'

export type ApiRequestOptions = {
  method?: string
  headers?: Record<string, string>
  body?: BodyInit | null
}

export type TokenProvider = () => string

export const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

export function createApiRequest(getToken: TokenProvider) {
  return async function request(path: string, options: ApiRequestOptions = {}) {
    const { method = 'GET', headers = {}, body } = options

    const requestHeaders: Record<string, string> = { ...headers }
    if (!(body instanceof FormData)) {
      requestHeaders['Content-Type'] = 'application/json'
    }
    const token = getToken()
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`
    }

    let data: unknown = undefined
    if (body instanceof FormData) {
      data = body
    } else if (typeof body === 'string') {
      data = body
    } else if (body != null) {
      data = body
    }

    const config: AxiosRequestConfig = {
      baseURL: API_BASE,
      url: path,
      method,
      headers: requestHeaders,
      data,
      transformResponse: (raw) => raw,
    }

    let apiResponse: AxiosResponse<string>
    try {
      apiResponse = await axios.request<string>(config)
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response) {
        const res = err.response as AxiosResponse<string>
        const text = res.data ?? ''
        const response = { headers: { get: (key: string) => res.headers[key.toLowerCase()] ?? '' } }
        const message = extractApiErrorMessage(response, text)
        if (message) throw new Error(message)
        if (res.status === 401 || res.status === 403) {
          throw new Error('当前账号没有权限或登录已失效，请退出后使用 TENANT_OWNER / TENANT_ADMIN 账号重新登录')
        }
        throw new Error(`HTTP ${res.status}`)
      }
      throw err
    }

    const contentType = String(apiResponse.headers['content-type'] || '')
    const text = apiResponse.data ?? ''
    if (contentType.includes('application/json')) {
      try {
        return JSON.parse(text)
      } catch {
        return text
      }
    }
    return text
  }
}

export function extractApiErrorMessage(response: Pick<Response, 'headers'>, text: string) {
  if (!text) return ''
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>
      return String(parsed.detail || parsed.message || parsed.title || '')
    } catch {
      return text
    }
  }
  return text
}
