import { computed } from 'vue'
import { defineStore } from 'pinia'
import type {
  City,
  Country,
  Customer,
  CustomerEditForm,
  CustomerProfile,
  DictionaryState,
  EmailQuality,
  ImportResult,
  MappingPreview,
  MappingResult,
  TenantApiSecretRotationResult,
  TenantApiSecretStatus
} from '../types'
import { customersApi } from '../api/customers'
import { useAppStore } from './useAppStore'
import { API_BASE } from '../api/client'
import { boundedPage, emptyPageResult, normalizePageResult, pageQuery } from '../utils/pagination'
import {
  buildCustomerEditForm as buildCustomerEditFormValue,
  CUSTOMER_API_IMPORT_PATH,
  EMAIL_QUALITY_OPTIONS,
  defaultCustomerForm,
  summarizeCustomers
} from '../utils/customerConfig'

export { PAGE_SIZE_OPTIONS, localPageResult } from '../utils/pagination'
export {
  CUSTOMER_API_IMPORT_PATH,
  EMAIL_QUALITY_OPTIONS,
  defaultCustomerForm,
  isReachableCustomer,
  statusStats,
  summarizeCustomers
} from '../utils/customerConfig'

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
    customerSearchIndexSyncing: false,
    customerCountryTop: 10,
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

const customerState = () => useCustomerStore()
const appState = () => useAppStore()

export const filteredCustomers = computed(() => {
  return customerState().customers
})


export function formatCountryShare(customers: number): string {
  const total = Number((customerState().customerSummary || summarizeCustomers(customerState().customers)).totalCustomers || 0)
  if (!total) return '0%'
  return `${Math.round((Number(customers || 0) / total) * 100)}%`
}

export function replaceCustomer(updatedCustomer: Customer): void {
  customerState().customers = customerState().customers.map((customer) => (customer.id === updatedCustomer.id ? updatedCustomer : customer))
  if (customerState().selectedCustomer?.id === updatedCustomer.id) {
    customerState().selectedCustomer = updatedCustomer
  }
  if (customerState().customerProfile?.asset?.id === updatedCustomer.id) {
    customerState().customerProfile = {
      ...customerState().customerProfile,
      asset: updatedCustomer,
      businessScope: updatedCustomer.businessScope || customerState().customerProfile.businessScope
    }
  }
}

export function addCustomer(customer: Customer): void {
  const size = Number(customerState().customerPage.size || 20)
  const totalItems = Number(customerState().customerPage.totalItems || 0) + 1
  const totalPages = Math.max(1, Math.ceil(totalItems / size))
  customerState().customers = [customer, ...customerState().customers.filter((item) => item.id !== customer.id)].slice(0, size)
  customerState().customerPage = {
    ...customerState().customerPage,
    page: 0,
    totalItems,
    totalPages,
    hasPrevious: false,
    hasNext: totalPages > 1
  }
}

export function profileAsset(): Customer {
  return customerState().customerProfile?.asset || customerState().selectedCustomer || ({} as Customer)
}

export async function openCustomerDetail(customer: Customer): Promise<void> {
  customerState().selectedCustomer = customer
  customerState().customerProfile = null
  customerState().customerEditorKeepSelection = false
  customerState().customerCreateMode = false
  customerState().customerEditMode = false
  customerState().customerEditForm = buildCustomerEditForm(customer)
  await loadCustomerProfile(customer)
}

export function closeCustomerDetail(): void {
  closeCustomerDialog()
}

export function closeCustomerDialog(): void {
  customerState().selectedCustomer = null
  customerState().customerProfile = null
  customerState().customerEditorKeepSelection = false
  resetCustomerEditorState()
}

export function closeCustomerEditor(): void {
  if (!customerState().customerEditorKeepSelection) {
    customerState().selectedCustomer = null
    customerState().customerProfile = null
  }
  customerState().customerEditorKeepSelection = false
  resetCustomerEditorState()
}

export function resetCustomerEditorState(): void {
  customerState().customerCreateMode = false
  customerState().customerEditMode = false
  customerState().customerEditorKeepSelection = false
  customerState().customerEditForm = {} as CustomerEditForm
}

export function openCustomerCreate(): void {
  customerState().selectedCustomer = null
  customerState().customerProfile = null
  customerState().customerCreateMode = true
  customerState().customerEditMode = true
  customerState().customerEditorKeepSelection = false
  customerState().customerEditForm = defaultCustomerForm()
}

export async function openCustomerEdit(customer?: Customer): Promise<void> {
  const asset = customer || profileAsset()
  const keepSelection = Boolean(customerState().selectedCustomer && !customerState().customerCreateMode && !customerState().customerEditMode)
  customerState().selectedCustomer = asset
  customerState().customerProfile = null
  customerState().customerCreateMode = false
  customerState().customerEditMode = true
  customerState().customerEditorKeepSelection = keepSelection
  customerState().customerEditForm = buildCustomerEditForm(asset)
  if (asset?.id) {
    await loadCustomerProfile(asset)
  }
}

export function buildCustomerEditForm(asset: Partial<Customer> = {}): CustomerEditForm {
  return buildCustomerEditFormValue(asset, customerState().customerProfile?.businessScope)
}

export async function loadCustomerProfile(customer: Customer | null = customerState().selectedCustomer): Promise<void> {
  if (!customer?.id) return
  customerState().customerProfileLoading = true
  try {
    customerState().customerProfile = await customersApi.getAssetProfile(customer.id)
    if (customerState().customerProfile?.asset) {
      customerState().selectedCustomer = customerState().customerProfile.asset
      replaceCustomer(customerState().customerProfile.asset)
    }
  } catch (error: unknown) {
    customerState().customerProfile = {
      asset: customer,
      businessScope: customer.businessScope || '',
      travelProfile: null,
      destinations: [],
      languages: [],
      sources: []
    }
    const err = error as { message?: string }
    if (err?.message && err.message !== '客户资产不存在或无权访问') {
      appState().error = `客户全局画像加载失败：${err.message}`
    }
  } finally {
    customerState().customerProfileLoading = false
  }
}

export async function loadCustomerSummary(): Promise<void> {
  try {
    customerState().customerSummary = await customersApi.getSummary(customerState().customerCountryTop)
  } catch (error) {
    customerState().customerSummary = null
    appState().error = `客户统计加载失败：${error.message}`
  }
}

export async function changeCustomerCountryTop(topCountries: number): Promise<void> {
  customerState().customerCountryTop = Number(topCountries || 10)
  await loadCustomerSummary()
}

export async function loadCustomers(page = customerState().customerPage.page): Promise<void> {
  try {
    const query = pageQuery(customerState().customerPage, page)
    const keyword = customerState().filter.trim()
    const result = keyword ? await customersApi.search(query, keyword) : await customersApi.list(query)
    const pageResult = normalizePageResult<Customer>(result, [], page, customerState().customerPage.size)
    customerState().customers = pageResult.items
    customerState().customerPage = pageResult
    if (customerState().selectedCustomer) {
      customerState().selectedCustomer = pageResult.items.find((item) => item.id === customerState().selectedCustomer!.id) || null
    }
  } catch (error: unknown) {
    const err = error as { message?: string }
    customerState().customers = []
    customerState().customerPage = emptyPageResult<Customer>(0, customerState().customerPage.size)
    customerState().selectedCustomer = null
    appState().error = `客户资产加载失败：${err.message}`
  }
}

let customerSearchTimer: ReturnType<typeof window.setTimeout> | null = null

export function searchCustomers(): void {
  if (customerSearchTimer) {
    window.clearTimeout(customerSearchTimer)
  }
  customerSearchTimer = window.setTimeout(() => {
    void loadCustomers(0)
  }, 300)
}

export async function syncCustomerSearchIndex(): Promise<void> {
  if (customerState().customerSearchIndexSyncing) return
  customerState().customerSearchIndexSyncing = true
  appState().error = ''
  appState().notice = ''
  try {
    const result = await customersApi.syncSearchIndex()
    appState().notice = `搜索引擎索引同步完成，共同步 ${result.indexedAssets} 条客户资产`
  } catch (error: unknown) {
    const err = error as { message?: string }
    appState().error = `搜索引擎索引同步失败：${err.message || '请求处理失败'}`
  } finally {
    customerState().customerSearchIndexSyncing = false
  }
}

export async function saveCustomerEdit(): Promise<void> {
  if (!customerState().customerCreateMode && !customerState().selectedCustomer) return
  appState().loading = true
  appState().error = ''
  appState().notice = ''
  try {
    const body = { ...customerState().customerEditForm }
    const updated = customerState().customerCreateMode
      ? await customersApi.create(body)
      : await customersApi.update(customerState().selectedCustomer!.id, body)
    if (customerState().customerCreateMode) {
      addCustomer(updated)
    } else {
      replaceCustomer(updated)
    }
    await loadCustomerSummary()
    const wasCreating = customerState().customerCreateMode
    customerState().selectedCustomer = updated
    resetCustomerEditorState()
    await loadCustomerProfile(updated)
    appState().notice = wasCreating ? '客户资产已创建' : '客户资产已更新'
  } catch (error: unknown) {
    const err = error as { message?: string }
    appState().error = err.message || '保存失败'
  } finally {
    appState().loading = false
  }
}

export async function updateEmailQuality(customer: Customer, quality: EmailQuality): Promise<void> {
  if (!customer || customer.emailQuality === quality) return
  appState().loading = true
  appState().error = ''
  appState().notice = ''
  try {
    const updated = await customersApi.updateEmailQuality(customer.id, quality)
    replaceCustomer(updated)
    await loadCustomerSummary()
    appState().notice = `邮箱状态已更新为 ${quality}`
  } catch (error: unknown) {
    const err = error as { message?: string }
    appState().error = err.message || '更新失败'
  } finally {
    appState().loading = false
  }
}

export async function deleteCustomer(customer: Customer): Promise<void> {
  if (!customer?.id) return
  const label = customer.name || customer.email || customer.id
  if (!window.confirm(`确认删除客户资产「${label}」？此操作会删除主表记录，并保留来源数据用于后续追溯或重新合并。`)) return
  appState().loading = true
  appState().error = ''
  appState().notice = ''
  try {
    await customersApi.delete(customer.id)
    if (customerState().selectedCustomer?.id === customer.id) {
      closeCustomerDialog()
    }
    const currentPage = customerState().customerPage.page
    const shouldGoPrevious = customerState().customers.length <= 1 && currentPage > 0
    await Promise.allSettled([
      loadCustomers(shouldGoPrevious ? currentPage - 1 : currentPage),
      loadCustomerSummary()
    ])
    appState().notice = '客户资产已删除'
  } catch (error: unknown) {
    const err = error as { message?: string }
    appState().error = `客户资产删除失败：${err.message || '请求处理失败'}`
  } finally {
    appState().loading = false
  }
}

export function changeCustomerPage(nextPage: number): void {
  if (nextPage < 0 || (customerState().customerPage.totalPages && nextPage >= customerState().customerPage.totalPages)) return
  loadCustomers(nextPage)
}

export function jumpCustomerPage(pageNumber: number | string): void {
  const nextPage = boundedPage(customerState().customerPage, pageNumber)
  if (nextPage === null || nextPage === customerState().customerPage.page) return
  loadCustomers(nextPage)
}

export function changeCustomerPageSize(size: number | string): void {
  const nextSize = Number(size)
  if (!nextSize) return
  customerState().customerPage.size = nextSize
  loadCustomers(0)
}

export async function importCustomerFile(importType: 'json' | 'excel', onSuccess?: () => void): Promise<void> {
  if (!customerState().importFile) {
    appState().error = importType === 'excel' ? '请选择客户 Excel 文件' : '请选择客户 JSON 文件'
    return
  }
  const fileName = customerState().importFile.name.toLowerCase()
  if (importType === 'excel' && !fileName.endsWith('.xlsx')) {
    appState().error = 'Excel 文件导入只支持 .xlsx 文件'
    return
  }
  if (importType === 'json' && !fileName.endsWith('.json')) {
    appState().error = 'JSON 导入只支持 .json 文件'
    return
  }
  const importLabel = importType === 'excel' ? 'Excel' : 'JSON'
  appState().loading = true
  appState().error = ''
  appState().notice = ''
  try {
    const form = new FormData()
    form.append('file', customerState().importFile)
    customerState().importResult = await customersApi.importFile(importType, form)
    await Promise.allSettled([loadCustomers(), loadCustomerSummary()])
    onSuccess?.()
    appState().notice = `客户 ${importLabel} 导入完成，已写入来源与客户资产主表`
  } catch (error: unknown) {
    const err = error as { message?: string }
    appState().error = `导入失败：${err.message}`
  } finally {
    appState().loading = false
  }
}

export async function importCustomerJson(onSuccess?: () => void): Promise<void> {
  return importCustomerFile('json', onSuccess)
}

export async function downloadCustomerExcelTemplate(): Promise<void> {
  appState().error = ''
  try {
    const response = await fetch(`${API_BASE}/api/imports/customers-excel-template`, {
      headers: appState().token ? { Authorization: `Bearer ${appState().token}` } : {}
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
    appState().error = `模板下载失败：${err.message}`
  }
}

export async function loadTenantApiSecretStatus(): Promise<void> {
  try {
    customerState().tenantApiSecretStatus = await customersApi.getTenantApiSecret()
  } catch (error: unknown) {
    const err = error as { message?: string }
    appState().error = `接口导入密钥状态加载失败：${err.message}`
  }
}

export async function rotateTenantApiSecret(): Promise<void> {
  appState().loading = true
  appState().error = ''
  appState().notice = ''
  try {
    const result = await customersApi.rotateTenantApiSecret()
    customerState().tenantApiSecretKey = result.secretKey
    customerState().tenantApiSecretStatus = {
      tenantId: result.tenantId,
      configured: true,
      lastRotatedAt: result.rotatedAt
    }
    appState().notice = '租户接口导入 Secret Key 已生成，请立即保存'
  } catch (error: unknown) {
    const err = error as { message?: string }
    appState().error = `Secret Key 生成失败：${err.message}`
  } finally {
    appState().loading = false
  }
}

export async function loadMappingPreview(): Promise<void> {
  try {
    customerState().mappingPreview = await customersApi.getMappingPreview()
  } catch (error: unknown) {
    const err = error as { message?: string }
    customerState().mappingPreview = null
    appState().error = `Mapping 预览加载失败：${err.message}`
  }
}

export async function runOsmMapping(): Promise<void> {
  appState().loading = true
  appState().error = ''
  appState().notice = ''
  try {
    customerState().mappingResult = await customersApi.runOsmMapping()
    await Promise.allSettled([loadCustomers(), loadCustomerSummary(), loadMappingPreview()])
    appState().notice = 'OSM 来源已 mapping 到客户资产主表'
  } catch (error: unknown) {
    const err = error as { message?: string }
    appState().error = `Mapping 失败：${err.message}`
  } finally {
    appState().loading = false
  }
}

export function onFileChange(event: Event): void {
  const target = event.target as HTMLInputElement
  customerState().importFile = target.files?.[0] || null
}

export async function loadDictionaryCountries(): Promise<void> {
  if (customerState().dictionary.countries.length > 0) return
  customerState().dictionary.loading = true
  customerState().dictionary.error = ''
  try {
    const countries = await customersApi.getCountries()
    customerState().dictionary.countries = countries || []
  } catch (error: unknown) {
    const err = error as { message?: string }
    customerState().dictionary.error = err.message || '加载国家列表失败'
    console.error('Failed to load countries:', error)
  } finally {
    customerState().dictionary.loading = false
  }
}

export async function loadDictionaryCities(countryId: string): Promise<void> {
  if (!countryId) return
  if (customerState().dictionary.citiesCache[countryId]) return
  customerState().dictionary.loading = true
  customerState().dictionary.error = ''
  try {
    const cities = await customersApi.getCities(countryId)
    customerState().dictionary.citiesCache[countryId] = cities || []
  } catch (error: unknown) {
    const err = error as { message?: string }
    customerState().dictionary.error = err.message || '加载城市列表失败'
    console.error('Failed to load cities:', error)
  } finally {
    customerState().dictionary.loading = false
  }
}

export function getCitiesByCountryId(countryId: string): City[] {
  return customerState().dictionary.citiesCache[countryId] || []
}

export function clearDictionaryCache(): void {
  customerState().dictionary.countries = []
  customerState().dictionary.citiesCache = {}
  customerState().dictionary.error = ''
}
