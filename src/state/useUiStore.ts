import { computed } from 'vue'
import {
  BarChart3,
  CheckCircle2,
  GitMerge,
  Mail,
  Send,
  Users
} from 'lucide-vue-next'
import { canAccessNav, activateNav, setCustomerToolState } from './useAppStore.ts'
import { appStore } from './useAppStore.ts'
import { customerStore, summarizeCustomers } from './useCustomerStore.ts'
import { campaignStore, clearCampaignSelection, fillCampaignForm } from './useCampaignStore.ts'
import type { Campaign } from '../types.ts'
import { CHART_PALETTE, buildDonut, type DonutItem, type DonutSegment, type DonutChart } from '../utils/donut.ts'
import {
  statusLabel,
  displayValue,
  percentValue,
  normalizedWebsiteUrl,
  formatWebsiteLabel,
  jsonObject,
  localizedName,
  formatLanguages,
  destinationLabel,
  csvToList
} from '../utils/format.ts'

// ─── re-exported pure helpers (moved to src/utils) ────────────────────────────
export { CHART_PALETTE, buildDonut, type DonutItem, type DonutSegment, type DonutChart }
export {
  statusLabel,
  displayValue,
  percentValue,
  normalizedWebsiteUrl,
  formatWebsiteLabel,
  jsonObject,
  localizedName,
  formatLanguages,
  destinationLabel,
  csvToList
}

// ─── Dashboard stats ──────────────────────────────────────────────────────────

export const stats = computed(() => {
  const summary = customerStore.customerSummary || summarizeCustomers(customerStore.customers)
  return [
    { label: '客户总数', value: summary.totalCustomers, icon: Users, target: 'customers' },
    { label: '有邮箱客户', value: summary.customersWithEmail, icon: Mail, target: 'customers' },
    { label: '可触达客户', value: summary.reachableCustomers || 0, icon: Send, target: 'customers' },
    { label: '待验证邮箱', value: summary.pendingEmailCustomers, icon: CheckCircle2, target: 'customers' },
    { label: '待 Mapping', value: customerStore.mappingPreview?.unmappedCount || 0, icon: GitMerge, target: 'customers', tool: 'mapping' },
    { label: '短链点击', value: trackingStore.trackingSummary.totalClicks || 0, icon: BarChart3, target: 'tracking' }
  ].filter((item) => canAccessNav(item.target, appStore) && (!item.tool || canAccessNav(item.tool, appStore)))
})

// ─── Donut charts ─────────────────────────────────────────────────────────────

export const customerQualityStats = computed(() => {
  const summary = customerStore.customerSummary || summarizeCustomers(customerStore.customers)
  return Array.isArray(summary.customersByEmailQuality) ? summary.customersByEmailQuality : []
})

export const customerContactStats = computed(() => {
  const summary = customerStore.customerSummary || summarizeCustomers(customerStore.customers)
  return Array.isArray(summary.customersByContactStatus) ? summary.customersByContactStatus : []
})

export const customerCountryStats = computed(() => {
  const summary = customerStore.customerSummary || summarizeCustomers(customerStore.customers)
  return Array.isArray(summary.customersByCountry) ? summary.customersByCountry : []
})

export const customerReachabilityStats = computed(() => {
  const summary = customerStore.customerSummary || summarizeCustomers(customerStore.customers)
  return [
    { label: '可触达客户', value: summary.reachableCustomers || 0 },
    { label: '不可触达客户', value: summary.unreachableCustomers || 0 },
    { label: '缺少邮箱', value: summary.missingEmailCustomers || 0 },
    { label: '已验证邮箱', value: summary.verifiedEmailCustomers || 0 }
  ]
})

export const qualityDonut = computed(() =>
  buildDonut(customerQualityStats.value.map((item) => ({ label: statusLabel(item.status), value: item.customers })))
)

export const reachabilityDonut = computed(() => {
  const summary = customerStore.customerSummary || summarizeCustomers(customerStore.customers)
  return buildDonut([
    { label: '可触达客户', value: summary.reachableCustomers || 0, color: '#0f766e' },
    { label: '不可触达客户', value: summary.unreachableCustomers || 0, color: '#ef4444' }
  ])
})

// ─── Utility formatters (re-exported from src/utils/format) ───────────────────

export async function copyShortLink(url: string): Promise<void> {
  if (!url) return
  try {
    await navigator.clipboard?.writeText(url)
    appStore.notice = '短链已复制'
  } catch {
    appStore.notice = url
  }
}

// ─── Navigation side-effects ──────────────────────────────────────────────────

export function setCustomerTool(tool: string): void {
  if (tool === 'imports' && !canAccessNav('imports', appStore)) {
    appStore.error = '当前角色没有使用客户导入的权限'
    return
  }
  if (tool === 'mapping' && !canAccessNav('mapping', appStore)) {
    appStore.error = '当前角色没有使用资产 Mapping 的权限'
    return
  }
  appStore.error = ''
  setCustomerToolState(tool, appStore)
  activateNav('customers', appStore)
  if (tool === 'mapping') {
    loadMappingPreview()
  }
}

export function openStatTarget(item: { target: string; tool?: string }): void {
  if (item.target === 'customers' && item.tool) {
    setCustomerTool(item.tool)
    return
  }
  activateNav(item.target, appStore)
}

export function uiSetActiveNav(nav: string): void {
  if (!canAccessNav(nav, appStore)) {
    appStore.error = '当前角色没有访问该页面的权限'
    return
  }
  appStore.error = ''
  activateNav(nav, appStore)
  if (nav !== 'customers') {
    setCustomerToolState('list', appStore)
  }
  if (nav === 'customers' && appStore.customerTool === 'mapping') {
    loadMappingPreview()
  }
  if (nav === 'tracking') {
    loadTrackingAnalytics()
  }
  if (nav === 'campaign-list') {
    loadCampaigns()
  }
}

export function openCampaignList(): void {
  activateNav('campaign-list', appStore)
  appStore.error = ''
  loadCampaigns()
}

export function startNewCampaign(): void {
  clearCampaignSelection()
  activateNav('campaigns', appStore)
  appStore.error = ''
}

export function openCampaignDetail(campaign: Campaign): void {
  fillCampaignForm(campaign)
  activateNav('campaigns', appStore)
  appStore.error = ''
}

