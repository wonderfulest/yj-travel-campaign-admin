import { createApiRequest, type ApiRequestOptions, type TokenProvider } from './client'

let tokenProvider: TokenProvider = () => ''

export function setTokenProvider(provider: TokenProvider): void {
  tokenProvider = provider
}

export const request = createApiRequest(() => tokenProvider())

export type { ApiRequestOptions }
