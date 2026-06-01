export const ACTIVE_NAV_STORAGE_KEY = 'travel_admin_active_nav'
export const CUSTOMER_TOOL_STORAGE_KEY = 'travel_admin_customer_tool'
export const ADMIN_NAV_QUERY_KEY = 'nav'

export type CustomerToolKey = 'list' | 'imports' | 'mapping'
export type NavKey =
  | 'dashboard'
  | 'customers'
  | 'channels'
  | 'segments'
  | 'campaign-list'
  | 'campaigns'
  | 'tracking'
  | 'settings'

export interface NavigationState {
  nav: NavKey
  customerTool: CustomerToolKey
}

export const CUSTOMER_TOOLS = new Set<CustomerToolKey>(['list', 'imports', 'mapping'])
export const ADMIN_NAV_KEYS = new Set([
  'dashboard',
  'customers',
  'channels',
  'segments',
  'campaign-list',
  'campaigns',
  'tracking',
  'settings'
] as NavKey[])

export function isKnownNav(nav: unknown): nav is NavKey {
  return ADMIN_NAV_KEYS.has(nav as NavKey)
}

export function isKnownCustomerTool(tool: unknown): tool is CustomerToolKey {
  return CUSTOMER_TOOLS.has(tool as CustomerToolKey)
}

export function normalizeCustomerTool(tool: unknown): CustomerToolKey {
  return isKnownCustomerTool(tool) ? tool : 'list'
}

export function navToPath(nav: unknown, customerTool: CustomerToolKey = 'list'): string {
  if (!isKnownNav(nav)) return '/dashboard'
  if (nav === 'customers') {
    if (customerTool === 'imports') return '/customers/imports'
    if (customerTool === 'mapping') return '/customers/mapping'
    return '/customers'
  }
  return `/${nav}`
}

export function resolveNavigationFromLocation(pathname = '/', queryNav = ''): NavigationState {
  if (isKnownNav(queryNav)) {
    return {
      nav: queryNav,
      customerTool: queryNav === 'customers' ? 'list' : 'list'
    }
  }

  if (pathname === '/customers/imports') {
    return { nav: 'customers', customerTool: 'imports' }
  }

  if (pathname === '/customers/mapping') {
    return { nav: 'customers', customerTool: 'mapping' }
  }

  if (pathname === '/customers' || pathname === '/customers/list') {
    return { nav: 'customers', customerTool: 'list' }
  }

  const nav = String(pathname || '')
    .replace(/^\//, '')
    .split('/')[0]

  return {
    nav: isKnownNav(nav) ? nav : 'dashboard',
    customerTool: 'list'
  }
}
