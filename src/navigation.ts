export const ACTIVE_NAV_STORAGE_KEY = 'travel_admin_active_nav'
export const CUSTOMER_TOOL_STORAGE_KEY = 'travel_admin_customer_tool'
export const ADMIN_NAV_QUERY_KEY = 'nav'

export const CUSTOMER_TOOLS = new Set(['list', 'imports', 'mapping'])
export const ADMIN_NAV_KEYS = new Set([
  'dashboard',
  'customers',
  'channels',
  'segments',
  'campaign-list',
  'campaigns',
  'tracking',
  'settings'
])

export function isKnownNav(nav) {
  return ADMIN_NAV_KEYS.has(nav)
}

export function isKnownCustomerTool(tool) {
  return CUSTOMER_TOOLS.has(tool)
}

export function normalizeCustomerTool(tool) {
  return isKnownCustomerTool(tool) ? tool : 'list'
}

export function navToPath(nav, customerTool = 'list') {
  if (!isKnownNav(nav)) return '/dashboard'
  if (nav === 'customers') {
    if (customerTool === 'imports') return '/customers/imports'
    if (customerTool === 'mapping') return '/customers/mapping'
    return '/customers'
  }
  return `/${nav}`
}

export function resolveNavigationFromLocation(pathname = '/', queryNav = '') {
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
