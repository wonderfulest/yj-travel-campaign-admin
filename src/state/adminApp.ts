import { computed, nextTick } from 'vue'
import { createPinia, defineStore, setActivePinia } from 'pinia'
import type {
  AuthForm,
  AuthMode,
  Campaign,
  CampaignForm,
  CampaignStatus,
  Channel,
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
  Segment,
  SegmentForm,
  SegmentRefreshResult,
  SegmentRule,
  SegmentRuleCondition,
  SegmentSummary,
  SmtpForm,
  AwsSesForm,
  SummaryStatItem,
  TestEmail,
  TrackingEvent,
  TrackingFilter,
  TrackingLinkStat,
  TrackingSummary,
  TrackingTimeseriesPoint,
  TrackingUtmStat,
  User,
  UserRole
} from '../types.ts'
import {
  BarChart3,
  CheckCircle2,
  Database,
  GitMerge,
  Layers,
  Mail,
  PlugZap,
  Send,
  Settings,
  Users
} from 'lucide-vue-next'
import { createApiRequest } from '../api/client.ts'
import router from '../router'
import StatGrid from '../components/common/StatGrid.vue'
import CustomerHelpPanel from '../components/common/CustomerHelpPanel.vue'
import AppSidebar from '../layout/AppSidebar.vue'
import AppTopbar from '../layout/AppTopbar.vue'
import pioneerChinaEmailTemplate from '../assets/templates/pioneer-china-email.html?raw'
import AuthView from '../views/auth/AuthView.vue'
import CampaignDialogs from '../views/campaigns/CampaignDialogs.vue'
import CampaignListView from '../views/campaigns/CampaignListView.vue'
import CampaignWorkbenchView from '../views/campaigns/CampaignWorkbenchView.vue'
import ChannelsView from '../views/channels/ChannelsView.vue'
import CustomerAssetsView from '../views/customers/CustomerAssetsView.vue'
import CustomerImportView from '../views/customers/CustomerImportView.vue'
import CustomerMappingView from '../views/customers/CustomerMappingView.vue'
import CustomerToolTabs from '../views/customers/CustomerToolTabs.vue'
import DashboardView from '../views/dashboard/DashboardView.vue'
import SegmentsView from '../views/segments/SegmentsView.vue'
import SettingsView from '../views/settings/SettingsView.vue'
import TrackingView from '../views/tracking/TrackingView.vue'
import {
  ACTIVE_NAV_STORAGE_KEY,
  ADMIN_NAV_QUERY_KEY,
  CUSTOMER_TOOL_STORAGE_KEY,
  CUSTOMER_TOOLS,
  navToPath,
  normalizeCustomerTool,
  resolveNavigationFromLocation
} from '../navigation'
import {
  cloneTemplateVariables,
  parseTemplateVariables,
  renderTemplatePreview,
  scanTemplateVariableKeys,
  syncTemplateVariables,
  templateVariablesToJson
} from '../utils/templateVariables.ts'

setActivePinia(createPinia())

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]
export const REQUIRED_TRACKING_LINK_PARAM = 'trackingLink'
export const REQUIRED_TRACKING_LINK_MESSAGE = 'HTML 模板必须包含短链参数 ${trackingLink}'
export const DEFAULT_TEMPLATE_VARIABLES = [
  { key: 'customerName', label: '客户名称', sampleValue: 'Reisen Scala', required: true },
  { key: 'companyName', label: '公司名称', sampleValue: 'Youjie Tech', required: false },
  { key: REQUIRED_TRACKING_LINK_PARAM, label: '短链', sampleValue: 'https://s.example.com/china-trip-demo', required: true }
]
export const EMPTY_TEMPLATE_PREVIEW_HTML = '<!doctype html><html><body style="font-family:Arial,sans-serif;color:#667;margin:24px;">暂无可预览的邮件模板</body></html>'

export function initialAdminNav() {
  const queryNav = new URLSearchParams(window.location.search).get(ADMIN_NAV_QUERY_KEY)
  const routeState = resolveNavigationFromLocation(window.location.pathname, queryNav)
  if (routeState.nav !== 'dashboard' || window.location.pathname !== '/') return routeState.nav
  const storedNav = localStorage.getItem(ACTIVE_NAV_STORAGE_KEY)
  return resolveNavigationFromLocation('/', storedNav).nav
}

export const useAdminStore = defineStore('admin', {
  state: () => ({
    token: localStorage.getItem('travel_admin_token') || '',
    user: JSON.parse(localStorage.getItem('travel_admin_user') || 'null') as User | null,
    authMode: 'login' as AuthMode,
    authForm: {
      tenantName: 'Youjie Tech',
      displayName: 'Owner',
      email: 'owner@example.com',
      password: 'secret123'
    } as AuthForm,
    activeNav: initialAdminNav(),
    sidebarCollapsed: localStorage.getItem('travel_admin_sidebar_collapsed') === 'true',
    loading: false,
    error: '',
    notice: '',
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
    channels: [] as Channel[],
    channelPage: {
      page: 0,
      size: 20,
      totalItems: 0,
      totalPages: 0,
      hasNext: false,
      hasPrevious: false
    },
    segments: [] as Segment[],
    segmentSummary: null as SegmentSummary | null,
    segmentPage: {
      page: 0,
      size: 20,
      totalItems: 0,
      totalPages: 0,
      hasNext: false,
      hasPrevious: false
    },
    segmentMembers: [] as Customer[],
    segmentMemberPage: {
      page: 0,
      size: 20,
      totalItems: 0,
      totalPages: 0,
      hasNext: false,
      hasPrevious: false
    },
    selectedSegment: null as Segment | null,
    segmentForm: {
      id: '',
      name: '',
      description: '',
      rules: [] as SegmentRuleCondition[]
    } as SegmentForm,
    segmentRefreshResult: null as SegmentRefreshResult | null,
    campaigns: [] as Campaign[],
    campaignPage: {
      page: 0,
      size: 20,
      totalItems: 0,
      totalPages: 0,
      hasNext: false,
      hasPrevious: false
    },
    trackingSummary: {
      totalClicks: 0,
      clickedCustomers: 0,
      shortLinks: 0,
      clickRate: 0
    } as TrackingSummary,
    trackingTimeseries: [] as TrackingTimeseriesPoint[],
    trackingUtmStats: [] as TrackingUtmStat[],
    trackingLinkStats: [] as TrackingLinkStat[],
    trackingLinkPage: {
      page: 0,
      size: 20,
      totalItems: 0,
      totalPages: 0,
      hasNext: false,
      hasPrevious: false
    },
    trackingEvents: [] as TrackingEvent[],
    trackingEventPage: {
      page: 0,
      size: 20,
      totalItems: 0,
      totalPages: 0,
      hasNext: false,
      hasPrevious: false
    },
    trackingFilter: {
      campaignId: ''
    } as TrackingFilter,
    selectedCampaign: null as Campaign | null,
    campaignForm: {
      name: '先锋中国行程推广邮件',
      objective: '向海外旅行社推广 9 天 8 晚中国文化线路',
      subject: 'China Discovery from US$399+ for ${customerName}',
      fromName: 'Youjie Travel Partnerships',
      htmlBody: pioneerChinaEmailTemplate,
      templateVariables: cloneTemplateVariables(DEFAULT_TEMPLATE_VARIABLES),
      trackingTargetUrl: 'https://www.example.com/travel-agency-partnership',
      trackingShortCode: 'china-trip',
      trackingUtmSource: 'email',
      trackingUtmMedium: 'email',
      trackingUtmCampaign: '1780118309231001',
      trackingUtmContent: 'template_a',
      trackingUtmTerm: '',
      channelId: '',
      segmentIds: [] as (string | number)[]
    } as CampaignForm,
    trackingLinkDialogOpen: false,
    finalConfirmDialogOpen: false,
    testEmailDialogOpen: false,
    testEmails: [] as TestEmail[],
    selectedTestEmails: [] as string[],
    newTestEmail: '',
    segmentDropdownOpen: false,
    segmentDropdownQuery: '',
    templatePreviewHtml: '',
    templatePreviewSubject: '',
    templatePreviewError: '',
    templatePreviewLoading: false,
    mappingPreview: null as MappingPreview | null,
    mappingResult: null as MappingResult | null,
    customerTool: CUSTOMER_TOOLS.has(localStorage.getItem(CUSTOMER_TOOL_STORAGE_KEY))
      ? localStorage.getItem(CUSTOMER_TOOL_STORAGE_KEY) as 'list' | 'import' | 'mapping'
      : 'list',
    channelType: 'smtp' as 'smtp' | 'aws-ses',
    smtpForm: {
      name: 'SMTP Gmail',
      smtpHost: 'smtp.gmail.com',
      smtpPort: 465,
      smtpEncryption: 'SSL',
      smtpUsername: '',
      smtpPassword: '',
      fromEmail: 'noreply@example.com',
      fromName: 'Youjie Tech',
      replyTo: 'reply@example.com'
    } as SmtpForm,
    awsSesForm: {
      name: 'SES Frankfurt',
      fromEmail: 'noreply@example.com',
      fromName: 'Youjie Tech',
      replyTo: 'reply@example.com',
      awsRegion: 'eu-central-1',
      awsAccessKeyId: '',
      awsSecretAccessKey: ''
    } as AwsSesForm,
    importFile: null as File | null,
    importResult: null as ImportResult | null,
    filter: '',
    selectedCustomer: null as Customer | null,
    customerProfile: null as CustomerProfile | null,
    customerProfileLoading: false,
    customerCreateMode: false,
    customerEditMode: false,
    customerEditorKeepSelection: false,
    customerEditForm: {} as CustomerEditForm,
    customerHelpVisible: true,
    dictionary: {
      countries: [] as Country[],
      citiesCache: {} as Record<string, City[]>,
      loading: false,
      error: ''
    } as DictionaryState
  })
})

export const state = useAdminStore()
export const request = createApiRequest(() => state.token)

export const isLoggedIn = computed(() => Boolean(state.token))
export const navItems = [
  {
    key: 'dashboard',
    label: '仪表盘',
    icon: BarChart3,
    title: '租户工作台',
    description: '管理旅行社客户资产、来源导入和邮箱推送通道'
  },
  {
    key: 'customers',
    label: '客户资产',
    icon: Database,
    title: '客户资产',
    description: '查看和检索当前租户的旅行社客户资产'
  },
  {
    key: 'channels',
    label: '推送通道',
    icon: PlugZap,
    title: '推送通道',
    description: '配置 AWS SES 邮件推送通道，供后续邮件触达任务使用'
  },
  {
    key: 'segments',
    label: '客群管理',
    icon: Users,
    title: '客群管理',
    description: '维护基于规则引擎动态筛选的客户群，并刷新客户关联关系'
  },
  {
    key: 'campaign-list',
    label: '活动列表',
    icon: Layers,
    title: '邮件活动列表',
    description: '查看全部邮件活动，并进入指定活动的详情编辑页面'
  },
  {
    key: 'campaigns',
    label: '邮件活动',
    icon: Send,
    parentKey: 'campaign-list',
    title: '邮件活动详情',
    description: '创建活动、编辑模板、选择通道和客群，生成预推送并模拟发送'
  },
  {
    key: 'tracking',
    label: '短链统计',
    icon: BarChart3,
    title: '短链统计',
    description: '查看营销短链点击、UTM 维度和点击明细'
  },
  {
    key: 'settings',
    label: '租户设置',
    icon: Settings,
    title: '租户设置',
    description: '查看当前登录租户与账号信息'
  }
]

export const ROLE_PAGE_ACCESS = {
  TENANT_OWNER: ['dashboard', 'customers', 'channels', 'segments', 'campaign-list', 'campaigns', 'tracking', 'imports', 'mapping', 'settings'],
  TENANT_ADMIN: ['dashboard', 'customers', 'channels', 'segments', 'campaign-list', 'campaigns', 'tracking', 'imports', 'mapping', 'settings'],
  TENANT_USER: ['dashboard', 'customers', 'settings']
}

export const ROLE_LABELS = {
  TENANT_OWNER: '租户所有者',
  TENANT_ADMIN: '租户管理员',
  TENANT_USER: '租户成员'
}

export const CAMPAIGN_LIFECYCLE_STEPS = [
  { status: 'DRAFT', label: '配置草稿', hint: '模板、通道、客群' },
  { status: 'CONFIGURED', label: '模拟发送', hint: '发送到测试邮箱' },
  { status: 'SIMULATED', label: '生成推送', hint: '记录入库' },
  { status: 'PREVIEW_GENERATED', label: '确认推送', hint: '开始执行' },
  { status: 'CONFIRMED', label: '推送完成', hint: '生命周期结束' }
]

export const CAMPAIGN_STATUS_LABELS = {
  DRAFT: '配置草稿',
  CONFIGURED: '模拟发送',
  SIMULATED: '已模拟发送',
  PREVIEW_GENERATED: '已生成推送',
  CONFIRMED: '已确认推送'
}

export const CAMPAIGN_NEXT_ACTION_BY_STATUS = {
  DRAFT: 'saveDraft',
  CONFIGURED: 'simulateSend',
  SIMULATED: 'prePush',
  PREVIEW_GENERATED: 'confirm'
}

export const CAMPAIGN_ACTION_LABELS = {
  saveDraft: '保存配置',
  simulateSend: '模拟发送',
  prePush: '生成推送',
  confirm: '确认推送'
}

export function currentRoles(): UserRole[] {
  return state.user?.roles?.length ? state.user.roles as UserRole[] : ['TENANT_OWNER']
}

export function canAccessNav(nav: string): boolean {
  return currentRoles().some((role) => ROLE_PAGE_ACCESS[role as keyof typeof ROLE_PAGE_ACCESS]?.includes(nav))
}

export const availableNavItems = computed(() => navItems.filter((item) => canAccessNav(item.key)))
export const availablePrimaryNavItems = computed(() => availableNavItems.value.filter((item) => !item.parentKey))
export const primaryRole = computed(() => currentRoles()[0])
export const primaryRoleLabel = computed(() => ROLE_LABELS[primaryRole.value] || primaryRole.value)
export const campaignCurrentStatus = computed(() => state.selectedCampaign?.status || 'DRAFT')
export const campaignCurrentStatusLabel = computed(() => CAMPAIGN_STATUS_LABELS[campaignCurrentStatus.value] || campaignCurrentStatus.value)
export const campaignNextAction = computed(() => CAMPAIGN_NEXT_ACTION_BY_STATUS[campaignCurrentStatus.value] || '')
export const campaignNextActionLabel = computed(() => campaignNextAction.value ? campaignActionLabel(campaignNextAction.value) : '生命周期已完成')
export const campaignAdvanceButtonLabel = computed(() => campaignNextAction.value ? '确认' : '生命周期已完成')
export const templateMissingTrackingLinkParam = computed(() => !campaignHtmlHasTrackingLinkParam())
export const editableTemplateVariableRows = computed(() =>
  state.campaignForm.templateVariables
    .map((variable, index) => ({ variable, index }))
    .filter(({ variable }) => String(variable.key || '').trim() !== REQUIRED_TRACKING_LINK_PARAM)
)
export const campaignSetupDirty = computed(() => {
  const campaign = state.selectedCampaign
  if (!campaign?.id || !campaign.template) return false
  return (campaign.template.subject || '') !== (state.campaignForm.subject || '')
    || (campaign.template.fromName || '') !== (state.campaignForm.fromName || '')
    || (campaign.template.htmlBody || campaign.template.body || '') !== (state.campaignForm.htmlBody || '')
    || String(campaign.channelId || '') !== String(state.campaignForm.channelId || '')
    || normalizedIdList(campaign.segmentIds) !== normalizedIdList(state.campaignForm.segmentIds)
    || normalizedTemplateVariables(parseTemplateVariables(campaign.template.variablesJson, DEFAULT_TEMPLATE_VARIABLES)) !== normalizedTemplateVariables(state.campaignForm.templateVariables)
})
export const campaignTrackingLinkDirty = computed(() => {
  const campaign = state.selectedCampaign
  if (!campaign?.id) return false
  return (campaign.trackingLink?.targetUrl || '') !== (state.campaignForm.trackingTargetUrl || '')
    || (campaign.trackingLink?.shortCode || '') !== (state.campaignForm.trackingShortCode || '')
    || (campaign.trackingLink?.utmSource || '') !== (state.campaignForm.trackingUtmSource || '')
    || (campaign.trackingLink?.utmMedium || '') !== (state.campaignForm.trackingUtmMedium || '')
    || (campaign.trackingLink?.utmCampaign || '') !== (state.campaignForm.trackingUtmCampaign || '')
    || (campaign.trackingLink?.utmContent || '') !== (state.campaignForm.trackingUtmContent || '')
    || (campaign.trackingLink?.utmTerm || '') !== (state.campaignForm.trackingUtmTerm || '')
})
export const campaignLifecycleView = computed(() => {
  const currentIndex = campaignLifecycleIndex(campaignCurrentStatus.value)
  return CAMPAIGN_LIFECYCLE_STEPS.map((step, index) => ({
    ...step,
    active: index === currentIndex,
    done: index < currentIndex,
    rollback: campaignCurrentStatus.value !== 'CONFIRMED' && index === currentIndex - 1
  }))
})
export const pageMeta = computed(() => {
  const fallback = availableNavItems.value[0] || navItems[0]
  if (!canAccessNav(state.activeNav)) return fallback
  return navItems.find((item) => item.key === state.activeNav) || fallback
})
export const filteredCustomers = computed(() => {
  const keyword = state.filter.trim().toLowerCase()
  if (!keyword) return state.customers
  return state.customers.filter((item) =>
    [item.name, item.email, item.website, item.country, item.city, item.sourcePrimary]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(keyword))
  )
})
export const stats = computed(() => {
  const summary = state.customerSummary || summarizeCustomers(state.customers)
  return [
    { label: '客户总数', value: summary.totalCustomers, icon: Users, target: 'customers' },
    { label: '有邮箱客户', value: summary.customersWithEmail, icon: Mail, target: 'customers' },
    { label: '可触达客户', value: summary.reachableCustomers || 0, icon: Send, target: 'customers' },
    { label: '待验证邮箱', value: summary.pendingEmailCustomers, icon: CheckCircle2, target: 'customers' },
    { label: '待 Mapping', value: state.mappingPreview?.unmappedCount || 0, icon: GitMerge, target: 'customers', tool: 'mapping' },
    { label: '短链点击', value: state.trackingSummary.totalClicks || 0, icon: BarChart3, target: 'tracking' }
  ].filter((item) => canAccessNav(item.target) && (!item.tool || canAccessNav(item.tool)))
})
export const customerCountryStats = computed(() => {
  const summary = state.customerSummary || summarizeCustomers(state.customers)
  return Array.isArray(summary.customersByCountry) ? summary.customersByCountry : []
})
export const customerQualityStats = computed(() => {
  const summary = state.customerSummary || summarizeCustomers(state.customers)
  return Array.isArray(summary.customersByEmailQuality) ? summary.customersByEmailQuality : []
})
export const customerContactStats = computed(() => {
  const summary = state.customerSummary || summarizeCustomers(state.customers)
  return Array.isArray(summary.customersByContactStatus) ? summary.customersByContactStatus : []
})
export const customerReachabilityStats = computed(() => {
  const summary = state.customerSummary || summarizeCustomers(state.customers)
  return [
    { label: '可触达客户', value: summary.reachableCustomers || 0 },
    { label: '不可触达客户', value: summary.unreachableCustomers || 0 },
    { label: '缺少邮箱', value: summary.missingEmailCustomers || 0 },
    { label: '已验证邮箱', value: summary.verifiedEmailCustomers || 0 }
  ]
})
export const segmentReadinessStats = computed(() => state.segmentSummary || summarizeSegments(state.segments, state.customers))
export const qualityDonut = computed(() =>
  buildDonut(customerQualityStats.value.map((item) => ({ label: statusLabel(item.status), value: item.customers })))
)
export const reachabilityDonut = computed(() => {
  const summary = state.customerSummary || summarizeCustomers(state.customers)
  return buildDonut([
    { label: '可触达客户', value: summary.reachableCustomers || 0, color: '#0f766e' },
    { label: '不可触达客户', value: summary.unreachableCustomers || 0, color: '#ef4444' }
  ])
})
export const segmentReadinessBars = computed(() => {
  const segments = Array.isArray(segmentReadinessStats.value?.topSegments) ? segmentReadinessStats.value.topSegments : []
  const max = segments.reduce((peak, segment) => Math.max(peak, Number(segment.memberCount || 0)), 0)
  return segments.map((segment) => {
    const memberCount = Number(segment.memberCount || 0)
    const reachableMemberCount = Number(segment.reachableMemberCount || 0)
    return {
      segmentId: segment.segmentId,
      segmentName: segment.segmentName,
      memberCount,
      reachableMemberCount,
      totalShare: max ? `${Math.round((memberCount / max) * 100)}%` : '0%',
      reachableShare: memberCount ? `${Math.round((reachableMemberCount / memberCount) * 100)}%` : '0%'
    }
  })
})

export function campaignLifecycleIndex(status: CampaignStatus): number {
  const index = CAMPAIGN_LIFECYCLE_STEPS.findIndex((step) => step.status === status)
  return index >= 0 ? index : 0
}

export function campaignActionLabel(action: string): string {
  return CAMPAIGN_ACTION_LABELS[action as keyof typeof CAMPAIGN_ACTION_LABELS] || action
}

export function campaignPrePushBlockReason() {
  if (!state.selectedCampaign?.id) return '请先创建或选择活动'
  if (!state.selectedCampaign.template) return '请先保存活动配置以写入邮件模板'
  if (templateMissingTrackingLinkParam.value) return REQUIRED_TRACKING_LINK_MESSAGE
  if (campaignSetupDirty.value) return '当前模板、通道或客群有未保存修改，请先保存活动配置'
  if (!state.selectedCampaign.trackingLink) return '请先保存活动短链接配置'
  if (campaignTrackingLinkDirty.value) return '当前短链接配置有未保存修改，请先保存短链接配置'
  if (!state.selectedCampaign.channelId) {
    return state.campaignForm.channelId ? '请先保存活动配置以绑定推送通道' : '请先选择并保存推送通道'
  }
  if (!state.selectedCampaign.segmentIds?.length) {
    return state.campaignForm.segmentIds.length ? '请先保存活动配置以绑定客群' : '请先选择并保存客群'
  }
  return ''
}

export function isCampaignActionDisabled(action) {
  if (state.loading || !state.selectedCampaign?.id) return true
  if (action === 'prePush' && campaignPrePushBlockReason()) return true
  return campaignNextAction.value !== action
}

export function isCampaignAdvanceDisabled() {
  if (state.loading || !campaignNextAction.value) return true
  if (state.selectedCampaign?.id) return false
  return campaignNextAction.value !== 'saveDraft' || !state.campaignForm.name.trim()
}

export function isCampaignStepDisabled(step) {
  return state.loading || !state.selectedCampaign?.id || !step?.rollback
}

export function campaignActionTitle(action) {
  if (!state.selectedCampaign?.id) return '请先创建或选择活动'
  if (action === 'prePush') {
    const reason = campaignPrePushBlockReason()
    if (reason) return reason
  }
  if (campaignNextAction.value === action) return campaignActionLabel(action)
  if (!campaignNextAction.value) return '当前活动生命周期已完成'
  return `下一步应执行：${campaignActionLabel(campaignNextAction.value)}`
}

export function campaignAdvanceTitle() {
  if (!campaignNextAction.value) return '当前活动生命周期已完成'
  if (campaignNextAction.value === 'saveDraft') return '保存当前草稿配置，并进入模拟发送步骤'
  if (!state.selectedCampaign?.id) return '请先创建或选择活动'
  if (campaignNextAction.value === 'prePush') {
    const reason = campaignPrePushBlockReason()
    if (reason) return reason
  }
  if (campaignNextAction.value === 'confirm') return '确认推送'
  return `确认完成当前步骤，并进入：${campaignNextActionLabel.value}`
}

export function campaignStepTitle(step) {
  if (!state.selectedCampaign?.id) return '请先创建或选择活动'
  if (campaignCurrentStatus.value === 'CONFIRMED') return '推送完成后状态不可修改'
  if (step?.active) return '当前步骤'
  if (step?.rollback) return `回退到上一步：${step.label}`
  return '只能回退到上一步或确认进入下一步'
}

export function normalizedIdList(ids: (string | number)[] | undefined): string {
  return [...(ids || [])].map(String).sort().join('|')
}

export function normalizedTemplateVariables(variables: { key?: string; label?: string; sampleValue?: string; required?: boolean }[] | undefined): string {
  return JSON.stringify((variables || []).map((variable) => ({
    key: String(variable.key || '').trim(),
    label: String(variable.label || '').trim(),
    sampleValue: String(variable.sampleValue || ''),
    required: Boolean(variable.required)
  })))
}

export function persistNavigationState() {
  localStorage.setItem(ACTIVE_NAV_STORAGE_KEY, state.activeNav)
  localStorage.setItem(CUSTOMER_TOOL_STORAGE_KEY, state.customerTool)
}

export function activateNav(nav: string): void {
  state.activeNav = nav
  persistNavigationState()
  void router.push(navToPath(nav, state.customerTool)).catch(() => {})
}

export function setCustomerToolState(tool: string): void {
  state.customerTool = normalizeCustomerTool(tool)
  persistNavigationState()
}

export function normalizeActiveNavAccess() {
  if (canAccessNav(state.activeNav)) {
    if (state.activeNav !== 'customers') {
      setCustomerToolState('list')
    } else if (!canAccessNav(state.customerTool)) {
      setCustomerToolState('list')
    } else {
      persistNavigationState()
    }
    return
  }
  activateNav(availableNavItems.value[0]?.key || 'dashboard')
  if (state.activeNav !== 'customers') {
    setCustomerToolState('list')
  }
}

export function setActiveNav(nav: string): void {
  if (!canAccessNav(nav)) {
    state.error = '当前角色没有访问该页面的权限'
    activateNav(availableNavItems.value[0]?.key || 'dashboard')
    return
  }
  state.error = ''
  activateNav(nav)
  if (nav !== 'customers') {
    setCustomerToolState('list')
  }
  if (nav === 'customers' && state.customerTool === 'mapping') {
    loadMappingPreview()
  }
  if (nav === 'tracking') {
    loadTrackingAnalytics()
  }
  if (nav === 'campaign-list') {
    loadCampaigns()
  }
}

export function navChildItems(parentKey: string) {
  return availableNavItems.value.filter((item) => item.parentKey === parentKey)
}

export function isNavItemActive(item: { key: string }): boolean {
  if (state.activeNav === item.key) return true
  return navChildItems(item.key).some((child) => child.key === state.activeNav)
}

export function toggleSidebar(): void {
  state.sidebarCollapsed = !state.sidebarCollapsed
  localStorage.setItem('travel_admin_sidebar_collapsed', String(state.sidebarCollapsed))
}

export function syncNavigationFromRoute(pathname: string, queryNav = ''): void {
  const { nav, customerTool } = resolveNavigationFromLocation(pathname, queryNav)
  state.activeNav = nav
  state.customerTool = normalizeCustomerTool(customerTool)
}

export function openStatTarget(item: { target: string; tool?: string }): void {
  if (item.target === 'customers' && item.tool) {
    setCustomerTool(item.tool)
    return
  }
  setActiveNav(item.target)
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

export function displayValue<T>(value: T): T | '-' {
  if (value === null || value === undefined || value === '') return '-'
  return value
}

export function percentValue(value: number | string | undefined): string {
  return `${Math.round(Number(value || 0) * 100)}%`
}

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

export function profileAsset(): Customer {
  return state.customerProfile?.asset || state.selectedCustomer || ({} as Customer)
}

export function formatCountryShare(customers: number): string {
  const total = Number((state.customerSummary || summarizeCustomers(state.customers)).totalCustomers || 0)
  if (!total) return '0%'
  return `${Math.round((Number(customers || 0) / total) * 100)}%`
}

async function copyShortLink(url: string): Promise<void> {
  if (!url) return
  try {
    await navigator.clipboard?.writeText(url)
    state.notice = '短链已复制'
  } catch {
    state.notice = url
  }
}

export async function openCustomerDetail(customer: Customer): Promise<void> {
  state.selectedCustomer = customer
  state.customerProfile = null
  state.customerEditorKeepSelection = false
  state.customerCreateMode = false
  state.customerEditMode = false
  state.customerEditForm = buildCustomerEditForm(customer)
  await loadCustomerProfile(customer)
}

export function closeCustomerDetail(): void {
  closeCustomerDialog()
}

export function closeCustomerDialog(): void {
  state.selectedCustomer = null
  state.customerProfile = null
  state.customerEditorKeepSelection = false
  resetCustomerEditorState()
}

export function closeCustomerEditor(): void {
  if (!state.customerEditorKeepSelection) {
    state.selectedCustomer = null
    state.customerProfile = null
  }
  state.customerEditorKeepSelection = false
  resetCustomerEditorState()
}

export function resetCustomerEditorState(): void {
  state.customerCreateMode = false
  state.customerEditMode = false
  state.customerEditorKeepSelection = false
  state.customerEditForm = {} as CustomerEditForm
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
  state.selectedCustomer = null
  state.customerProfile = null
  state.customerCreateMode = true
  state.customerEditMode = true
  state.customerEditorKeepSelection = false
  state.customerEditForm = defaultCustomerForm()
}

export async function openCustomerEdit(customer?: Customer): Promise<void> {
  const asset = customer || profileAsset()
  const keepSelection = Boolean(state.selectedCustomer && !state.customerCreateMode && !state.customerEditMode)
  state.selectedCustomer = asset
  state.customerProfile = null
  state.customerCreateMode = false
  state.customerEditMode = true
  state.customerEditorKeepSelection = keepSelection
  state.customerEditForm = buildCustomerEditForm(asset)
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
    businessScope: asset.businessScope || state.customerProfile?.businessScope || ''
  }
}

async function loadCustomerProfile(customer: Customer | null = state.selectedCustomer): Promise<void> {
  if (!customer?.id) return
  state.customerProfileLoading = true
  try {
    state.customerProfile = await request(`/api/customers/${customer.id}/asset-profile`) as CustomerProfile
    if (state.customerProfile?.asset) {
      state.selectedCustomer = state.customerProfile.asset
      replaceCustomer(state.customerProfile.asset)
    }
  } catch (error: unknown) {
    state.customerProfile = {
      asset: customer,
      businessScope: customer.businessScope || '',
      travelProfile: null,
      destinations: [],
      languages: [],
      sources: []
    }
    const err = error as { message?: string }
    if (err?.message && err.message !== '客户资产不存在或无权访问') {
      state.error = `客户全局画像加载失败：${err.message}`
    }
  } finally {
    state.customerProfileLoading = false
  }
}

export async function saveCustomerEdit(): Promise<void> {
  if (!state.customerCreateMode && !state.selectedCustomer) return
  state.loading = true
  state.error = ''
  state.notice = ''
  try {
    const body = { ...state.customerEditForm }
    const updated = state.customerCreateMode
      ? await request('/api/customers', {
          method: 'POST',
          body: JSON.stringify(body)
        }) as Customer
      : await request(`/api/customers/${state.selectedCustomer!.id}`, {
          method: 'PUT',
          body: JSON.stringify(body)
        }) as Customer
    if (state.customerCreateMode) {
      addCustomer(updated)
    } else {
      replaceCustomer(updated)
    }
    await loadCustomerSummary()
    const wasCreating = state.customerCreateMode
    state.selectedCustomer = updated
    resetCustomerEditorState()
    await loadCustomerProfile(updated)
    state.notice = wasCreating ? '客户资产已创建' : '客户资产已更新'
  } catch (error: unknown) {
    const err = error as { message?: string }
    state.error = err.message || '保存失败'
  } finally {
    state.loading = false
  }
}

export const EMAIL_QUALITY_OPTIONS = ['PENDING', 'VERIFIED', 'BOUNCED', 'MISSING']

async function updateEmailQuality(customer: Customer, quality: EmailQuality): Promise<void> {
  if (!customer || customer.emailQuality === quality) return
  state.loading = true
  state.error = ''
  state.notice = ''
  try {
    const updated = await request(`/api/customers/${customer.id}/email-quality`, {
      method: 'PATCH',
      body: JSON.stringify({ emailQuality: quality })
    }) as Customer
    replaceCustomer(updated)
    await loadCustomerSummary()
    state.notice = `邮箱状态已更新为 ${quality}`
  } catch (error: unknown) {
    const err = error as { message?: string }
    state.error = err.message || '更新失败'
  } finally {
    state.loading = false
  }
}

export function setCustomerTool(tool: string): void {
  if (tool === 'imports' && !canAccessNav('imports')) {
    state.error = '当前角色没有使用客户导入的权限'
    return
  }
  if (tool === 'mapping' && !canAccessNav('mapping')) {
    state.error = '当前角色没有使用资产 Mapping 的权限'
    return
  }
  state.error = ''
  setCustomerToolState(tool)
  activateNav('customers')
  if (tool === 'mapping') {
    loadMappingPreview()
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

export function summarizeSegments(segments: Segment[], customers: Customer[]): SegmentSummary {
  return {
    segmentCount: segments.length,
    memberCount: 0,
    uniqueCustomerCount: 0,
    reachableMemberCount: 0,
    topSegments: []
  }
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

export function changeCustomerPage(nextPage: number): void {
  if (nextPage < 0 || (state.customerPage.totalPages && nextPage >= state.customerPage.totalPages)) return
  loadCustomers(nextPage)
}

export function jumpCustomerPage(pageNumber: number | string): void {
  const nextPage = boundedPage(state.customerPage, pageNumber)
  if (nextPage === null || nextPage === state.customerPage.page) return
  loadCustomers(nextPage)
}

export function changeCustomerPageSize(size: number | string): void {
  const nextSize = Number(size)
  if (!nextSize) return
  state.customerPage.size = nextSize
  loadCustomers(0)
}

export function changeChannelPage(nextPage: number): void {
  if (nextPage < 0 || (state.channelPage.totalPages && nextPage >= state.channelPage.totalPages)) return
  loadChannels(nextPage)
}

export function jumpChannelPage(pageNumber: number | string): void {
  const nextPage = boundedPage(state.channelPage, pageNumber)
  if (nextPage === null || nextPage === state.channelPage.page) return
  loadChannels(nextPage)
}

export function changeChannelPageSize(size: number | string): void {
  const nextSize = Number(size)
  if (!nextSize) return
  state.channelPage.size = nextSize
  loadChannels(0)
}

export function changeSegmentPage(nextPage: number): void {
  if (nextPage < 0 || (state.segmentPage.totalPages && nextPage >= state.segmentPage.totalPages)) return
  loadSegments(nextPage)
}

export function jumpSegmentPage(pageNumber: number | string): void {
  const nextPage = boundedPage(state.segmentPage, pageNumber)
  if (nextPage === null || nextPage === state.segmentPage.page) return
  loadSegments(nextPage)
}

export function changeSegmentPageSize(size: number | string): void {
  const nextSize = Number(size)
  if (!nextSize) return
  state.segmentPage.size = nextSize
  loadSegments(0)
}

export function changeCampaignPage(nextPage: number): void {
  if (nextPage < 0 || (state.campaignPage.totalPages && nextPage >= state.campaignPage.totalPages)) return
  loadCampaigns(nextPage)
}

export function jumpCampaignPage(pageNumber: number | string): void {
  const nextPage = boundedPage(state.campaignPage, pageNumber)
  if (nextPage === null || nextPage === state.campaignPage.page) return
  loadCampaigns(nextPage)
}

export function changeCampaignPageSize(size: number | string): void {
  const nextSize = Number(size)
  if (!nextSize) return
  state.campaignPage.size = nextSize
  loadCampaigns(0)
}

export function csvToList(value: unknown): string[] {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function fillSegmentForm(segment: Segment): void {
  state.selectedSegment = segment
  let rules: SegmentRuleCondition[] = []
  if (segment.rules?.conditions) {
    rules = segment.rules.conditions.map((c) => ({
      ...c,
      _valueText: Array.isArray(c.values) ? c.values.join(',') : (c.values?.[0] ?? ''),
      _countryValues: c.field === 'country' && Array.isArray(c.values) ? [...c.values] : []
    }))
  }
  state.segmentForm = {
    id: segment.id,
    name: segment.name || '',
    description: segment.description || '',
    rules
  }
  loadSegmentMembers(String(segment.id))
}

export function resetSegmentForm(): void {
  state.selectedSegment = null
  state.segmentMembers = []
  state.segmentMemberPage = emptyPageResult<Customer>(0, state.segmentMemberPage.size)
  state.segmentForm = {
    id: '',
    name: '',
    description: '',
    rules: []
  }
}

export const RULE_FIELDS = [
  { value: 'country', label: '国家 (country)' },
  { value: 'city', label: '城市 (city)' },
  { value: 'email_quality', label: '邮箱质量 (email_quality)' },
  { value: 'contact_status', label: '客户状态 (contact_status)' },
  { value: 'source_primary', label: '数据来源 (source_primary)' },
  { value: 'asset_type', label: '资产类型 (asset_type)' },
  { value: 'name', label: '名称 (name)' },
  { value: 'postcode', label: '邮编 (postcode)' },
  { value: 'email', label: '邮箱 (email)' },
  { value: 'phone', label: '电话 (phone)' },
  { value: 'website', label: '网站 (website)' },
]

export const RULE_OPS = [
  { value: 'IN', label: '包含于 (IN)', multi: true },
  { value: 'NOT_IN', label: '不包含于 (NOT_IN)', multi: true },
  { value: 'EQ', label: '等于 (EQ)', multi: false },
  { value: 'NEQ', label: '不等于 (NEQ)', multi: false },
  { value: 'CONTAINS', label: '包含字符串 (CONTAINS)', multi: false },
  { value: 'NOT_CONTAINS', label: '不含字符串 (NOT_CONTAINS)', multi: false },
  { value: 'IS_EMPTY', label: '为空 (IS_EMPTY)', multi: false },
  { value: 'IS_NOT_EMPTY', label: '不为空 (IS_NOT_EMPTY)', multi: false },
]

export function ruleOpIsMulti(op: string): boolean {
  return RULE_OPS.find(o => o.value === op)?.multi ?? false
}

export function ruleOpHasValue(op: string): boolean {
  return op !== 'IS_EMPTY' && op !== 'IS_NOT_EMPTY'
}

export function addRule(): void {
  state.segmentForm.rules.push({ field: 'country', op: 'IN', values: [], _valueText: '', _countryValues: [] })
}

export function removeRule(index: number): void {
  state.segmentForm.rules.splice(index, 1)
}

export function buildRules(rules: SegmentRuleCondition[]): SegmentRule | null {
  if (!rules || rules.length === 0) return null
  const conditions = rules.map(r => {
    const isMulti = ruleOpIsMulti(r.op)
    const hasVal = ruleOpHasValue(r.op)
    let values: string[]
    if (!hasVal) {
      values = []
    } else if (r.field === 'country' && Array.isArray(r._countryValues)) {
      values = isMulti ? [...r._countryValues] : [r._countryValues[0]].filter(Boolean)
    } else if (isMulti) {
      values = (r._valueText || '').split(',').map(v => v.trim()).filter(Boolean)
    } else {
      values = [(r._valueText || '')].filter(Boolean)
    }
    return { field: r.field, op: r.op, values }
  })
  return { logic: 'AND', conditions }
}

export function segmentPayload(): { name: string; description: string; rules: SegmentRule | null } {
  return {
    name: state.segmentForm.name,
    description: state.segmentForm.description,
    rules: buildRules(state.segmentForm.rules)
  }
}

export function fillCampaignForm(campaign: Campaign): void {
  state.selectedCampaign = campaign
  state.campaignForm.name = campaign.name || ''
  state.campaignForm.objective = campaign.objective || ''
  state.campaignForm.subject = campaign.template?.subject || state.campaignForm.subject
  state.campaignForm.fromName = campaign.template?.fromName || state.campaignForm.fromName
  state.campaignForm.htmlBody = campaign.template?.htmlBody || campaign.template?.body || state.campaignForm.htmlBody
  state.campaignForm.templateVariables = parseTemplateVariables(campaign.template?.variablesJson, DEFAULT_TEMPLATE_VARIABLES)
  syncCampaignTemplateVariables()
  state.campaignForm.trackingTargetUrl = campaign.trackingLink?.targetUrl || state.campaignForm.trackingTargetUrl
  state.campaignForm.trackingShortCode = campaign.trackingLink?.shortCode || state.campaignForm.trackingShortCode
  state.campaignForm.trackingUtmSource = campaign.trackingLink?.utmSource || 'email'
  state.campaignForm.trackingUtmMedium = campaign.trackingLink?.utmMedium || 'email'
  state.campaignForm.trackingUtmCampaign = campaign.trackingLink?.utmCampaign || String(campaign.id) || state.campaignForm.trackingUtmCampaign
  state.campaignForm.trackingUtmContent = campaign.trackingLink?.utmContent || state.campaignForm.trackingUtmContent
  state.campaignForm.trackingUtmTerm = campaign.trackingLink?.utmTerm || ''
  state.campaignForm.channelId = campaign.channelId || ''
  state.campaignForm.segmentIds = [...(campaign.segmentIds || [])]
  state.segmentDropdownOpen = false
  state.segmentDropdownQuery = ''
  state.trackingLinkDialogOpen = false
  updateLocalTemplatePreview()
}

export function defaultCampaignForm(): CampaignForm {
  return {
    name: '先锋中国行程推广邮件',
    objective: '向海外旅行社推广 9 天 8 晚中国文化线路',
    subject: 'China Discovery from US$399+ for ${customerName}',
    fromName: 'Youjie Travel Partnerships',
    htmlBody: pioneerChinaEmailTemplate,
    templateVariables: cloneTemplateVariables(DEFAULT_TEMPLATE_VARIABLES),
    trackingTargetUrl: 'https://www.example.com/travel-agency-partnership',
    trackingShortCode: 'china-trip',
    trackingUtmSource: 'email',
    trackingUtmMedium: 'email',
    trackingUtmCampaign: '1780118309231001',
    trackingUtmContent: 'template_a',
    trackingUtmTerm: '',
    channelId: '',
    segmentIds: []
  }
}

export function clearCampaignSelection(): void {
  state.selectedCampaign = null
  state.campaignForm = defaultCampaignForm()
  state.segmentDropdownOpen = false
  state.segmentDropdownQuery = ''
  state.trackingLinkDialogOpen = false
  updateLocalTemplatePreview()
}

export function openCampaignDetail(campaign: Campaign): void {
  fillCampaignForm(campaign)
  activateNav('campaigns')
  state.error = ''
}

export function openCampaignList(): void {
  activateNav('campaign-list')
  state.error = ''
  loadCampaigns()
}

export function startNewCampaign(): void {
  clearCampaignSelection()
  activateNav('campaigns')
  state.error = ''
}

export function syncCampaignTemplateVariables(): void {
  state.campaignForm.templateVariables = syncTemplateVariables({
    subject: state.campaignForm.subject,
    htmlBody: state.campaignForm.htmlBody,
    variables: state.campaignForm.templateVariables
  })
  updateLocalTemplatePreview()
}

export function updateLocalTemplatePreview(): void {
  const preview = renderTemplatePreview({
    subject: state.campaignForm.subject,
    htmlBody: state.campaignForm.htmlBody,
    variables: state.campaignForm.templateVariables
  })
  state.templatePreviewSubject = preview.subjectPreview || ''
  state.templatePreviewHtml = preview.htmlPreview || ''
  state.templatePreviewError = ''
}

export function templateVariablesJson(): string {
  syncCampaignTemplateVariables()
  return templateVariablesToJson(state.campaignForm.templateVariables)
}

export function addTemplateVariable(): void {
  state.campaignForm.templateVariables.push({
    key: '',
    label: '',
    sampleValue: '',
    required: false
  })
}

export function removeTemplateVariable(index: number): void {
  state.campaignForm.templateVariables.splice(index, 1)
}

async function insertTemplateVariable(variable: { key?: string }): Promise<void> {
  const key = String(variable?.key || '').trim()
  if (!key) return
  const placeholder = '${' + key + '}'
  const editor = document.getElementById('campaign-html-editor') as HTMLTextAreaElement | null
  if (!editor) {
    state.campaignForm.htmlBody += placeholder
    syncCampaignTemplateVariables()
    return
  }
  const start = editor.selectionStart ?? state.campaignForm.htmlBody.length
  const end = editor.selectionEnd ?? state.campaignForm.htmlBody.length
  state.campaignForm.htmlBody = `${state.campaignForm.htmlBody.slice(0, start)}${placeholder}${state.campaignForm.htmlBody.slice(end)}`
  syncCampaignTemplateVariables()
  await nextTick()
  editor.focus()
  editor.setSelectionRange(start + placeholder.length, start + placeholder.length)
}

export interface CampaignTemplatePayload {
  subject: string
  fromName: string
  htmlBody: string
  variablesJson: string
}

export function campaignTemplatePayload(): CampaignTemplatePayload {
  syncCampaignTemplateVariables()
  return {
    subject: state.campaignForm.subject,
    fromName: state.campaignForm.fromName,
    htmlBody: state.campaignForm.htmlBody,
    variablesJson: templateVariablesJson()
  }
}

export function campaignHtmlHasTrackingLinkParam(): boolean {
  return scanTemplateVariableKeys(state.campaignForm.htmlBody).includes(REQUIRED_TRACKING_LINK_PARAM)
}

export function validateCampaignTemplateTrackingLink(): boolean {
  if (campaignHtmlHasTrackingLinkParam()) return true
  state.templatePreviewHtml = ''
  state.templatePreviewSubject = ''
  state.templatePreviewError = REQUIRED_TRACKING_LINK_MESSAGE
  state.error = REQUIRED_TRACKING_LINK_MESSAGE
  return false
}

export interface CampaignTrackingLinkPayload {
  targetUrl: string
  shortCode: string
  utmSource: string
  utmMedium: string
  utmCampaign: string
  utmContent: string
  utmTerm: string
}

export function campaignTrackingLinkPayload(): CampaignTrackingLinkPayload {
  return {
    targetUrl: state.campaignForm.trackingTargetUrl,
    shortCode: state.campaignForm.trackingShortCode,
    utmSource: state.campaignForm.trackingUtmSource,
    utmMedium: state.campaignForm.trackingUtmMedium,
    utmCampaign: state.campaignForm.trackingUtmCampaign,
    utmContent: state.campaignForm.trackingUtmContent,
    utmTerm: state.campaignForm.trackingUtmTerm
  }
}

export function openTrackingLinkDialog(): void {
  if (!state.selectedCampaign?.id) {
    state.error = '请先创建或选择活动'
    return
  }
  state.trackingLinkDialogOpen = true
}

export function closeTrackingLinkDialog(): void {
  state.trackingLinkDialogOpen = false
}

export function openFinalConfirmDialog(): void {
  if (!state.selectedCampaign?.id) {
    state.error = '请先选择或创建活动'
    return
  }
  state.finalConfirmDialogOpen = true
  state.error = ''
}

export function closeFinalConfirmDialog(): void {
  state.finalConfirmDialogOpen = false
}

async function openTestEmailDialog(): Promise<void> {
  if (!state.selectedCampaign?.id) {
    state.error = '请先选择或创建活动'
    return
  }
  state.testEmailDialogOpen = true
  state.error = ''
  await loadTestEmails()
}

export function closeTestEmailDialog(): void {
  state.testEmailDialogOpen = false
}

async function loadTestEmails(): Promise<void> {
  try {
    state.testEmails = await request('/api/campaigns/test-emails') as TestEmail[]
  } catch (error: unknown) {
    const err = error as { message?: string }
    state.testEmails = []
    state.error = `测试邮箱加载失败：${err.message}`
  }
}

export function normalizeEmailInput(email: unknown): string {
  return String(email || '').trim().toLowerCase()
}

export function isTestEmailSelected(email: string): boolean {
  return state.selectedTestEmails.includes(normalizeEmailInput(email))
}

export function toggleTestEmail(email: string): void {
  const normalized = normalizeEmailInput(email)
  if (!normalized) return
  if (isTestEmailSelected(normalized)) {
    state.selectedTestEmails = state.selectedTestEmails.filter((item) => item !== normalized)
    return
  }
  state.selectedTestEmails = [...state.selectedTestEmails, normalized]
}

async function addTestEmail(): Promise<void> {
  const email = normalizeEmailInput(state.newTestEmail)
  if (!email) {
    state.error = '请输入测试邮箱'
    return
  }
  state.loading = true
  state.error = ''
  try {
    await request('/api/campaigns/test-emails', {
      method: 'POST',
      body: JSON.stringify({ email })
    })
    await loadTestEmails()
    if (!isTestEmailSelected(email)) {
      state.selectedTestEmails = [...state.selectedTestEmails, email]
    }
    state.newTestEmail = ''
  } catch (error: unknown) {
    const err = error as { message?: string }
    state.error = `测试邮箱保存失败：${err.message}`
  } finally {
    state.loading = false
  }
}

async function deleteTestEmail(testEmail: TestEmail): Promise<void> {
  if (!testEmail?.id) return
  state.loading = true
  state.error = ''
  try {
    await request(`/api/campaigns/test-emails/${testEmail.id}`, { method: 'DELETE' })
    state.selectedTestEmails = state.selectedTestEmails.filter((email) => email !== normalizeEmailInput(testEmail.email))
    await loadTestEmails()
  } catch (error: unknown) {
    const err = error as { message?: string }
    state.error = `测试邮箱删除失败：${err.message}`
  } finally {
    state.loading = false
  }
}

export function filteredCampaignSegments(): Segment[] {
  const keyword = state.segmentDropdownQuery.trim().toLowerCase()
  if (!keyword) return state.segments
  return state.segments.filter((segment) =>
    [segment.name, segment.id, segment.description]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(keyword))
  )
}

export function selectedCampaignSegments(): Segment[] {
  return state.campaignForm.segmentIds
    .map((id) => state.segments.find((segment) => segment.id === id))
    .filter((s): s is Segment => Boolean(s))
}

export function isCampaignSegmentSelected(segmentId: string | number): boolean {
  return state.campaignForm.segmentIds.includes(segmentId)
}

export function toggleCampaignSegment(segmentId: string | number): void {
  if (isCampaignSegmentSelected(segmentId)) {
    state.campaignForm.segmentIds = state.campaignForm.segmentIds.filter((id) => id !== segmentId)
    return
  }
  state.campaignForm.segmentIds = [...state.campaignForm.segmentIds, segmentId]
}

export function removeCampaignSegment(segmentId: string | number): void {
  state.campaignForm.segmentIds = state.campaignForm.segmentIds.filter((id) => id !== segmentId)
}

export function persistSession(result: { accessToken: string; email: string; tenantId: string | number; userId: string | number; roles?: UserRole[] }): void {
  state.token = result.accessToken
  state.user = {
    email: result.email,
    tenantId: result.tenantId,
    userId: result.userId,
    roles: result.roles || []
  }
  localStorage.setItem('travel_admin_token', state.token)
  localStorage.setItem('travel_admin_user', JSON.stringify(state.user))
  normalizeActiveNavAccess()
}

export async function login(): Promise<void> {
  state.loading = true
  state.error = ''
  state.notice = ''
  try {
    if (state.authMode === 'register') {
      await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          tenantName: state.authForm.tenantName,
          displayName: state.authForm.displayName,
          email: state.authForm.email,
          password: state.authForm.password
        })
      })
    }
    const result = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: state.authForm.email,
        password: state.authForm.password
      })
    }) as { accessToken: string; email: string; tenantId: string | number; userId: string | number; roles?: UserRole[] }
    persistSession(result)
    await refreshAll()
    state.notice = '已进入租户后台'
    void router.replace(navToPath(state.activeNav, state.customerTool)).catch(() => {})
  } catch (error: unknown) {
    const err = error as { message?: string }
    state.error = `认证失败：${err.message}`
  } finally {
    state.loading = false
  }
}

export function logout(): void {
  state.token = ''
  state.user = null
  setCustomerToolState('list')
  state.activeNav = 'dashboard'
  localStorage.removeItem('travel_admin_token')
  localStorage.removeItem('travel_admin_user')
  localStorage.removeItem(ACTIVE_NAV_STORAGE_KEY)
  localStorage.removeItem(CUSTOMER_TOOL_STORAGE_KEY)
  void router.replace('/login').catch(() => {})
}

async function refreshAll() {
  const loaders = []
  if (canAccessNav('customers') || canAccessNav('dashboard')) {
    loaders.push(loadCustomers())
    loaders.push(loadCustomerSummary())
  }
  if (canAccessNav('channels')) {
    loaders.push(loadChannels())
  } else {
    state.channels = []
  }
  if (canAccessNav('segments')) {
    loaders.push(loadSegments())
    loaders.push(loadSegmentSummary())
  } else {
    state.segments = []
    state.segmentSummary = null
  }
  if (canAccessNav('campaign-list') || canAccessNav('campaigns')) {
    loaders.push(loadCampaigns())
  } else {
    state.campaigns = []
  }
  if (canAccessNav('tracking')) {
    loaders.push(loadTrackingAnalytics())
  } else {
    state.trackingSummary = { totalClicks: 0, clickedCustomers: 0, shortLinks: 0, clickRate: 0 }
    state.trackingTimeseries = []
    state.trackingUtmStats = []
    state.trackingLinkStats = []
    state.trackingEvents = []
  }
  if (canAccessNav('mapping')) {
    loaders.push(loadMappingPreview())
  } else {
    state.mappingPreview = null
  }
  await Promise.allSettled(loaders)
}

async function loadCustomerSummary() {
  try {
    state.customerSummary = await request('/api/customers/summary')
  } catch (error) {
    state.customerSummary = null
    state.error = `客户统计加载失败：${error.message}`
  }
}

async function loadSegmentSummary() {
  try {
    state.segmentSummary = await request('/api/segments/summary')
  } catch (error) {
    state.segmentSummary = null
    state.error = `客群统计加载失败：${error.message}`
  }
}

export function replaceCustomer(updatedCustomer: Customer): void {
  state.customers = state.customers.map((customer) => (customer.id === updatedCustomer.id ? updatedCustomer : customer))
  if (state.selectedCustomer?.id === updatedCustomer.id) {
    state.selectedCustomer = updatedCustomer
  }
  if (state.customerProfile?.asset?.id === updatedCustomer.id) {
    state.customerProfile = {
      ...state.customerProfile,
      asset: updatedCustomer,
      businessScope: updatedCustomer.businessScope || state.customerProfile.businessScope
    }
  }
}

export function addCustomer(customer: Customer): void {
  const size = Number(state.customerPage.size || 20)
  const totalItems = Number(state.customerPage.totalItems || 0) + 1
  const totalPages = Math.max(1, Math.ceil(totalItems / size))
  state.customers = [customer, ...state.customers.filter((item) => item.id !== customer.id)].slice(0, size)
  state.customerPage = {
    ...state.customerPage,
    page: 0,
    totalItems,
    totalPages,
    hasPrevious: false,
    hasNext: totalPages > 1
  }
}

async function loadCustomers(page = state.customerPage.page): Promise<void> {
  try {
    const result = await request(`/api/customers?${pageQuery(state.customerPage, page)}`)
    const pageResult = normalizePageResult<Customer>(result, [], page, state.customerPage.size)
    state.customers = pageResult.items
    state.customerPage = pageResult
    if (state.selectedCustomer) {
      state.selectedCustomer = pageResult.items.find((item) => item.id === state.selectedCustomer.id) || null
    }
  } catch (error: unknown) {
    const err = error as { message?: string }
    state.customers = []
    state.customerPage = emptyPageResult<Customer>(0, state.customerPage.size)
    state.selectedCustomer = null
    state.error = `客户资产加载失败：${err.message}`
  }
}

async function loadChannels(page = state.channelPage.page): Promise<void> {
  try {
    const result = await request(`/api/channels?${pageQuery(state.channelPage, page)}`)
    const pageResult = normalizePageResult<Channel>(result, [], page, state.channelPage.size)
    state.channels = pageResult.items
    state.channelPage = pageResult
  } catch (error: unknown) {
    const err = error as { message?: string }
    state.channels = []
    state.channelPage = normalizePageResult<Channel>([], [], 0, state.channelPage.size)
    state.error = `推送通道加载失败：${err.message}`
  }
}

async function loadSegments(page = state.segmentPage.page): Promise<void> {
  try {
    const result = await request(`/api/segments?${pageQuery(state.segmentPage, page)}`)
    const pageResult = normalizePageResult<Segment>(result, [], page, state.segmentPage.size)
    state.segments = pageResult.items
    state.segmentPage = pageResult
    if (!state.selectedSegment && pageResult.items.length) {
      fillSegmentForm(pageResult.items[0])
    }
  } catch (error: unknown) {
    const err = error as { message?: string }
    state.segments = []
    state.segmentPage = emptyPageResult<Segment>(0, state.segmentPage.size)
    state.error = `客群加载失败：${err.message}`
  }
}

async function loadSegmentMembers(segmentId = state.selectedSegment?.id, page = state.segmentMemberPage.page): Promise<void> {
  if (!segmentId) return
  try {
    const result = await request(`/api/segments/${segmentId}/members?${pageQuery(state.segmentMemberPage, page)}`)
    const pageResult = normalizePageResult<Customer>(result, [], page, state.segmentMemberPage.size)
    state.segmentMembers = pageResult.items
    state.segmentMemberPage = pageResult
  } catch (error: unknown) {
    const err = error as { message?: string }
    state.segmentMembers = []
    state.segmentMemberPage = emptyPageResult<Customer>(0, state.segmentMemberPage.size)
    state.error = `客群成员加载失败：${err.message}`
  }
}

export async function saveSegment(): Promise<void> {
  state.loading = true
  state.error = ''
  state.notice = ''
  try {
    const isUpdate = Boolean(state.segmentForm.id)
    const result = await request(isUpdate ? `/api/segments/${state.segmentForm.id}` : '/api/segments', {
      method: isUpdate ? 'PUT' : 'POST',
      body: JSON.stringify(segmentPayload())
    }) as Segment
    state.notice = isUpdate ? '客群规则已更新' : '客群已创建'
    await loadSegments()
    fillSegmentForm(result)
  } catch (error: unknown) {
    const err = error as { message?: string }
    state.error = `客群保存失败：${err.message}`
  } finally {
    state.loading = false
  }
}

export function changeSegmentMemberPage(nextPage: number): void {
  if (nextPage < 0 || (state.segmentMemberPage.totalPages && nextPage >= state.segmentMemberPage.totalPages)) return
  loadSegmentMembers(state.selectedSegment?.id, nextPage)
}

export function changeSegmentMemberPageSize(size: number | string): void {
  const nextSize = Number(size)
  if (!nextSize) return
  state.segmentMemberPage.size = nextSize
  loadSegmentMembers(state.selectedSegment?.id, 0)
}

export function jumpSegmentMemberPage(pageNumber: number | string): void {
  const nextPage = boundedPage(state.segmentMemberPage, pageNumber)
  if (nextPage === null || nextPage === state.segmentMemberPage.page) return
  loadSegmentMembers(state.selectedSegment?.id, nextPage)
}

export async function refreshSegment(segmentId = state.selectedSegment?.id): Promise<void> {
  if (!segmentId) {
    state.error = '请先选择客群'
    return
  }
  state.loading = true
  state.error = ''
  state.notice = ''
  try {
    state.segmentRefreshResult = await request(`/api/segments/${segmentId}/refresh`, { method: 'POST', body: JSON.stringify({}) }) as SegmentRefreshResult
    await loadSegmentMembers(segmentId, 0)
    state.notice = `客群已刷新，命中 ${state.segmentRefreshResult.matchedCount} 个客户`
  } catch (error: unknown) {
    const err = error as { message?: string }
    state.error = `客群刷新失败：${err.message}`
  } finally {
    state.loading = false
  }
}

async function loadCampaigns(page = state.campaignPage.page): Promise<void> {
  try {
    const result = await request(`/api/campaigns?${pageQuery(state.campaignPage, page)}`)
    const pageResult = normalizePageResult<Campaign>(result, [], page, state.campaignPage.size)
    state.campaigns = pageResult.items
    state.campaignPage = pageResult
    if (state.selectedCampaign && !pageResult.items.some((item) => item.id === state.selectedCampaign.id)) {
      clearCampaignSelection()
    }
    if (state.selectedCampaign) {
      state.selectedCampaign = pageResult.items.find((item) => item.id === state.selectedCampaign.id) || null
    }
    if (!pageResult.items.length) {
      clearCampaignSelection()
    }
    if (!state.selectedCampaign && pageResult.items.length) {
      fillCampaignForm(pageResult.items[0])
    }
  } catch (error: unknown) {
    const err = error as { message?: string }
    state.campaigns = []
    state.campaignPage = emptyPageResult<Campaign>(0, state.campaignPage.size)
    clearCampaignSelection()
    state.error = `活动加载失败：${err.message}`
  }
}

async function loadTrackingAnalytics(page = state.trackingEventPage.page, linkPage = state.trackingLinkPage.page): Promise<void> {
  try {
    const params = new URLSearchParams()
    if (state.trackingFilter.campaignId) params.set('campaignId', state.trackingFilter.campaignId)
    const querySuffix = params.toString() ? `?${params}` : ''
    state.trackingSummary = await request(`/api/tracking/analytics/summary${querySuffix}`) as TrackingSummary
    state.trackingTimeseries = await request(`/api/tracking/analytics/timeseries${querySuffix}`) as TrackingTimeseriesPoint[]
    state.trackingUtmStats = await request(`/api/tracking/analytics/by-utm${querySuffix}`) as TrackingUtmStat[]
    const linkParams = new URLSearchParams(params)
    linkParams.set('page', String(Math.max(0, linkPage)))
    linkParams.set('size', String(state.trackingLinkPage.size))
    const linkResult = await request(`/api/tracking/analytics/by-link?${linkParams}`)
    const linkPageResult = normalizePageResult<TrackingLinkStat>(linkResult, [], linkPage, state.trackingLinkPage.size)
    state.trackingLinkStats = linkPageResult.items
    state.trackingLinkPage = linkPageResult
    const eventParams = new URLSearchParams(params)
    eventParams.set('page', String(Math.max(0, page)))
    eventParams.set('size', String(state.trackingEventPage.size))
    const eventResult = await request(`/api/tracking/analytics/events?${eventParams}`)
    const pageResult = normalizePageResult<TrackingEvent>(eventResult, [], page, state.trackingEventPage.size)
    state.trackingEvents = pageResult.items
    state.trackingEventPage = pageResult
  } catch (error: unknown) {
    const err = error as { message?: string }
    state.trackingEvents = []
    state.trackingTimeseries = []
    state.trackingUtmStats = []
    state.trackingLinkStats = []
    state.trackingLinkPage = emptyPageResult<TrackingLinkStat>(0, state.trackingLinkPage.size)
    state.trackingEventPage = emptyPageResult<TrackingEvent>(0, state.trackingEventPage.size)
    state.error = `短链统计加载失败：${err.message}`
  }
}

export function changeTrackingEventPage(nextPage: number): void {
  if (nextPage < 0 || (state.trackingEventPage.totalPages && nextPage >= state.trackingEventPage.totalPages)) return
  loadTrackingAnalytics(nextPage)
}

export function jumpTrackingEventPage(pageNumber: number | string): void {
  const nextPage = boundedPage(state.trackingEventPage, pageNumber)
  if (nextPage === null || nextPage === state.trackingEventPage.page) return
  loadTrackingAnalytics(nextPage)
}

export function changeTrackingLinkPage(nextPage: number): void {
  if (nextPage < 0 || (state.trackingLinkPage.totalPages && nextPage >= state.trackingLinkPage.totalPages)) return
  loadTrackingAnalytics(state.trackingEventPage.page, nextPage)
}

export function jumpTrackingLinkPage(pageNumber: number | string): void {
  const nextPage = boundedPage(state.trackingLinkPage, pageNumber)
  if (nextPage === null || nextPage === state.trackingLinkPage.page) return
  loadTrackingAnalytics(state.trackingEventPage.page, nextPage)
}

async function createCampaign(): Promise<void> {
  state.loading = true
  state.error = ''
  state.notice = ''
  try {
    const campaign = await request('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify({ name: state.campaignForm.name, objective: state.campaignForm.objective })
    }) as Campaign
    state.selectedCampaign = campaign
    fillCampaignForm(campaign)
    await loadCampaigns()
    state.notice = '邮件活动已创建'
  } catch (error: unknown) {
    const err = error as { message?: string }
    state.error = `活动创建失败：${err.message}`
  } finally {
    state.loading = false
  }
}

async function saveCampaignSetup(): Promise<void> {
  if (!validateCampaignTemplateTrackingLink()) return
  if (!state.selectedCampaign?.id) {
    await createCampaign()
  }
  const campaignId = state.selectedCampaign?.id
  if (!campaignId) return
  state.loading = true
  state.error = ''
  state.notice = ''
  try {
    let campaign = await request(`/api/campaigns/${campaignId}/template`, {
      method: 'PUT',
      body: JSON.stringify(campaignTemplatePayload())
    }) as Campaign
    if (state.campaignForm.channelId) {
      campaign = await request(`/api/campaigns/${campaignId}/channel`, {
        method: 'PUT',
        body: JSON.stringify({ channelId: state.campaignForm.channelId })
      }) as Campaign
    }
    if (state.campaignForm.segmentIds.length) {
      campaign = await request(`/api/campaigns/${campaignId}/segments`, {
        method: 'PUT',
        body: JSON.stringify({ segmentIds: state.campaignForm.segmentIds })
      }) as Campaign
    }
    fillCampaignForm(campaign)
    await loadCampaigns()
    state.notice = '活动配置已保存'
  } catch (error: unknown) {
    const err = error as { message?: string }
    state.error = `活动配置保存失败：${err.message}`
  } finally {
    state.loading = false
  }
}

async function saveCampaignDraftForAdvance(): Promise<Campaign | null> {
  if (!validateCampaignTemplateTrackingLink()) return null

  let campaign = state.selectedCampaign
  if (!campaign?.id) {
    campaign = await request('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify({ name: state.campaignForm.name, objective: state.campaignForm.objective })
    }) as Campaign
    state.selectedCampaign = campaign
  }

  const campaignId = campaign.id
  campaign = await request(`/api/campaigns/${campaignId}/template`, {
    method: 'PUT',
    body: JSON.stringify(campaignTemplatePayload())
  }) as Campaign
  fillCampaignForm(campaign)
  await loadCampaigns()
  return campaign
}

async function saveCampaignTrackingLink(): Promise<void> {
  if (!state.selectedCampaign?.id) {
    state.error = '请先创建或选择活动'
    return
  }
  const campaignId = state.selectedCampaign.id
  state.loading = true
  state.error = ''
  state.notice = ''
  try {
    const campaign = await request(`/api/campaigns/${campaignId}/tracking-link`, {
      method: 'PUT',
      body: JSON.stringify(campaignTrackingLinkPayload())
    }) as Campaign
    fillCampaignForm(campaign)
    await loadCampaigns()
    state.trackingLinkDialogOpen = false
    state.notice = '短链接配置已保存'
  } catch (error: unknown) {
    const err = error as { message?: string }
    state.error = `短链接配置保存失败：${err.message}`
  } finally {
    state.loading = false
  }
}

async function previewCampaignTemplate(): Promise<void> {
  if (!validateCampaignTemplateTrackingLink()) return
  if (!state.selectedCampaign?.id) {
    updateLocalTemplatePreview()
    return
  }
  const campaignId = state.selectedCampaign.id
  state.templatePreviewLoading = true
  state.templatePreviewError = ''
  try {
    const result = await request(`/api/campaigns/${campaignId}/template/preview`, {
      method: 'POST',
      body: JSON.stringify(campaignTemplatePayload())
    }) as { subjectPreview?: string; htmlPreview?: string }
    state.templatePreviewSubject = result.subjectPreview || ''
    state.templatePreviewHtml = result.htmlPreview || ''
  } catch (error: unknown) {
    const err = error as { message?: string }
    state.templatePreviewHtml = ''
    state.templatePreviewSubject = ''
    state.templatePreviewError = err.message || '模板预览失败'
  } finally {
    state.templatePreviewLoading = false
  }
}

interface CampaignActionOptions {
  confirmedTestEmails?: boolean
  confirmedFinalPush?: boolean
}

async function runCampaignAction(action: string, options: CampaignActionOptions = {}): Promise<void> {
  if (!state.selectedCampaign?.id) {
    state.error = '请先选择或创建活动'
    return
  }
  if (campaignNextAction.value !== action) {
    state.error = campaignActionTitle(action)
    return
  }
  if (action === 'prePush') {
    const reason = campaignPrePushBlockReason()
    if (reason) {
      state.error = reason
      return
    }
  }
  if (action === 'simulateSend' && !options.confirmedTestEmails) {
    await openTestEmailDialog()
    return
  }
  if (action === 'simulateSend' && !state.selectedTestEmails.length) {
    state.error = '请选择或新增至少一个测试邮箱'
    return
  }
  state.loading = true
  state.error = ''
  state.notice = ''
  try {
    const campaignId = state.selectedCampaign.id
    const requestOptions = {
      method: 'POST',
      body: JSON.stringify(action === 'simulateSend' ? { testEmails: state.selectedTestEmails } : {})
    }
    const pathMap: Record<string, string> = {
      prePush: `/api/campaigns/${campaignId}/pre-push`,
      confirm: `/api/campaigns/${campaignId}/confirm`,
      simulateSend: `/api/campaigns/${campaignId}/simulate-send`
    }
    const campaign = await request(pathMap[action], requestOptions) as Campaign
    fillCampaignForm(campaign)
    await loadCampaigns()
    if (action === 'simulateSend') {
      closeTestEmailDialog()
      state.selectedTestEmails = []
      state.notice = '模拟发送成功'
    } else {
      state.notice = '活动状态已更新'
    }
  } catch (error: unknown) {
    const err = error as { message?: string }
    state.error = `活动操作失败：${err.message}`
  } finally {
    state.loading = false
  }
}

async function advanceCampaignStep(options: CampaignActionOptions = {}): Promise<void> {
  if (!campaignNextAction.value) {
    state.error = '当前活动生命周期已完成'
    return
  }
  if (!state.selectedCampaign?.id && campaignNextAction.value !== 'saveDraft') {
    state.error = '请先选择或创建活动'
    return
  }
  if (campaignNextAction.value === 'confirm' && !options.confirmedFinalPush) {
    openFinalConfirmDialog()
    return
  }
  if (campaignNextAction.value !== 'saveDraft') {
    await runCampaignAction(campaignNextAction.value, options)
    return
  }

  state.loading = true
  state.error = ''
  state.notice = ''
  try {
    const campaign = await saveCampaignDraftForAdvance()
    if (!campaign) return
    state.notice = `已确认并进入下一步：${campaignCurrentStatusLabel.value}`
  } catch (error: unknown) {
    const err = error as { message?: string }
    state.error = `活动状态推进失败：${err.message}`
  } finally {
    state.loading = false
  }
}

async function confirmTestSimulation(): Promise<void> {
  if (!state.selectedTestEmails.length) {
    state.error = '请选择或新增至少一个测试邮箱'
    return
  }
  await advanceCampaignStep({ confirmedTestEmails: true })
}

async function confirmFinalPush(): Promise<void> {
  closeFinalConfirmDialog()
  await runCampaignAction('confirm', { confirmedFinalPush: true })
}

interface CampaignStep {
  status: CampaignStatus
  label: string
  hint?: string
  active?: boolean
  done?: boolean
  rollback?: boolean
}

async function rollbackCampaignStep(step: CampaignStep | null | undefined): Promise<void> {
  if (!state.selectedCampaign?.id) {
    state.error = '请先选择或创建活动'
    return
  }
  if (!step?.rollback) {
    state.error = campaignStepTitle(step)
    return
  }
  state.loading = true
  state.error = ''
  state.notice = ''
  try {
    const campaign = await request(`/api/campaigns/${state.selectedCampaign.id}/rollback`, {
      method: 'POST',
      body: JSON.stringify({
        expectedStatus: campaignCurrentStatus.value,
        targetStatus: step.status
      })
    }) as Campaign
    fillCampaignForm(campaign)
    await loadCampaigns()
    state.notice = `已回退到上一步：${campaignCurrentStatusLabel.value}`
  } catch (error: unknown) {
    const err = error as { message?: string }
    state.error = `活动状态回退失败：${err.message}`
  } finally {
    state.loading = false
  }
}

async function loadMappingPreview(): Promise<void> {
  try {
    const result = await request('/api/customer-mapping/osm/preview') as MappingPreview
    state.mappingPreview = result
  } catch (error: unknown) {
    const err = error as { message?: string }
    state.mappingPreview = null
    state.error = `Mapping 预览加载失败：${err.message}`
  }
}

async function createChannel(): Promise<void> {
  state.loading = true
  state.error = ''
  state.notice = ''
  try {
    const isSmtp = state.channelType === 'smtp'
    const path = isSmtp ? '/api/channels/email/smtp' : '/api/channels/email/aws-ses'
    const payload = isSmtp
      ? {
          ...state.smtpForm,
          smtpPort: Number(state.smtpForm.smtpPort)
        }
      : state.awsSesForm
    await request(path, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    await loadChannels()
    if (isSmtp) {
      state.smtpForm.smtpPassword = ''
    } else {
      state.awsSesForm.awsSecretAccessKey = ''
    }
    state.notice = '推送通道已保存'
  } catch (error: unknown) {
    const err = error as { message?: string }
    state.error = `通道保存失败：${err.message}`
  } finally {
    state.loading = false
  }
}

async function importCustomerJson(): Promise<void> {
  if (!state.importFile) {
    state.error = '请选择客户 JSON 文件'
    return
  }
  state.loading = true
  state.error = ''
  state.notice = ''
  try {
    const form = new FormData()
    form.append('file', state.importFile)
    state.importResult = await request('/api/imports/customers-json', {
      method: 'POST',
      body: form
    }) as ImportResult
    await Promise.allSettled([loadCustomers(), loadCustomerSummary()])
    activateNav('customers')
    setCustomerToolState('list')
    state.notice = '客户 JSON 导入完成，已写入来源与客户资产主表'
  } catch (error: unknown) {
    const err = error as { message?: string }
    state.error = `导入失败：${err.message}`
  } finally {
    state.loading = false
  }
}

async function runOsmMapping(): Promise<void> {
  state.loading = true
  state.error = ''
  state.notice = ''
  try {
    state.mappingResult = await request('/api/customer-mapping/osm', {
      method: 'POST',
      body: JSON.stringify({})
    }) as MappingResult
    await Promise.allSettled([loadCustomers(), loadCustomerSummary(), loadMappingPreview()])
    state.notice = 'OSM 来源已 mapping 到客户资产主表'
  } catch (error: unknown) {
    const err = error as { message?: string }
    state.error = `Mapping 失败：${err.message}`
  } finally {
    state.loading = false
  }
}

export function onFileChange(event: Event): void {
  const target = event.target as HTMLInputElement
  state.importFile = target.files?.[0] || null
}

export async function loadDictionaryCountries(): Promise<void> {
  if (state.dictionary.countries.length > 0) return
  state.dictionary.loading = true
  state.dictionary.error = ''
  try {
    const countries = await request('/api/dictionary/countries') as Country[]
    state.dictionary.countries = countries || []
  } catch (error: unknown) {
    const err = error as { message?: string }
    state.dictionary.error = err.message || '加载国家列表失败'
    console.error('Failed to load countries:', error)
  } finally {
    state.dictionary.loading = false
  }
}

export async function loadDictionaryCities(countryId: string): Promise<void> {
  if (!countryId) return
  if (state.dictionary.citiesCache[countryId]) return
  state.dictionary.loading = true
  state.dictionary.error = ''
  try {
    const cities = await request(`/api/dictionary/cities?countryId=${encodeURIComponent(countryId)}`) as City[]
    state.dictionary.citiesCache[countryId] = cities || []
  } catch (error: unknown) {
    const err = error as { message?: string }
    state.dictionary.error = err.message || '加载城市列表失败'
    console.error('Failed to load cities:', error)
  } finally {
    state.dictionary.loading = false
  }
}

export function getCitiesByCountryId(countryId: string): City[] {
  return state.dictionary.citiesCache[countryId] || []
}

export function clearDictionaryCache(): void {
  state.dictionary.countries = []
  state.dictionary.citiesCache = {}
  state.dictionary.error = ''
}

updateLocalTemplatePreview()

if (state.token) {
  normalizeActiveNavAccess()
  refreshAll()
}
