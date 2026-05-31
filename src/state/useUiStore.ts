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
import { appStore } from './appContext.ts'
import { customerStore, summarizeCustomers, loadCustomerSummary, loadCustomers, loadMappingPreview } from './useCustomerStore.ts'
import { channelStore, loadChannels } from './useChannelStore.ts'
import { segmentStore, summarizeSegments, loadSegments, loadSegmentSummary } from './useSegmentStore.ts'
import { campaignStore, loadCampaigns, clearCampaignSelection, fillCampaignForm } from './useCampaignStore.ts'
import type { Campaign } from '../types.ts'
import { trackingStore, loadTrackingAnalytics } from './useTrackingStore.ts'

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

export const CHART_PALETTE = ['#0f766e', '#2563eb', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#64748b', '#0ea5e9']

export interface DonutItem {
  label: string
  value: number
  color?: string
}

export interface DonutSegment {
  label: string
  value: number
  percent: number
  color: string
  dashArray: string
  dashOffset: number
}

export interface DonutChart {
  radius: number
  circumference: number
  total: number
  segments: DonutSegment[]
}

export function buildDonut(items: DonutItem[]): DonutChart {
  const data = (items || []).filter((item) => Number(item.value) > 0)
  const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0)
  const radius = 52
  const circumference = 2 * Math.PI * radius
  let offset = 0
  const segments = data.map((item, index) => {
    const value = Number(item.value || 0)
    const fraction = total ? value / total : 0
    const length = fraction * circumference
    const segment: DonutSegment = {
      label: item.label,
      value,
      percent: Math.round(fraction * 100),
      color: item.color || CHART_PALETTE[index % CHART_PALETTE.length],
      dashArray: `${length} ${circumference - length}`,
      dashOffset: -offset
    }
    offset += length
    return segment
  })
  return { radius, circumference, total, segments }
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: '待验证',
    VERIFIED: '已验证',
    BOUNCED: '退信',
    MISSING: '缺失',
    NOT_CONTACTED: '未触达',
    READY_TO_VERIFY: '待复核',
    CONTACTED: '已触达',
    UNSUBSCRIBED: '已退订',
    INVALID: '无效',
    UNKNOWN: '未知'
  }
  return labels[status] || status || '未知'
}

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

// ─── Utility formatters ───────────────────────────────────────────────────────

export function displayValue<T>(value: T): T | '-' {
  if (value === null || value === undefined || value === '') return '-'
  return value
}

export function percentValue(value: number | string | undefined): string {
  return `${Math.round(Number(value || 0) * 100)}%`
}

export function normalizedWebsiteUrl(website: string | undefined): string {
  const value = String(website || '').trim()
  if (!value) return ''
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

export function formatWebsiteLabel(website: string | undefined): string {
  return String(website || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/$/, '')
}

export function jsonObject(value: unknown): unknown {
  if (!value) return null
  if (typeof value === 'object') return value
  try {
    return JSON.parse(String(value))
  } catch {
    return null
  }
}

export function localizedName(value: unknown): string {
  const parsed = jsonObject(value) as Record<string, string> | null
  if (!parsed) return displayValue(value) as string
  return parsed.zh || parsed['zh-CN'] || parsed.en || Object.values(parsed).find(Boolean) || '-'
}

export function formatLanguages(languages: unknown[]): string {
  if (!languages?.length) return '-'
  return languages.map((item) => localizedName(item)).filter((item) => item && item !== '-').join('、') || '-'
}

interface Destination {
  country?: { id: string; name: unknown }
  city?: { name: unknown; country?: { id: string } }
  worldRegion?: { name: unknown }
  iataAirport?: { id: string; name: unknown }
}

export function destinationLabel(destination: Destination | null | undefined): string {
  if (!destination) return '-'
  if (destination.country) return `${destination.country.id} ${localizedName(destination.country.name)}`
  if (destination.city) return `${localizedName(destination.city.name)}${destination.city.country?.id ? ` / ${destination.city.country.id}` : ''}`
  if (destination.worldRegion) return localizedName(destination.worldRegion.name)
  if (destination.iataAirport) return `${destination.iataAirport.id} ${localizedName(destination.iataAirport.name)}`
  return '-'
}

export function csvToList(value: unknown): string[] {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

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
  setActiveNav(item.target)
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

// ─── refreshAll ───────────────────────────────────────────────────────────────

export async function refreshAll(): Promise<void> {
  const loaders: Promise<void>[] = []
  if (canAccessNav('customers', appStore) || canAccessNav('dashboard', appStore)) {
    loaders.push(loadCustomers())
    loaders.push(loadCustomerSummary())
  }
  if (canAccessNav('channels', appStore)) {
    loaders.push(loadChannels())
  } else {
    channelStore.channels = []
  }
  if (canAccessNav('segments', appStore)) {
    loaders.push(loadSegments())
    loaders.push(loadSegmentSummary())
  } else {
    segmentStore.segments = []
    segmentStore.segmentSummary = null
  }
  if (canAccessNav('campaign-list', appStore) || canAccessNav('campaigns', appStore)) {
    loaders.push(loadCampaigns())
  } else {
    campaignStore.campaigns = []
  }
  if (canAccessNav('tracking', appStore)) {
    loaders.push(loadTrackingAnalytics())
  } else {
    trackingStore.trackingSummary = { totalClicks: 0, clickedCustomers: 0, shortLinks: 0, clickRate: 0 }
    trackingStore.trackingTimeseries = []
    trackingStore.trackingUtmStats = []
    trackingStore.trackingLinkStats = []
    trackingStore.trackingEvents = []
  }
  if (canAccessNav('mapping', appStore)) {
    loaders.push(loadMappingPreview())
  } else {
    customerStore.mappingPreview = null
  }
  await Promise.allSettled(loaders)
}
