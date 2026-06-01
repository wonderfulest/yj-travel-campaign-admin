import type {
  ContactStatus,
  Customer,
  CustomerEditForm,
  CustomerSummary,
  EmailQuality,
  SummaryStatItem
} from '../types'

export const CUSTOMER_API_IMPORT_PATH = '/api/imports/customers-json/api'
export const EMAIL_QUALITY_OPTIONS = ['PENDING', 'VERIFIED', 'BOUNCED', 'MISSING']

export function summarizeCustomers(items: Customer[]): CustomerSummary {
  const countryCounts = new Map<string, number>()
  for (const item of items) {
    const country = String(item.country || '').trim() || '未填写'
    countryCounts.set(country, (countryCounts.get(country) || 0) + 1)
  }
  const reachableCustomers = items.filter(isReachableCustomer).length
  const byEmailQuality = statusStats(items, 'emailQuality')
  const byContactStatus = statusStats(items, 'contactStatus')
  return {
    totalCustomers: items.length,
    customersWithEmail: items.filter((item) => item.email).length,
    pendingEmailCustomers: items.filter((item) => item.emailQuality === 'PENDING').length,
    verifiedEmailCustomers: items.filter((item) => item.emailQuality === 'VERIFIED').length,
    missingEmailCustomers: items.filter((item) => !item.email).length,
    reachableCustomers,
    unreachableCustomers: items.length - reachableCustomers,
    customersByCountry: [...countryCounts.entries()]
      .map(([country, customers]) => ({ country, customers }))
      .sort((left, right) => right.customers - left.customers || left.country.localeCompare(right.country)),
    customersByEmailQuality: byEmailQuality,
    customersByContactStatus: byContactStatus
  }
}

export function statusStats<T extends Record<string, unknown>>(items: T[], key: keyof T): SummaryStatItem[] {
  const counts = new Map<string, number>()
  for (const item of items) {
    const status = String(item[key] || '').trim() || 'UNKNOWN'
    counts.set(status, (counts.get(status) || 0) + 1)
  }
  return [...counts.entries()]
    .map(([status, customers]) => ({ status, customers }))
    .sort((left, right) => right.customers - left.customers || left.status.localeCompare(right.status))
}

export function isReachableCustomer(customer: Customer): boolean {
  if (!customer?.email) return false
  if (customer.emailQuality === 'MISSING') return false
  return !['UNSUBSCRIBED', 'BOUNCED', 'INVALID'].includes(customer.contactStatus)
}

export function defaultCustomerForm(): CustomerEditForm {
  return {
    name: '',
    country: '',
    city: '',
    postcode: '',
    street: '',
    houseNumber: '',
    website: '',
    phone: '',
    email: '',
    emailQuality: 'PENDING',
    contactStatus: 'NOT_CONTACTED',
    businessScope: ''
  }
}

export function buildCustomerEditForm(asset: Partial<Customer> = {}, businessScopeFallback = ''): CustomerEditForm {
  return {
    name: asset.name || '',
    country: asset.country || '',
    city: asset.city || '',
    postcode: asset.postcode || '',
    street: asset.street || '',
    houseNumber: asset.houseNumber || '',
    website: asset.website || '',
    phone: asset.phone || '',
    email: asset.email || '',
    emailQuality: (asset.emailQuality as EmailQuality) || 'PENDING',
    contactStatus: (asset.contactStatus as ContactStatus) || 'NOT_CONTACTED',
    businessScope: asset.businessScope || businessScopeFallback || ''
  }
}
