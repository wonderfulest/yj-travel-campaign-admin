import { computed } from 'vue'
import {
  BarChart3,
  CheckCircle2,
  GitMerge,
  Mail,
  Send,
  Users
} from 'lucide-vue-next'
import { canAccessNav, setCustomerToolState, useAppStore } from './useAppStore'
import { loadMappingPreview, summarizeCustomers, useCustomerStore } from './useCustomerStore'
import { clearCampaignSelection, fillCampaignForm, loadCampaigns, useCampaignStore } from './useCampaignStore'
import { loadTrackingAnalytics, useTrackingStore } from './useTrackingStore'
import type { Campaign } from '../types'
import { CHART_PALETTE, buildDonut, type DonutItem, type DonutSegment, type DonutChart } from '../utils/donut'
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
} from '../utils/format'
import { navigateToNav } from '../navigationActions'

const appState = () => useAppStore()
const customerState = () => useCustomerStore()
const campaignState = () => useCampaignStore()
const trackingState = () => useTrackingStore()

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
  const summary = customerState().customerSummary || summarizeCustomers(customerState().customers)
  return [
    { label: '客户总数', value: summary.totalCustomers, icon: Users, target: 'customers' },
    { label: '有邮箱客户', value: summary.customersWithEmail, icon: Mail, target: 'customers' },
    { label: '可触达客户', value: summary.reachableCustomers || 0, icon: Send, target: 'customers' },
    { label: '待验证邮箱', value: summary.pendingEmailCustomers, icon: CheckCircle2, target: 'customers' },
    { label: '待 Mapping', value: customerState().mappingPreview?.unmappedCount || 0, icon: GitMerge, target: 'customers', tool: 'mapping' },
    { label: '短链点击', value: trackingState().trackingSummary.totalClicks || 0, icon: BarChart3, target: 'tracking' }
  ].filter((item) => canAccessNav(item.target, appState()) && (!item.tool || canAccessNav(item.tool, appState())))
})

// ─── Donut charts ─────────────────────────────────────────────────────────────

export const customerQualityStats = computed(() => {
  const summary = customerState().customerSummary || summarizeCustomers(customerState().customers)
  return Array.isArray(summary.customersByEmailQuality) ? summary.customersByEmailQuality : []
})

export const customerContactStats = computed(() => {
  const summary = customerState().customerSummary || summarizeCustomers(customerState().customers)
  return Array.isArray(summary.customersByContactStatus) ? summary.customersByContactStatus : []
})

export const customerCountryStats = computed(() => {
  const summary = customerState().customerSummary || summarizeCustomers(customerState().customers)
  return Array.isArray(summary.customersByCountry) ? summary.customersByCountry : []
})

export const customerReachabilityStats = computed(() => {
  const summary = customerState().customerSummary || summarizeCustomers(customerState().customers)
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
  const summary = customerState().customerSummary || summarizeCustomers(customerState().customers)
  return buildDonut([
    { label: '可触达客户', value: summary.reachableCustomers || 0, color: '#0f766e' },
    { label: '不可触达客户', value: summary.unreachableCustomers || 0, color: '#ef4444' }
  ])
})

// ─── Utility formatters (re-exported from src/utils/format) ───────────────────

export async function copyShortLink(url: string, notice = '短链已复制'): Promise<void> {
  if (!url) return
  try {
    await navigator.clipboard?.writeText(url)
    appState().notice = notice
  } catch {
    appState().notice = url
  }
}

// ─── Navigation side-effects ──────────────────────────────────────────────────

export function setCustomerTool(tool: string): void {
  if (tool === 'imports' && !canAccessNav('imports', appState())) {
    appState().error = '当前角色没有使用客户导入的权限'
    return
  }
  if (tool === 'mapping' && !canAccessNav('mapping', appState())) {
    appState().error = '当前角色没有使用资产 Mapping 的权限'
    return
  }
  appState().error = ''
  setCustomerToolState(tool, appState())
  navigateToNav('customers')
  if (tool === 'mapping') {
    loadMappingPreview()
  }
}

export function openStatTarget(item: { target: string; tool?: string }): void {
  if (item.target === 'customers' && item.tool) {
    setCustomerTool(item.tool)
    return
  }
  navigateToNav(item.target)
}

export function uiSetActiveNav(nav: string): void {
  if (!canAccessNav(nav, appState())) {
    appState().error = '当前角色没有访问该页面的权限'
    return
  }
  appState().error = ''
  navigateToNav(nav)
  if (nav !== 'customers') {
    setCustomerToolState('list', appState())
  }
  if (nav === 'customers' && appState().customerTool === 'mapping') {
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
  navigateToNav('campaign-list')
  appState().error = ''
  loadCampaigns()
}

export function startNewCampaign(): void {
  clearCampaignSelection()
  navigateToNav('campaigns')
  appState().error = ''
}

export function openCampaignDetail(campaign: Campaign): void {
  fillCampaignForm(campaign)
  navigateToNav('campaigns', { campaignId: campaign.id })
  appState().error = ''
}
