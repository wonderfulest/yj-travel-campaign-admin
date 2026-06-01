import { computed } from 'vue'
import { defineStore } from 'pinia'
import { pinia } from './pinia.ts'
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
  SummaryStatItem,
  TenantApiSecretRotationResult,
  TenantApiSecretStatus
} from '../types.ts'
import { customersApi } from '../api/customers.ts'
import { appStore } from './useAppStore.ts'
import { API_BASE } from '../api/client.ts'
import { boundedPage, emptyPageResult, normalizePageResult, pageQuery } from '../utils/pagination.ts'

export { PAGE_SIZE_OPTIONS, localPageResult } from '../utils/pagination.ts'

export const CUSTOMER_API_IMPORT_PATH = '/api/imports/customers-json/api'

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
    tenantApiSecretStatus: null as TenantApiSecretStatus | null,
    tenantApiSecretKey: '',
    dictionary: {
      countries: [] as Country[],
      citiesCache: {} as Record<string, City[]>,
      loading: false,
      error: ''
    } as DictionaryState
  })
})

export const customerStore = useCustomerStore(pinia)

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
    customerStore.customerProfile = await customersApi.getAssetProfile(customer.id)
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
    customerStore.customerSummary = await customersApi.getSummary()
  } catch (error) {
    customerStore.customerSummary = null
    appStore.error = `客户统计加载失败：${error.message}`
  }
}

export async function loadCustomers(page = customerStore.customerPage.page): Promise<void> {
  try {
    const result = await customersApi.list(pageQuery(customerStore.customerPage, page))
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
      ? await customersApi.create(body)
      : await customersApi.update(customerStore.selectedCustomer!.id, body)
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
    const updated = await customersApi.updateEmailQuality(customer.id, quality)
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

export async function importCustomerFile(importType: 'json' | 'excel', onSuccess?: () => void): Promise<void> {
  if (!customerStore.importFile) {
    appStore.error = importType === 'excel' ? '请选择客户 Excel 文件' : '请选择客户 JSON 文件'
    return
  }
  const fileName = customerStore.importFile.name.toLowerCase()
  if (importType === 'excel' && !fileName.endsWith('.xlsx')) {
    appStore.error = 'Excel 文件导入只支持 .xlsx 文件'
    return
  }
  if (importType === 'json' && !fileName.endsWith('.json')) {
    appStore.error = 'JSON 导入只支持 .json 文件'
    return
  }
  const importLabel = importType === 'excel' ? 'Excel' : 'JSON'
  appStore.loading = true
  appStore.error = ''
  appStore.notice = ''
  try {
    const form = new FormData()
    form.append('file', customerStore.importFile)
    customerStore.importResult = await customersApi.importFile(importType, form)
    await Promise.allSettled([loadCustomers(), loadCustomerSummary()])
    onSuccess?.()
    appStore.notice = `客户 ${importLabel} 导入完成，已写入来源与客户资产主表`
  } catch (error: unknown) {
    const err = error as { message?: string }
    appStore.error = `导入失败：${err.message}`
  } finally {
    appStore.loading = false
  }
}

export async function importCustomerJson(onSuccess?: () => void): Promise<void> {
  return importCustomerFile('json', onSuccess)
}

export async function downloadCustomerExcelTemplate(): Promise<void> {
  appStore.error = ''
  try {
    const response = await fetch(`${API_BASE}/api/imports/customers-excel-template`, {
      headers: appStore.token ? { Authorization: `Bearer ${appStore.token}` } : {}
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'customer-import-template.xlsx'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  } catch (error: unknown) {
    const err = error as { message?: string }
    appStore.error = `模板下载失败：${err.message}`
  }
}

export async function loadTenantApiSecretStatus(): Promise<void> {
  try {
    customerStore.tenantApiSecretStatus = await customersApi.getTenantApiSecret()
  } catch (error: unknown) {
    const err = error as { message?: string }
    appStore.error = `接口导入密钥状态加载失败：${err.message}`
  }
}

export async function rotateTenantApiSecret(): Promise<void> {
  appStore.loading = true
  appStore.error = ''
  appStore.notice = ''
  try {
    const result = await customersApi.rotateTenantApiSecret()
    customerStore.tenantApiSecretKey = result.secretKey
    customerStore.tenantApiSecretStatus = {
      tenantId: result.tenantId,
      configured: true,
      lastRotatedAt: result.rotatedAt
    }
    appStore.notice = '租户接口导入 Secret Key 已生成，请立即保存'
  } catch (error: unknown) {
    const err = error as { message?: string }
    appStore.error = `Secret Key 生成失败：${err.message}`
  } finally {
    appStore.loading = false
  }
}

export async function loadMappingPreview(): Promise<void> {
  try {
    customerStore.mappingPreview = await customersApi.getMappingPreview()
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
    customerStore.mappingResult = await customersApi.runOsmMapping()
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
    const countries = await customersApi.getCountries()
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
    const cities = await customersApi.getCities(countryId)
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
