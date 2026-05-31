export type ApiRequestOptions = Omit<RequestInit, 'headers' | 'body'> & {
  headers?: HeadersInit
  body?: BodyInit | null
}

export type TokenProvider = () => string

export const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

export function createApiRequest(getToken: TokenProvider) {
  return async function request(path: string, options: ApiRequestOptions = {}) {
    const headers = new Headers(options.headers ?? {})
    if (!(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json')
    }
    const token = getToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
    const response = await fetch(`${API_BASE}${path}`, { ...options, headers })
    if (!response.ok) {
      const text = await response.text()
      const message = extractApiErrorMessage(response, text)
      if (message) {
        throw new Error(message)
      }
      if (response.status === 401 || response.status === 403) {
        throw new Error('当前账号没有权限或登录已失效，请退出后使用 TENANT_OWNER / TENANT_ADMIN 账号重新登录')
      }
      throw new Error(`HTTP ${response.status}`)
    }
    const contentType = response.headers.get('content-type') || ''
    return contentType.includes('application/json') ? response.json() : response.text()
  }
}

export function extractApiErrorMessage(response: Response, text: string) {
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

