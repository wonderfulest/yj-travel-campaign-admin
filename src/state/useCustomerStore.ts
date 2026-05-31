import { computed } from 'vue'
import { defineStore } from 'pinia'
import type {
  City,
  ContactStatus,
  Country,
  Customer,
  CustomerEditForm,
  CustomerProfile,
  CustomerSummary,
  DictionaryState,
  EmailQuality,
  ImportResult,
  MappingPreview,
  MappingResult,
  PageResult,
  SummaryStatItem
} from '../types.ts'
import { request, appStore } from './appContext.ts'

export const useCustomerStore = defineStore('customer', {
  state: () => ({
    customers: [] as Customer[],
    customerSummary: null as CustomerSummary | null,
    customerPage: {
      page: 0,
      size: 20,
      totalItems: 0,
      totalPages: 0,
      hasNext: false,
      hasPrevious: false
    },
    filter: '',
    selectedCustomer: null as Customer | null,
    customerProfile: null as CustomerProfile | null,
    customerProfileLoading: false,
    customerCreateMode: false,
    customerEditMode: false,
    customerEditorKeepSelection: false,
    customerEditForm: {} as CustomerEditForm,
    customerHelpVisible: true,
    mappingPreview: null as MappingPreview | null,
    mappingResult: null as MappingResult | null,
    importFile: null as File | null,
    importResult: null as ImportResult | null,
    dictionary: {
      countries: [] as Country[],
      citiesCache: {} as Record<string, City[]>,
      loading: false,
      error: ''
    } as DictionaryState
  })
})

export const customerStore = useCustomerStore()

export const filteredCustomers = computed(() => {
  const keyword = customerStore.filter.trim().toLowerCase()
  if (!keyword) return customerStore.customers
  return customerStore.customers.filter((item) =>
    [item.name, item.email, item.website, item.country, item.city, item.sourcePrimary]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(keyword))
  )
})


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

export function formatCountryShare(customers: number): string {
  const total = Number((customerStore.customerSummary || summarizeCustomers(customerStore.customers)).totalCustomers || 0)
  if (!total) return '0%'
  return `${Math.round((Number(customers || 0) / total) * 100)}%`
}

export function replaceCustomer(updatedCustomer: Customer): void {
  customerStore.customers = customerStore.customers.map((customer) => (customer.id === updatedCustomer.id ? updatedCustomer : customer))
  if (customerStore.selectedCustomer?.id === updatedCustomer.id) {
    customerStore.selectedCustomer = updatedCustomer
  }
  if (customerStore.customerProfile?.asset?.id === updatedCustomer.id) {
    customerStore.customerProfile = {
      ...customerStore.customerProfile,
      asset: updatedCustomer,
      businessScope: updatedCustomer.businessScope || customerStore.customerProfile.businessScope
    }
  }
}

export function addCustomer(customer: Customer): void {
  const size = Number(customerStore.customerPage.size || 20)
  const totalItems = Number(customerStore.customerPage.totalItems || 0) + 1
  const totalPages = Math.max(1, Math.ceil(totalItems / size))
  customerStore.customers = [customer, ...customerStore.customers.filter((item) => item.id !== customer.id)].slice(0, size)
  customerStore.customerPage = {
    ...customerStore.customerPage,
    page: 0,
    totalItems,
    totalPages,
    hasPrevious: false,
    hasNext: totalPages > 1
  }
}

export function profileAsset(): Customer {
  return customerStore.customerProfile?.asset || customerStore.selectedCustomer || ({} as Customer)
}

export async function openCustomerDetail(customer: Customer): Promise<void> {
  customerStore.selectedCustomer = customer
  customerStore.customerProfile = null
  customerStore.customerEditorKeepSelection = false
  customerStore.customerCreateMode = false
  customerStore.customerEditMode = false
  customerStore.customerEditForm = buildCustomerEditForm(customer)
  await loadCustomerProfile(customer)
}

export function closeCustomerDetail(): void {
  closeCustomerDialog()
}

export function closeCustomerDialog(): void {
  customerStore.selectedCustomer = null
  customerStore.customerProfile = null
  customerStore.customerEditorKeepSelection = false
  resetCustomerEditorState()
}

export function closeCustomerEditor(): void {
  if (!customerStore.customerEditorKeepSelection) {
    customerStore.selectedCustomer = null
    customerStore.customerProfile = null
  }
  customerStore.customerEditorKeepSelection = false
  resetCustomerEditorState()
}

export function resetCustomerEditorState(): void {
  customerStore.customerCreateMode = false
  customerStore.customerEditMode = false
  customerStore.customerEditorKeepSelection = false
  customerStore.customerEditForm = {} as CustomerEditForm
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

export function openCustomerCreate(): void {
  customerStore.selectedCustomer = null
  customerStore.customerProfile = null
  customerStore.customerCreateMode = true
  customerStore.customerEditMode = true
  customerStore.customerEditorKeepSelection = false
  customerStore.customerEditForm = defaultCustomerForm()
}

export async function openCustomerEdit(customer?: Customer): Promise<void> {
  const asset = customer || profileAsset()
  const keepSelection = Boolean(customerStore.selectedCustomer && !customerStore.customerCreateMode && !customerStore.customerEditMode)
  customerStore.selectedCustomer = asset
  customerStore.customerProfile = null
  customerStore.customerCreateMode = false
  customerStore.customerEditMode = true
  customerStore.customerEditorKeepSelection = keepSelection
  customerStore.customerEditForm = buildCustomerEditForm(asset)
  if (asset?.id) {
    await loadCustomerProfile(asset)
  }
}

export function buildCustomerEditForm(asset: Partial<Customer> = {}): CustomerEditForm {
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
    businessScope: asset.businessScope || customerStore.customerProfile?.businessScope || ''
  }
}

export async function loadCustomerProfile(customer: Customer | null = customerStore.selectedCustomer): Promise<void> {
  if (!customer?.id) return
  customerStore.customerProfileLoading = true
  try {
    customerStore.customerProfile = await request(`/api/customers/${customer.id}/asset-profile`) as CustomerProfile
    if (customerStore.customerProfile?.asset) {
      customerStore.selectedCustomer = customerStore.customerProfile.asset
      replaceCustomer(customerStore.customerProfile.asset)
    }
  } catch (error: unknown) {
    customerStore.customerProfile = {
      asset: customer,
      businessScope: customer.businessScope || '',
      travelProfile: null,
      destinations: [],
      languages: [],
      sources: []
    }
    const err = error as { message?: string }
    if (err?.message && err.message !== '客户资产不存在或无权访问') {
      appStore.error = `客户全局画像加载失败：${err.message}`
    }
  } finally {
    customerStore.customerProfileLoading = false
  }
}

export async function loadCustomerSummary(): Promise<void> {
  try {
    customerStore.customerSummary = await request('/api/customers/summary')
  } catch (error) {
    customerStore.customerSummary = null
    appStore.error = `客户统计加载失败：${error.message}`
  }
}

export async function loadCustomers(page = customerStore.customerPage.page): Promise<void> {
  try {
    const result = await request(`/api/customers?${pageQuery(customerStore.customerPage, page)}`)
    const pageResult = normalizePageResult<Customer>(result, [], page, customerStore.customerPage.size)
    customerStore.customers = pageResult.items
    customerStore.customerPage = pageResult
    if (customerStore.selectedCustomer) {
      customerStore.selectedCustomer = pageResult.items.find((item) => item.id === customerStore.selectedCustomer!.id) || null
    }
  } catch (error: unknown) {
    const err = error as { message?: string }
    customerStore.customers = []
    customerStore.customerPage = emptyPageResult<Customer>(0, customerStore.customerPage.size)
    customerStore.selectedCustomer = null
    appStore.error = `客户资产加载失败：${err.message}`
  }
}

export async function saveCustomerEdit(): Promise<void> {
  if (!customerStore.customerCreateMode && !customerStore.selectedCustomer) return
  appStore.loading = true
  appStore.error = ''
  appStore.notice = ''
  try {
    const body = { ...customerStore.customerEditForm }
    const updated = customerStore.customerCreateMode
      ? await request('/api/customers', {
          method: 'POST',
          body: JSON.stringify(body)
        }) as Customer
      : await request(`/api/customers/${customerStore.selectedCustomer!.id}`, {
          method: 'PUT',
          body: JSON.stringify(body)
        }) as Customer
    if (customerStore.customerCreateMode) {
      addCustomer(updated)
    } else {
      replaceCustomer(updated)
    }
    await loadCustomerSummary()
    const wasCreating = customerStore.customerCreateMode
    customerStore.selectedCustomer = updated
    resetCustomerEditorState()
    await loadCustomerProfile(updated)
    appStore.notice = wasCreating ? '客户资产已创建' : '客户资产已更新'
  } catch (error: unknown) {
    const err = error as { message?: string }
    appStore.error = err.message || '保存失败'
  } finally {
    appStore.loading = false
  }
}

export const EMAIL_QUALITY_OPTIONS = ['PENDING', 'VERIFIED', 'BOUNCED', 'MISSING']

export async function updateEmailQuality(customer: Customer, quality: EmailQuality): Promise<void> {
  if (!customer || customer.emailQuality === quality) return
  appStore.loading = true
  appStore.error = ''
  appStore.notice = ''
  try {
    const updated = await request(`/api/customers/${customer.id}/email-quality`, {
      method: 'PATCH',
      body: JSON.stringify({ emailQuality: quality })
    }) as Customer
    replaceCustomer(updated)
    await loadCustomerSummary()
    appStore.notice = `邮箱状态已更新为 ${quality}`
  } catch (error: unknown) {
    const err = error as { message?: string }
    appStore.error = err.message || '更新失败'
  } finally {
    appStore.loading = false
  }
}

export function changeCustomerPage(nextPage: number): void {
  if (nextPage < 0 || (customerStore.customerPage.totalPages && nextPage >= customerStore.customerPage.totalPages)) return
  loadCustomers(nextPage)
}

export function jumpCustomerPage(pageNumber: number | string): void {
  const nextPage = boundedPage(customerStore.customerPage, pageNumber)
  if (nextPage === null || nextPage === customerStore.customerPage.page) return
  loadCustomers(nextPage)
}

export function changeCustomerPageSize(size: number | string): void {
  const nextSize = Number(size)
  if (!nextSize) return
  customerStore.customerPage.size = nextSize
  loadCustomers(0)
}

export async function importCustomerJson(onSuccess?: () => void): Promise<void> {
  if (!customerStore.importFile) {
    appStore.error = '请选择客户 JSON 文件'
    return
  }
  appStore.loading = true
  appStore.error = ''
  appStore.notice = ''
  try {
    const form = new FormData()
    form.append('file', customerStore.importFile)
    customerStore.importResult = await request('/api/imports/customers-json', {
      method: 'POST',
      body: form
    }) as ImportResult
    await Promise.allSettled([loadCustomers(), loadCustomerSummary()])
    onSuccess?.()
    appStore.notice = '客户 JSON 导入完成，已写入来源与客户资产主表'
  } catch (error: unknown) {
    const err = error as { message?: string }
    appStore.error = `导入失败：${err.message}`
  } finally {
    appStore.loading = false
  }
}

export async function loadMappingPreview(): Promise<void> {
  try {
    customerStore.mappingPreview = await request('/api/customer-mapping/osm/preview') as MappingPreview
  } catch (error: unknown) {
    const err = error as { message?: string }
    customerStore.mappingPreview = null
    appStore.error = `Mapping 预览加载失败：${err.message}`
  }
}

export async function runOsmMapping(): Promise<void> {
  appStore.loading = true
  appStore.error = ''
  appStore.notice = ''
  try {
    customerStore.mappingResult = await request('/api/customer-mapping/osm', {
      method: 'POST',
      body: JSON.stringify({})
    }) as MappingResult
    await Promise.allSettled([loadCustomers(), loadCustomerSummary(), loadMappingPreview()])
    appStore.notice = 'OSM 来源已 mapping 到客户资产主表'
  } catch (error: unknown) {
    const err = error as { message?: string }
    appStore.error = `Mapping 失败：${err.message}`
  } finally {
    appStore.loading = false
  }
}

export function onFileChange(event: Event): void {
  const target = event.target as HTMLInputElement
  customerStore.importFile = target.files?.[0] || null
}

export async function loadDictionaryCountries(): Promise<void> {
  if (customerStore.dictionary.countries.length > 0) return
  customerStore.dictionary.loading = true
  customerStore.dictionary.error = ''
  try {
    const countries = await request('/api/dictionary/countries') as Country[]
    customerStore.dictionary.countries = countries || []
  } catch (error: unknown) {
    const err = error as { message?: string }
    customerStore.dictionary.error = err.message || '加载国家列表失败'
    console.error('Failed to load countries:', error)
  } finally {
    customerStore.dictionary.loading = false
  }
}

export async function loadDictionaryCities(countryId: string): Promise<void> {
  if (!countryId) return
  if (customerStore.dictionary.citiesCache[countryId]) return
  customerStore.dictionary.loading = true
  customerStore.dictionary.error = ''
  try {
    const cities = await request(`/api/dictionary/cities?countryId=${encodeURIComponent(countryId)}`) as City[]
    customerStore.dictionary.citiesCache[countryId] = cities || []
  } catch (error: unknown) {
    const err = error as { message?: string }
    customerStore.dictionary.error = err.message || '加载城市列表失败'
    console.error('Failed to load cities:', error)
  } finally {
    customerStore.dictionary.loading = false
  }
}

export function getCitiesByCountryId(countryId: string): City[] {
  return customerStore.dictionary.citiesCache[countryId] || []
}

export function clearDictionaryCache(): void {
  customerStore.dictionary.countries = []
  customerStore.dictionary.citiesCache = {}
  customerStore.dictionary.error = ''
}

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

interface PageInfo {
  page: number
  size: number
}

export function pageQuery(pageInfo: PageInfo, nextPage = pageInfo.page): string {
  const params = new URLSearchParams({
    page: String(Math.max(0, nextPage)),
    size: String(pageInfo.size)
  })
  return params.toString()
}

export function boundedPage(pageInfo: { totalPages?: number }, pageNumber: number | string): number | null {
  const value = Number(pageNumber)
  if (!Number.isFinite(value)) return null
  const totalPages = Number(pageInfo.totalPages || 0)
  if (!totalPages) return null
  return Math.min(Math.max(Math.trunc(value) - 1, 0), totalPages - 1)
}

export function emptyPageResult<T>(page = 0, size = 20): PageResult<T> {
  return {
    items: [],
    page,
    size,
    totalItems: 0,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false
  }
}

interface PageResultLike<T> {
  items?: T[]
  page?: number
  size?: number
  totalItems?: number
  totalPages?: number
  hasNext?: boolean
  hasPrevious?: boolean
}

export function normalizePageResult<T>(result: T[] | PageResultLike<T> | null | undefined, fallbackItems: T[] = [], fallbackPage = 0, fallbackSize = 20): PageResult<T> {
  if (Array.isArray(result)) {
    return {
      items: result,
      page: fallbackPage,
      size: fallbackSize,
      totalItems: result.length,
      totalPages: result.length ? 1 : 0,
      hasNext: false,
      hasPrevious: false
    }
  }
  const items = Array.isArray(result?.items) ? result.items : fallbackItems
  const size = Number(result?.size || fallbackSize)
  const totalItems = Number(result?.totalItems ?? items.length)
  return {
    items,
    page: Number(result?.page || 0),
    size,
    totalItems,
    totalPages: Number(result?.totalPages ?? (totalItems ? Math.ceil(totalItems / size) : 0)),
    hasNext: Boolean(result?.hasNext),
    hasPrevious: Boolean(result?.hasPrevious)
  }
}

export function localPageResult<T>(items: T[], page = 0, size = 20): PageResult<T> {
  const safeSize = Number(size) > 0 ? Number(size) : 20
  const safePage = Math.max(0, Number(page) || 0)
  const totalItems = items.length
  const totalPages = totalItems ? Math.ceil(totalItems / safeSize) : 0
  const currentPage = totalPages ? Math.min(safePage, totalPages - 1) : 0
  const fromIndex = currentPage * safeSize
  return {
    items: items.slice(fromIndex, fromIndex + safeSize),
    page: currentPage,
    size: safeSize,
    totalItems,
    totalPages,
    hasNext: currentPage + 1 < totalPages,
    hasPrevious: currentPage > 0
  }
}
