import { createApiRequest, type ApiRequestOptions, type TokenProvider, type UnauthorizedHandler } from './client'

let tokenProvider: TokenProvider = () => ''
let unauthorizedHandler: UnauthorizedHandler = () => {}

export function setTokenProvider(provider: TokenProvider): void {
  tokenProvider = provider
}

export function setUnauthorizedHandler(handler: UnauthorizedHandler): void {
  unauthorizedHandler = handler
}

export const request = createApiRequest(() => tokenProvider(), () => unauthorizedHandler())

export type { ApiRequestOptions }
