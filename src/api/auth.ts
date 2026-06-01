import { request } from './request'
import type { UserRole } from '../types'

export interface RegisterPayload {
  tenantName: string
  displayName: string
  email: string
  password: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResult {
  accessToken: string
  email: string
  tenantId: string | number
  userId: string | number
  roles?: UserRole[]
}

export const authApi = {
  register(payload: RegisterPayload): Promise<unknown> {
    return request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },
  login(payload: LoginPayload): Promise<LoginResult> {
    return request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    }) as Promise<LoginResult>
  }
}
