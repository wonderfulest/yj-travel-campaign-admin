import { createApp, computed, nextTick, reactive } from 'vue'
import {
  BarChart3,
  Building2,
  ChevronDown,
  CheckCircle2,
  Code2,
  Database,
  Eye,
  ExternalLink,
  FileUp,
  GitMerge,
  Globe2,
  KeyRound,
  Layers,
  LogOut,
  Mail,
  MapPin,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  PlugZap,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Trash2,
  Users,
  X
} from 'lucide-vue-next'
import './styles.css'
import pioneerChinaEmailTemplate from './templates/pioneer-china-email.html?raw'
import {
  cloneTemplateVariables,
  parseTemplateVariables,
  scanTemplateVariableKeys,
  syncTemplateVariables,
  templateVariablesToJson
} from './template-variables.js'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]
const REQUIRED_TRACKING_LINK_PARAM = 'trackingLink'
const REQUIRED_TRACKING_LINK_MESSAGE = 'HTML 模板必须包含短链参数 ${trackingLink}'
const DEFAULT_TEMPLATE_VARIABLES = [
  { key: 'customerName', label: '客户名称', sampleValue: 'Reisen Scala', required: true },
  { key: 'companyName', label: '公司名称', sampleValue: 'Youjie Tech', required: false },
  { key: REQUIRED_TRACKING_LINK_PARAM, label: '短链', sampleValue: 'https://s.example.com/china-trip-demo', required: true }
]
const EMPTY_TEMPLATE_PREVIEW_HTML = '<!doctype html><html><body style="font-family:Arial,sans-serif;color:#667;margin:24px;">点击“渲染预览”查看模板效果</body></html>'

const demoCustomers = [
  {
    id: 'demo-1',
    name: 'Reisen Scala',
    country: 'DE',
    city: 'Berlin',
    email: 'info@scala-bts.de',
    website: 'http://www.scala-bts.de/',
    phone: '+49 30 89048330',
    emailQuality: 'PENDING',
    contactStatus: 'NOT_CONTACTED',
    sourcePrimary: 'OSM',
    longitude: 13.2934005,
    latitude: 52.497262
  },
  {
    id: 'demo-2',
    name: 'Günther und Bergmann',
    country: 'DE',
    city: 'Kleve',
    email: 'info@ihre-reisepartner.de',
    website: 'https://www.ihre-reiseplaner.de/',
    phone: '+49 2821 99797 0',
    emailQuality: 'PENDING',
    contactStatus: 'NOT_CONTACTED',
    sourcePrimary: 'OSM',
    longitude: 6.1359833,
    latitude: 51.7863806
  },
  {
    id: 'demo-3',
    name: 'Nordic City Travel',
    country: 'DK',
    city: 'Copenhagen',
    email: '',
    website: 'https://nordic.example',
    phone: '+45 11 22 33 44',
    emailQuality: 'MISSING',
    contactStatus: 'NOT_CONTACTED',
    sourcePrimary: 'OSM',
    longitude: 12.5683,
    latitude: 55.6761
  }
]

const state = reactive({
  token: localStorage.getItem('lead_admin_token') || '',
  user: JSON.parse(localStorage.getItem('lead_admin_user') || 'null'),
  authMode: 'login',
  authForm: {
    tenantName: 'Youjie Tech',
    displayName: 'Owner',
    email: 'owner@example.com',
    password: 'secret123'
  },
  activeNav: 'dashboard',
  sidebarCollapsed: localStorage.getItem('lead_admin_sidebar_collapsed') === 'true',
  loading: false,
  error: '',
  notice: '',
  customers: stateTokenIsDemo() ? demoCustomers : [],
  customerSummary: stateTokenIsDemo() ? summarizeCustomers(demoCustomers) : null,
  customerPage: {
    page: 0,
    size: 20,
    totalItems: stateTokenIsDemo() ? demoCustomers.length : 0,
    totalPages: stateTokenIsDemo() ? 1 : 0,
    hasNext: false,
    hasPrevious: false
  },
  channels: [],
  channelPage: {
    page: 0,
    size: 20,
    totalItems: 0,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false
  },
  segments: [],
  segmentPage: {
    page: 0,
    size: 20,
    totalItems: 0,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false
  },
  segmentMembers: [],
  segmentMemberPage: {
    page: 0,
    size: 20,
    totalItems: 0,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false
  },
  selectedSegment: null,
  segmentForm: {
    id: '',
    name: '德国有邮箱旅行社',
    description: '德国市场第一批可触达旅行社',
    rules: []
  },
  segmentRefreshResult: null,
  campaigns: [],
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
  },
  trackingTimeseries: [],
  trackingUtmStats: [],
  trackingLinkStats: [],
  trackingLinkPage: {
    page: 0,
    size: 20,
    totalItems: 0,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false
  },
  trackingEvents: [],
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
  },
  selectedCampaign: null,
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
    segmentIds: []
  },
  trackingLinkDialogOpen: false,
  segmentDropdownOpen: false,
  segmentDropdownQuery: '',
  templatePreviewHtml: '',
  templatePreviewSubject: '',
  templatePreviewError: '',
  templatePreviewLoading: false,
  mappingPreview: null,
  mappingResult: null,
  customerTool: 'list',
  channelType: 'smtp',
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
  },
  awsSesForm: {
    name: 'SES Frankfurt',
    fromEmail: 'noreply@example.com',
    fromName: 'Youjie Tech',
    replyTo: 'reply@example.com',
    awsRegion: 'eu-central-1',
    awsAccessKeyId: '',
    awsSecretAccessKey: ''
  },
  importFile: null,
  importResult: null,
  filter: '',
  selectedCustomer: null,
  customerProfile: null,
  customerProfileLoading: false,
  customerEditMode: false,
  customerEditForm: {},
  customerHelpVisible: true
})

const isLoggedIn = computed(() => Boolean(state.token))
const navItems = [
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

const ROLE_PAGE_ACCESS = {
  TENANT_OWNER: ['dashboard', 'customers', 'channels', 'segments', 'campaign-list', 'campaigns', 'tracking', 'imports', 'mapping', 'settings'],
  TENANT_ADMIN: ['dashboard', 'customers', 'channels', 'segments', 'campaign-list', 'campaigns', 'tracking', 'imports', 'mapping', 'settings'],
  TENANT_USER: ['dashboard', 'customers', 'settings']
}

const ROLE_LABELS = {
  TENANT_OWNER: '租户所有者',
  TENANT_ADMIN: '租户管理员',
  TENANT_USER: '租户成员'
}

const CAMPAIGN_LIFECYCLE_STEPS = [
  { status: 'DRAFT', label: '配置草稿', hint: '模板、通道、客群' },
  { status: 'PREVIEW_GENERATED', label: '生成预推送', hint: '锁定收件人' },
  { status: 'REVIEW_APPROVED', label: '审核通过', hint: '确认内容合规' },
  { status: 'SIMULATED', label: '模拟发送', hint: '只记录日志' },
  { status: 'CONFIRMED', label: '最终确认发送', hint: '进入发送态' }
]

const CAMPAIGN_STATUS_LABELS = {
  DRAFT: '配置草稿',
  PREVIEW_GENERATED: '已生成预推送',
  REVIEW_APPROVED: '审核通过',
  REVIEW_REJECTED: '审核驳回',
  SIMULATED: '已模拟发送',
  CONFIRMED: '最终确认发送'
}

const CAMPAIGN_NEXT_ACTION_BY_STATUS = {
  DRAFT: 'prePush',
  PREVIEW_GENERATED: 'review',
  REVIEW_APPROVED: 'simulateSend',
  SIMULATED: 'confirm'
}

const CAMPAIGN_ACTION_LABELS = {
  prePush: '生成预推送',
  review: '审核通过',
  simulateSend: '模拟发送',
  confirm: '最终确认发送'
}

function currentRoles() {
  return state.user?.roles?.length ? state.user.roles : ['TENANT_OWNER']
}

function canAccessNav(nav) {
  return currentRoles().some((role) => ROLE_PAGE_ACCESS[role]?.includes(nav))
}

const availableNavItems = computed(() => navItems.filter((item) => canAccessNav(item.key)))
const availablePrimaryNavItems = computed(() => availableNavItems.value.filter((item) => !item.parentKey))
const primaryRole = computed(() => currentRoles()[0])
const primaryRoleLabel = computed(() => ROLE_LABELS[primaryRole.value] || primaryRole.value)
const campaignCurrentStatus = computed(() => state.selectedCampaign?.status || 'DRAFT')
const campaignCurrentStatusLabel = computed(() => CAMPAIGN_STATUS_LABELS[campaignCurrentStatus.value] || campaignCurrentStatus.value)
const campaignNextAction = computed(() => CAMPAIGN_NEXT_ACTION_BY_STATUS[campaignCurrentStatus.value] || '')
const campaignNextActionLabel = computed(() => campaignNextAction.value ? campaignActionLabel(campaignNextAction.value) : '生命周期已完成')
const templateMissingTrackingLinkParam = computed(() => !campaignHtmlHasTrackingLinkParam())
const editableTemplateVariableRows = computed(() =>
  state.campaignForm.templateVariables
    .map((variable, index) => ({ variable, index }))
    .filter(({ variable }) => String(variable.key || '').trim() !== REQUIRED_TRACKING_LINK_PARAM)
)
const campaignSetupDirty = computed(() => {
  const campaign = state.selectedCampaign
  if (!campaign?.id || !campaign.template) return false
  return (campaign.template.subject || '') !== (state.campaignForm.subject || '')
    || (campaign.template.fromName || '') !== (state.campaignForm.fromName || '')
    || (campaign.template.htmlBody || campaign.template.body || '') !== (state.campaignForm.htmlBody || '')
    || String(campaign.channelId || '') !== String(state.campaignForm.channelId || '')
    || normalizedIdList(campaign.segmentIds) !== normalizedIdList(state.campaignForm.segmentIds)
    || normalizedTemplateVariables(parseTemplateVariables(campaign.template.variablesJson, DEFAULT_TEMPLATE_VARIABLES)) !== normalizedTemplateVariables(state.campaignForm.templateVariables)
})
const campaignTrackingLinkDirty = computed(() => {
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
const campaignLifecycleView = computed(() => {
  const currentIndex = campaignLifecycleIndex(campaignCurrentStatus.value)
  return CAMPAIGN_LIFECYCLE_STEPS.map((step, index) => ({
    ...step,
    active: index === currentIndex,
    done: index < currentIndex,
    rollback: index === currentIndex - 1
  }))
})
const pageMeta = computed(() => {
  const fallback = availableNavItems.value[0] || navItems[0]
  if (!canAccessNav(state.activeNav)) return fallback
  return navItems.find((item) => item.key === state.activeNav) || fallback
})
const filteredCustomers = computed(() => {
  const keyword = state.filter.trim().toLowerCase()
  if (!keyword) return state.customers
  return state.customers.filter((item) =>
    [item.name, item.email, item.website, item.country, item.city, item.sourcePrimary]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(keyword))
  )
})
const stats = computed(() => {
  const summary = state.customerSummary || summarizeCustomers(state.customers)
  return [
    { label: '客户总数', value: summary.totalCustomers, icon: Users, target: 'customers' },
    { label: '有邮箱客户', value: summary.customersWithEmail, icon: Mail, target: 'customers' },
    { label: '待验证邮箱', value: summary.pendingEmailCustomers, icon: CheckCircle2, target: 'customers' },
    { label: '待 Mapping', value: state.mappingPreview?.unmappedCount || 0, icon: GitMerge, target: 'customers', tool: 'mapping' },
    { label: '已配置通道', value: state.channelPage.totalItems || state.channels.length, icon: PlugZap, target: 'channels' },
    { label: '短链点击', value: state.trackingSummary.totalClicks || 0, icon: BarChart3, target: 'tracking' }
  ].filter((item) => canAccessNav(item.target) && (!item.tool || canAccessNav(item.tool)))
})
const customerCountryStats = computed(() => {
  const summary = state.customerSummary || summarizeCustomers(state.customers)
  return Array.isArray(summary.customersByCountry) ? summary.customersByCountry : []
})

function campaignLifecycleIndex(status) {
  if (status === 'REVIEW_REJECTED') return 2
  const index = CAMPAIGN_LIFECYCLE_STEPS.findIndex((step) => step.status === status)
  return index >= 0 ? index : 0
}

function campaignActionLabel(action) {
  return CAMPAIGN_ACTION_LABELS[action] || action
}

function campaignPrePushBlockReason() {
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

function isCampaignActionDisabled(action) {
  if (state.loading || !state.selectedCampaign?.id) return true
  if (action === 'prePush' && campaignPrePushBlockReason()) return true
  return campaignNextAction.value !== action
}

function isCampaignAdvanceDisabled() {
  if (state.loading || !campaignNextAction.value) return true
  if (state.selectedCampaign?.id) return false
  return campaignNextAction.value !== 'prePush' || !state.campaignForm.name.trim()
}

function isCampaignStepDisabled(step) {
  return state.loading || !state.selectedCampaign?.id || !step?.rollback
}

function campaignActionTitle(action) {
  if (!state.selectedCampaign?.id) return '请先创建或选择活动'
  if (action === 'prePush') {
    const reason = campaignPrePushBlockReason()
    if (reason) return reason
  }
  if (campaignNextAction.value === action) return campaignActionLabel(action)
  if (!campaignNextAction.value) return '当前活动生命周期已完成'
  return `下一步应执行：${campaignActionLabel(campaignNextAction.value)}`
}

function campaignAdvanceTitle() {
  if (!campaignNextAction.value) return '当前活动生命周期已完成'
  if (!state.selectedCampaign?.id) return '保存当前草稿配置，并进入生成预推送'
  if (campaignNextAction.value === 'prePush') {
    const reason = campaignPrePushBlockReason()
    if (reason) return reason
  }
  return `确认完成当前步骤，并进入：${campaignNextActionLabel.value}`
}

function campaignStepTitle(step) {
  if (!state.selectedCampaign?.id) return '请先创建或选择活动'
  if (step?.active) return '当前步骤'
  if (step?.rollback) return `回退到上一步：${step.label}`
  return '只能回退到上一步或确认进入下一步'
}

function normalizedIdList(ids) {
  return [...(ids || [])].map(String).sort().join('|')
}

function normalizedTemplateVariables(variables) {
  return JSON.stringify((variables || []).map((variable) => ({
    key: String(variable.key || '').trim(),
    label: String(variable.label || '').trim(),
    sampleValue: String(variable.sampleValue || ''),
    required: Boolean(variable.required)
  })))
}

function setActiveNav(nav) {
  if (!canAccessNav(nav)) {
    state.error = '当前角色没有访问该页面的权限'
    state.activeNav = availableNavItems.value[0]?.key || 'dashboard'
    return
  }
  state.error = ''
  state.activeNav = nav
  if (nav !== 'customers') {
    state.customerTool = 'list'
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

function navChildItems(parentKey) {
  return availableNavItems.value.filter((item) => item.parentKey === parentKey)
}

function isNavItemActive(item) {
  if (state.activeNav === item.key) return true
  return navChildItems(item.key).some((child) => child.key === state.activeNav)
}

function toggleSidebar() {
  state.sidebarCollapsed = !state.sidebarCollapsed
  localStorage.setItem('lead_admin_sidebar_collapsed', String(state.sidebarCollapsed))
}

function openStatTarget(item) {
  if (item.target === 'customers' && item.tool) {
    setCustomerTool(item.tool)
    return
  }
  setActiveNav(item.target)
}

function normalizedWebsiteUrl(website) {
  const value = String(website || '').trim()
  if (!value) return ''
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

function formatWebsiteLabel(website) {
  return String(website || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/$/, '')
}

function displayValue(value) {
  if (value === null || value === undefined || value === '') return '-'
  return value
}

function percentValue(value) {
  return `${Math.round(Number(value || 0) * 100)}%`
}

function jsonObject(value) {
  if (!value) return null
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function localizedName(value) {
  const parsed = jsonObject(value)
  if (!parsed) return displayValue(value)
  return parsed.zh || parsed['zh-CN'] || parsed.en || Object.values(parsed).find(Boolean) || '-'
}

function formatLanguages(languages) {
  if (!languages?.length) return '-'
  return languages.map((item) => localizedName(item)).filter((item) => item && item !== '-').join('、') || '-'
}

function destinationLabel(destination) {
  if (!destination) return '-'
  if (destination.country) return `${destination.country.id} ${localizedName(destination.country.name)}`
  if (destination.city) return `${localizedName(destination.city.name)}${destination.city.country?.id ? ` / ${destination.city.country.id}` : ''}`
  if (destination.worldRegion) return localizedName(destination.worldRegion.name)
  if (destination.iataAirport) return `${destination.iataAirport.id} ${localizedName(destination.iataAirport.name)}`
  return '-'
}

function profileAsset() {
  return state.customerProfile?.asset || state.selectedCustomer || {}
}

function formatCountryShare(customers) {
  const total = Number((state.customerSummary || summarizeCustomers(state.customers)).totalCustomers || 0)
  if (!total) return '0%'
  return `${Math.round((Number(customers || 0) / total) * 100)}%`
}

async function copyShortLink(url) {
  if (!url) return
  try {
    await navigator.clipboard?.writeText(url)
    state.notice = '短链已复制'
  } catch {
    state.notice = url
  }
}

async function openCustomerDetail(customer) {
  state.selectedCustomer = customer
  state.customerProfile = null
  state.customerEditMode = false
  state.customerEditForm = {}
  await loadCustomerProfile(customer)
}

function closeCustomerDetail() {
  state.selectedCustomer = null
  state.customerProfile = null
  state.customerEditMode = false
  state.customerEditForm = {}
}

function openCustomerEdit(customer) {
  const asset = customer || profileAsset()
  state.selectedCustomer = asset
  state.customerEditMode = true
  state.customerEditForm = {
    name: asset.name || '',
    country: asset.country || '',
    city: asset.city || '',
    postcode: asset.postcode || '',
    street: asset.street || '',
    houseNumber: asset.houseNumber || '',
    website: asset.website || '',
    phone: asset.phone || '',
    email: asset.email || '',
    emailQuality: asset.emailQuality || 'PENDING',
    contactStatus: asset.contactStatus || 'NOT_CONTACTED',
    businessScope: asset.businessScope || state.customerProfile?.businessScope || ''
  }
}

async function loadCustomerProfile(customer = state.selectedCustomer) {
  if (!customer?.id) return
  state.customerProfileLoading = true
  try {
    if (state.token === 'demo-token') {
      state.customerProfile = {
        asset: customer,
        businessScope: customer.businessScope || '欧洲出境及中国入境定制旅行',
        travelProfile: null,
        destinations: [],
        languages: [],
        sources: []
      }
      return
    }
    state.customerProfile = await request(`/api/customers/${customer.id}/asset-profile`)
    if (state.customerProfile?.asset) {
      state.selectedCustomer = state.customerProfile.asset
      replaceCustomer(state.customerProfile.asset)
    }
  } catch (error) {
    state.customerProfile = {
      asset: customer,
      businessScope: customer.businessScope || '',
      travelProfile: null,
      destinations: [],
      languages: [],
      sources: []
    }
    state.error = `客户全局画像加载失败：${error.message}`
  } finally {
    state.customerProfileLoading = false
  }
}

async function saveCustomerEdit() {
  if (!state.selectedCustomer) return
  state.loading = true
  state.error = ''
  state.notice = ''
  try {
    const body = { ...state.customerEditForm }
    if (state.token === 'demo-token') {
      const updated = { ...state.selectedCustomer, ...body }
      replaceCustomer(updated)
    } else {
      const updated = await request(`/api/customers/${state.selectedCustomer.id}`, {
        method: 'PUT',
        body: JSON.stringify(body)
      })
      replaceCustomer(updated)
    }
    state.customerEditMode = false
    state.customerEditForm = {}
    await loadCustomerProfile(updated)
    state.notice = '客户资产已更新'
  } catch (error) {
    state.error = error.message || '保存失败'
  } finally {
    state.loading = false
  }
}

const EMAIL_QUALITY_OPTIONS = ['PENDING', 'VERIFIED', 'BOUNCED', 'MISSING']

async function updateEmailQuality(customer, quality) {
  if (!customer || customer.emailQuality === quality) return
  state.loading = true
  state.error = ''
  state.notice = ''
  try {
    if (state.token === 'demo-token') {
      const updated = { ...customer, emailQuality: quality }
      replaceCustomer(updated)
      state.customerSummary = summarizeCustomers(state.customers)
    } else {
      const updated = await request(`/api/customers/${customer.id}/email-quality`, {
        method: 'PATCH',
        body: JSON.stringify({ emailQuality: quality })
      })
      replaceCustomer(updated)
      await loadCustomerSummary()
    }
    state.notice = `邮箱状态已更新为 ${quality}`
  } catch (error) {
    state.error = error.message || '更新失败'
  } finally {
    state.loading = false
  }
}

function setCustomerTool(tool) {
  if (tool === 'imports' && !canAccessNav('imports')) {
    state.error = '当前角色没有使用 OSM 导入的权限'
    return
  }
  if (tool === 'mapping' && !canAccessNav('mapping')) {
    state.error = '当前角色没有使用资产 Mapping 的权限'
    return
  }
  state.error = ''
  state.activeNav = 'customers'
  state.customerTool = tool
  if (tool === 'mapping') {
    loadMappingPreview()
  }
}

function normalizePageResult(result, fallbackItems = [], fallbackPage = 0, fallbackSize = 20) {
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

function localPageResult(items, page = 0, size = 20) {
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

function summarizeCustomers(items) {
  const countryCounts = new Map()
  for (const item of items) {
    const country = String(item.country || '').trim() || '未填写'
    countryCounts.set(country, (countryCounts.get(country) || 0) + 1)
  }
  return {
    totalCustomers: items.length,
    customersWithEmail: items.filter((item) => item.email).length,
    pendingEmailCustomers: items.filter((item) => item.emailQuality === 'PENDING').length,
    customersByCountry: [...countryCounts.entries()]
      .map(([country, customers]) => ({ country, customers }))
      .sort((left, right) => right.customers - left.customers || left.country.localeCompare(right.country))
  }
}

function stateTokenIsDemo() {
  return localStorage.getItem('lead_admin_token') === 'demo-token'
}

function emptyPageResult(page = 0, size = 20) {
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

function pageQuery(pageInfo, nextPage = pageInfo.page) {
  const params = new URLSearchParams({
    page: String(Math.max(0, nextPage)),
    size: String(pageInfo.size)
  })
  return params.toString()
}

function changeCustomerPage(nextPage) {
  if (nextPage < 0 || (state.customerPage.totalPages && nextPage >= state.customerPage.totalPages)) return
  loadCustomers(nextPage)
}

function changeCustomerPageSize(size) {
  const nextSize = Number(size)
  if (!nextSize) return
  state.customerPage.size = nextSize
  loadCustomers(0)
}

function changeChannelPage(nextPage) {
  if (nextPage < 0 || (state.channelPage.totalPages && nextPage >= state.channelPage.totalPages)) return
  loadChannels(nextPage)
}

function changeChannelPageSize(size) {
  const nextSize = Number(size)
  if (!nextSize) return
  state.channelPage.size = nextSize
  loadChannels(0)
}

function changeSegmentPage(nextPage) {
  if (nextPage < 0 || (state.segmentPage.totalPages && nextPage >= state.segmentPage.totalPages)) return
  loadSegments(nextPage)
}

function changeSegmentPageSize(size) {
  const nextSize = Number(size)
  if (!nextSize) return
  state.segmentPage.size = nextSize
  loadSegments(0)
}

function changeCampaignPage(nextPage) {
  if (nextPage < 0 || (state.campaignPage.totalPages && nextPage >= state.campaignPage.totalPages)) return
  loadCampaigns(nextPage)
}

function changeCampaignPageSize(size) {
  const nextSize = Number(size)
  if (!nextSize) return
  state.campaignPage.size = nextSize
  loadCampaigns(0)
}

function csvToList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function fillSegmentForm(segment) {
  state.selectedSegment = segment
  let rules = []
  if (segment.rules?.conditions) {
    rules = segment.rules.conditions.map(c => ({ ...c, _valueText: Array.isArray(c.values) ? c.values.join(',') : (c.values?.[0] ?? '') }))
  }
  state.segmentForm = {
    id: segment.id,
    name: segment.name || '',
    description: segment.description || '',
    rules
  }
  loadSegmentMembers(segment.id)
}

function resetSegmentForm() {
  state.selectedSegment = null
  state.segmentMembers = []
  state.segmentMemberPage = emptyPageResult(0, state.segmentMemberPage.size)
  state.segmentForm = {
    id: '',
    name: '',
    description: '',
    rules: []
  }
}

const RULE_FIELDS = [
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

const RULE_OPS = [
  { value: 'IN', label: '包含于 (IN)', multi: true },
  { value: 'NOT_IN', label: '不包含于 (NOT_IN)', multi: true },
  { value: 'EQ', label: '等于 (EQ)', multi: false },
  { value: 'NEQ', label: '不等于 (NEQ)', multi: false },
  { value: 'CONTAINS', label: '包含字符串 (CONTAINS)', multi: false },
  { value: 'NOT_CONTAINS', label: '不含字符串 (NOT_CONTAINS)', multi: false },
  { value: 'IS_EMPTY', label: '为空 (IS_EMPTY)', multi: false },
  { value: 'IS_NOT_EMPTY', label: '不为空 (IS_NOT_EMPTY)', multi: false },
]

function ruleOpIsMulti(op) {
  return RULE_OPS.find(o => o.value === op)?.multi ?? false
}

function ruleOpHasValue(op) {
  return op !== 'IS_EMPTY' && op !== 'IS_NOT_EMPTY'
}

function addRule() {
  state.segmentForm.rules.push({ field: 'country', op: 'IN', values: [], _valueText: '' })
}

function removeRule(index) {
  state.segmentForm.rules.splice(index, 1)
}

function buildRules(rules) {
  if (!rules || rules.length === 0) return null
  const conditions = rules.map(r => {
    const isMulti = ruleOpIsMulti(r.op)
    const hasVal = ruleOpHasValue(r.op)
    let values
    if (!hasVal) {
      values = []
    } else if (isMulti) {
      values = (r._valueText || '').split(',').map(v => v.trim()).filter(Boolean)
    } else {
      values = [(r._valueText || '')].filter(Boolean)
    }
    const c = { field: r.field, op: r.op, values }
    return c
  })
  return { logic: 'AND', conditions }
}

function segmentPayload() {
  return {
    name: state.segmentForm.name,
    description: state.segmentForm.description,
    rules: buildRules(state.segmentForm.rules)
  }
}

function fillCampaignForm(campaign) {
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
  state.campaignForm.trackingUtmCampaign = campaign.trackingLink?.utmCampaign || campaign.id || state.campaignForm.trackingUtmCampaign
  state.campaignForm.trackingUtmContent = campaign.trackingLink?.utmContent || state.campaignForm.trackingUtmContent
  state.campaignForm.trackingUtmTerm = campaign.trackingLink?.utmTerm || ''
  state.campaignForm.channelId = campaign.channelId || ''
  state.campaignForm.segmentIds = [...(campaign.segmentIds || [])]
  state.segmentDropdownOpen = false
  state.segmentDropdownQuery = ''
  state.trackingLinkDialogOpen = false
  state.templatePreviewHtml = ''
  state.templatePreviewSubject = ''
  state.templatePreviewError = ''
}

function openCampaignDetail(campaign) {
  fillCampaignForm(campaign)
  state.activeNav = 'campaigns'
  state.error = ''
}

function openCampaignList() {
  state.activeNav = 'campaign-list'
  state.error = ''
  loadCampaigns()
}

function startNewCampaign() {
  state.selectedCampaign = null
  state.campaignForm = {
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
  state.segmentDropdownOpen = false
  state.segmentDropdownQuery = ''
  state.trackingLinkDialogOpen = false
  state.templatePreviewHtml = ''
  state.templatePreviewSubject = ''
  state.templatePreviewError = ''
  state.activeNav = 'campaigns'
  state.error = ''
}

function syncCampaignTemplateVariables() {
  state.campaignForm.templateVariables = syncTemplateVariables({
    subject: state.campaignForm.subject,
    htmlBody: state.campaignForm.htmlBody,
    variables: state.campaignForm.templateVariables
  })
}

function templateVariablesJson() {
  syncCampaignTemplateVariables()
  return templateVariablesToJson(state.campaignForm.templateVariables)
}

function addTemplateVariable() {
  state.campaignForm.templateVariables.push({
    key: '',
    label: '',
    sampleValue: '',
    required: false
  })
}

function removeTemplateVariable(index) {
  state.campaignForm.templateVariables.splice(index, 1)
}

async function insertTemplateVariable(variable) {
  const key = String(variable?.key || '').trim()
  if (!key) return
  const placeholder = '${' + key + '}'
  const editor = document.getElementById('campaign-html-editor')
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

function campaignTemplatePayload() {
  syncCampaignTemplateVariables()
  return {
    subject: state.campaignForm.subject,
    fromName: state.campaignForm.fromName,
    htmlBody: state.campaignForm.htmlBody,
    variablesJson: templateVariablesJson()
  }
}

function campaignHtmlHasTrackingLinkParam() {
  return scanTemplateVariableKeys(state.campaignForm.htmlBody).includes(REQUIRED_TRACKING_LINK_PARAM)
}

function validateCampaignTemplateTrackingLink() {
  if (campaignHtmlHasTrackingLinkParam()) return true
  state.templatePreviewHtml = ''
  state.templatePreviewSubject = ''
  state.templatePreviewError = REQUIRED_TRACKING_LINK_MESSAGE
  state.error = REQUIRED_TRACKING_LINK_MESSAGE
  return false
}

function campaignTrackingLinkPayload() {
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

function openTrackingLinkDialog() {
  if (!state.selectedCampaign?.id) {
    state.error = '请先创建或选择活动'
    return
  }
  state.trackingLinkDialogOpen = true
}

function closeTrackingLinkDialog() {
  state.trackingLinkDialogOpen = false
}

function filteredCampaignSegments() {
  const keyword = state.segmentDropdownQuery.trim().toLowerCase()
  if (!keyword) return state.segments
  return state.segments.filter((segment) =>
    [segment.name, segment.id, segment.description]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(keyword))
  )
}

function selectedCampaignSegments() {
  return state.campaignForm.segmentIds
    .map((id) => state.segments.find((segment) => segment.id === id))
    .filter(Boolean)
}

function isCampaignSegmentSelected(segmentId) {
  return state.campaignForm.segmentIds.includes(segmentId)
}

function toggleCampaignSegment(segmentId) {
  if (isCampaignSegmentSelected(segmentId)) {
    state.campaignForm.segmentIds = state.campaignForm.segmentIds.filter((id) => id !== segmentId)
    return
  }
  state.campaignForm.segmentIds = [...state.campaignForm.segmentIds, segmentId]
}

function removeCampaignSegment(segmentId) {
  state.campaignForm.segmentIds = state.campaignForm.segmentIds.filter((id) => id !== segmentId)
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) }
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`
  }
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (!response.ok) {
    const text = await response.text()
    if (response.status === 401 || response.status === 403) {
      throw new Error('当前账号没有权限或登录已失效，请退出后使用 TENANT_OWNER / TENANT_ADMIN 账号重新登录')
    }
    throw new Error(text || `HTTP ${response.status}`)
  }
  const contentType = response.headers.get('content-type') || ''
  return contentType.includes('application/json') ? response.json() : response.text()
}

function persistSession(result) {
  state.token = result.accessToken
  state.user = {
    email: result.email,
    tenantId: result.tenantId,
    userId: result.userId,
    roles: result.roles || []
  }
  localStorage.setItem('lead_admin_token', state.token)
  localStorage.setItem('lead_admin_user', JSON.stringify(state.user))
}

async function login() {
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
    })
    persistSession(result)
    await refreshAll()
    state.notice = '已进入租户后台'
  } catch (error) {
    state.error = `认证失败：${error.message}`
  } finally {
    state.loading = false
  }
}

function logout() {
  state.token = ''
  state.user = null
  state.activeNav = 'dashboard'
  localStorage.removeItem('lead_admin_token')
  localStorage.removeItem('lead_admin_user')
}

async function refreshAll() {
  if (state.token === 'demo-token') {
    return
  }
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
  } else {
    state.segments = []
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
  if (state.token === 'demo-token') {
    state.customerSummary = summarizeCustomers(demoCustomers)
    return
  }
  try {
    state.customerSummary = await request('/api/customers/summary')
  } catch (error) {
    state.customerSummary = null
    state.error = `客户统计加载失败：${error.message}`
  }
}

function replaceCustomer(updatedCustomer) {
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

async function loadCustomers(page = state.customerPage.page) {
  if (state.token === 'demo-token') {
    const pageResult = localPageResult(demoCustomers, page, state.customerPage.size)
    state.customers = pageResult.items
    state.customerPage = pageResult
    if (state.selectedCustomer) {
      state.selectedCustomer = pageResult.items.find((item) => item.id === state.selectedCustomer.id) || null
    }
    return
  }
  try {
    const result = await request(`/api/customers?${pageQuery(state.customerPage, page)}`)
    const pageResult = normalizePageResult(result, [], page, state.customerPage.size)
    state.customers = pageResult.items
    state.customerPage = pageResult
    if (state.selectedCustomer) {
      state.selectedCustomer = pageResult.items.find((item) => item.id === state.selectedCustomer.id) || null
    }
  } catch (error) {
    state.customers = []
    state.customerPage = emptyPageResult(0, state.customerPage.size)
    state.selectedCustomer = null
    state.error = `客户资产加载失败：${error.message}`
  }
}

async function loadChannels(page = state.channelPage.page) {
  if (state.token === 'demo-token') {
    const pageResult = localPageResult([], page, state.channelPage.size)
    state.channels = pageResult.items
    state.channelPage = pageResult
    return
  }
  try {
    const result = await request(`/api/channels?${pageQuery(state.channelPage, page)}`)
    const pageResult = normalizePageResult(result, [], page, state.channelPage.size)
    state.channels = pageResult.items
    state.channelPage = pageResult
  } catch (error) {
    state.channels = []
    state.channelPage = normalizePageResult([], [], 0, state.channelPage.size)
    state.error = `推送通道加载失败：${error.message}`
  }
}

async function loadSegments(page = state.segmentPage.page) {
  try {
    const result = await request(`/api/segments?${pageQuery(state.segmentPage, page)}`)
    const pageResult = normalizePageResult(result, [], page, state.segmentPage.size)
    state.segments = pageResult.items
    state.segmentPage = pageResult
    if (!state.selectedSegment && pageResult.items.length) {
      fillSegmentForm(pageResult.items[0])
    }
  } catch (error) {
    state.segments = []
    state.segmentPage = emptyPageResult(0, state.segmentPage.size)
    state.error = `客群加载失败：${error.message}`
  }
}

async function loadSegmentMembers(segmentId = state.selectedSegment?.id, page = state.segmentMemberPage.page) {
  if (!segmentId) return
  try {
    const result = await request(`/api/segments/${segmentId}/members?${pageQuery(state.segmentMemberPage, page)}`)
    const pageResult = normalizePageResult(result, [], page, state.segmentMemberPage.size)
    state.segmentMembers = pageResult.items
    state.segmentMemberPage = pageResult
  } catch (error) {
    state.segmentMembers = []
    state.segmentMemberPage = emptyPageResult(0, state.segmentMemberPage.size)
    state.error = `客群成员加载失败：${error.message}`
  }
}

async function saveSegment() {
  state.loading = true
  state.error = ''
  state.notice = ''
  try {
    const isUpdate = Boolean(state.segmentForm.id)
    const result = await request(isUpdate ? `/api/segments/${state.segmentForm.id}` : '/api/segments', {
      method: isUpdate ? 'PUT' : 'POST',
      body: JSON.stringify(segmentPayload())
    })
    state.notice = isUpdate ? '客群规则已更新' : '客群已创建'
    await loadSegments()
    fillSegmentForm(result)
  } catch (error) {
    state.error = `客群保存失败：${error.message}`
  } finally {
    state.loading = false
  }
}

async function refreshSegment(segmentId = state.selectedSegment?.id) {
  if (!segmentId) {
    state.error = '请先选择客群'
    return
  }
  state.loading = true
  state.error = ''
  state.notice = ''
  try {
    state.segmentRefreshResult = await request(`/api/segments/${segmentId}/refresh`, { method: 'POST', body: JSON.stringify({}) })
    await loadSegmentMembers(segmentId, 0)
    state.notice = `客群已刷新，命中 ${state.segmentRefreshResult.matchedCount} 个客户`
  } catch (error) {
    state.error = `客群刷新失败：${error.message}`
  } finally {
    state.loading = false
  }
}

async function loadCampaigns(page = state.campaignPage.page) {
  try {
    const result = await request(`/api/campaigns?${pageQuery(state.campaignPage, page)}`)
    const pageResult = normalizePageResult(result, [], page, state.campaignPage.size)
    state.campaigns = pageResult.items
    state.campaignPage = pageResult
    if (!state.selectedCampaign && pageResult.items.length) {
      fillCampaignForm(pageResult.items[0])
    }
  } catch (error) {
    state.campaigns = []
    state.campaignPage = emptyPageResult(0, state.campaignPage.size)
    state.error = `活动加载失败：${error.message}`
  }
}

async function loadTrackingAnalytics(page = state.trackingEventPage.page, linkPage = state.trackingLinkPage.page) {
  if (state.token === 'demo-token') {
    state.trackingSummary = { totalClicks: 0, clickedCustomers: 0, shortLinks: 0, clickRate: 0 }
    state.trackingTimeseries = []
    state.trackingUtmStats = []
    state.trackingLinkStats = []
    state.trackingLinkPage = emptyPageResult(0, state.trackingLinkPage.size)
    state.trackingEvents = []
    state.trackingEventPage = emptyPageResult(0, state.trackingEventPage.size)
    return
  }
  try {
    const params = new URLSearchParams()
    if (state.trackingFilter.campaignId) params.set('campaignId', state.trackingFilter.campaignId)
    const querySuffix = params.toString() ? `?${params}` : ''
    state.trackingSummary = await request(`/api/tracking/analytics/summary${querySuffix}`)
    state.trackingTimeseries = await request(`/api/tracking/analytics/timeseries${querySuffix}`)
    state.trackingUtmStats = await request(`/api/tracking/analytics/by-utm${querySuffix}`)
    const linkParams = new URLSearchParams(params)
    linkParams.set('page', String(Math.max(0, linkPage)))
    linkParams.set('size', String(state.trackingLinkPage.size))
    const linkResult = await request(`/api/tracking/analytics/by-link?${linkParams}`)
    const linkPageResult = normalizePageResult(linkResult, [], linkPage, state.trackingLinkPage.size)
    state.trackingLinkStats = linkPageResult.items
    state.trackingLinkPage = linkPageResult
    const eventParams = new URLSearchParams(params)
    eventParams.set('page', String(Math.max(0, page)))
    eventParams.set('size', String(state.trackingEventPage.size))
    const eventResult = await request(`/api/tracking/analytics/events?${eventParams}`)
    const pageResult = normalizePageResult(eventResult, [], page, state.trackingEventPage.size)
    state.trackingEvents = pageResult.items
    state.trackingEventPage = pageResult
  } catch (error) {
    state.trackingEvents = []
    state.trackingTimeseries = []
    state.trackingUtmStats = []
    state.trackingLinkStats = []
    state.trackingLinkPage = emptyPageResult(0, state.trackingLinkPage.size)
    state.trackingEventPage = emptyPageResult(0, state.trackingEventPage.size)
    state.error = `短链统计加载失败：${error.message}`
  }
}

function changeTrackingEventPage(nextPage) {
  if (nextPage < 0 || (state.trackingEventPage.totalPages && nextPage >= state.trackingEventPage.totalPages)) return
  loadTrackingAnalytics(nextPage)
}

function changeTrackingLinkPage(nextPage) {
  if (nextPage < 0 || (state.trackingLinkPage.totalPages && nextPage >= state.trackingLinkPage.totalPages)) return
  loadTrackingAnalytics(state.trackingEventPage.page, nextPage)
}

async function createCampaign() {
  state.loading = true
  state.error = ''
  state.notice = ''
  try {
    const campaign = await request('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify({ name: state.campaignForm.name, objective: state.campaignForm.objective })
    })
    state.selectedCampaign = campaign
    fillCampaignForm(campaign)
    await loadCampaigns()
    state.notice = '邮件活动已创建'
  } catch (error) {
    state.error = `活动创建失败：${error.message}`
  } finally {
    state.loading = false
  }
}

async function saveCampaignSetup() {
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
    })
    if (state.campaignForm.channelId) {
      campaign = await request(`/api/campaigns/${campaignId}/channel`, {
        method: 'PUT',
        body: JSON.stringify({ channelId: state.campaignForm.channelId })
      })
    }
    if (state.campaignForm.segmentIds.length) {
      campaign = await request(`/api/campaigns/${campaignId}/segments`, {
        method: 'PUT',
        body: JSON.stringify({ segmentIds: state.campaignForm.segmentIds })
      })
    }
    fillCampaignForm(campaign)
    await loadCampaigns()
    state.notice = '活动配置已保存'
  } catch (error) {
    state.error = `活动配置保存失败：${error.message}`
  } finally {
    state.loading = false
  }
}

async function saveCampaignDraftForAdvance() {
  if (!validateCampaignTemplateTrackingLink()) return null
  if (!state.campaignForm.channelId) {
    state.error = '请先选择推送通道'
    return null
  }
  if (!state.campaignForm.segmentIds.length) {
    state.error = '请先选择客群'
    return null
  }

  let campaign = state.selectedCampaign
  if (!campaign?.id) {
    campaign = await request('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify({ name: state.campaignForm.name, objective: state.campaignForm.objective })
    })
    state.selectedCampaign = campaign
  }

  const campaignId = campaign.id
  campaign = await request(`/api/campaigns/${campaignId}/template`, {
    method: 'PUT',
    body: JSON.stringify(campaignTemplatePayload())
  })
  campaign = await request(`/api/campaigns/${campaignId}/tracking-link`, {
    method: 'PUT',
    body: JSON.stringify(campaignTrackingLinkPayload())
  })
  campaign = await request(`/api/campaigns/${campaignId}/channel`, {
    method: 'PUT',
    body: JSON.stringify({ channelId: state.campaignForm.channelId })
  })
  campaign = await request(`/api/campaigns/${campaignId}/segments`, {
    method: 'PUT',
    body: JSON.stringify({ segmentIds: state.campaignForm.segmentIds })
  })
  fillCampaignForm(campaign)
  await loadCampaigns()
  return campaign
}

async function saveCampaignTrackingLink() {
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
    })
    fillCampaignForm(campaign)
    await loadCampaigns()
    state.trackingLinkDialogOpen = false
    state.notice = '短链接配置已保存'
  } catch (error) {
    state.error = `短链接配置保存失败：${error.message}`
  } finally {
    state.loading = false
  }
}

async function previewCampaignTemplate() {
  if (!validateCampaignTemplateTrackingLink()) return
  if (!state.selectedCampaign?.id) {
    state.templatePreviewError = '请先选择或创建活动'
    return
  }
  const campaignId = state.selectedCampaign.id
  state.templatePreviewLoading = true
  state.templatePreviewError = ''
  try {
    const result = await request(`/api/campaigns/${campaignId}/template/preview`, {
      method: 'POST',
      body: JSON.stringify(campaignTemplatePayload())
    })
    state.templatePreviewSubject = result.subjectPreview || ''
    state.templatePreviewHtml = result.htmlPreview || ''
  } catch (error) {
    state.templatePreviewHtml = ''
    state.templatePreviewSubject = ''
    state.templatePreviewError = error.message || '模板预览失败'
  } finally {
    state.templatePreviewLoading = false
  }
}

async function runCampaignAction(action) {
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
  state.loading = true
  state.error = ''
  state.notice = ''
  try {
    const campaignId = state.selectedCampaign.id
    const options = action === 'review'
      ? { method: 'POST', body: JSON.stringify({ decision: 'APPROVED', reason: '' }) }
      : { method: 'POST', body: JSON.stringify({}) }
    const pathMap = {
      prePush: `/api/campaigns/${campaignId}/pre-push`,
      review: `/api/campaigns/${campaignId}/review`,
      confirm: `/api/campaigns/${campaignId}/confirm`,
      simulateSend: `/api/campaigns/${campaignId}/simulate-send`
    }
    const campaign = await request(pathMap[action], options)
    fillCampaignForm(campaign)
    await loadCampaigns()
    state.notice = '活动状态已更新'
  } catch (error) {
    state.error = `活动操作失败：${error.message}`
  } finally {
    state.loading = false
  }
}

async function advanceCampaignStep() {
  if (!campaignNextAction.value) {
    state.error = '当前活动生命周期已完成'
    return
  }
  if (!state.selectedCampaign?.id && campaignNextAction.value !== 'prePush') {
    state.error = '请先选择或创建活动'
    return
  }
  state.loading = true
  state.error = ''
  state.notice = ''
  try {
    if (campaignNextAction.value === 'prePush') {
      const campaign = await saveCampaignDraftForAdvance()
      if (!campaign) return
      const reason = campaignPrePushBlockReason()
      if (reason) {
        state.error = reason
        return
      }
    }
    const campaign = await request(`/api/campaigns/${state.selectedCampaign.id}/advance`, {
      method: 'POST',
      body: JSON.stringify({ expectedStatus: campaignCurrentStatus.value })
    })
    fillCampaignForm(campaign)
    await loadCampaigns()
    state.notice = `已确认并进入下一步：${campaignCurrentStatusLabel.value}`
  } catch (error) {
    state.error = `活动状态推进失败：${error.message}`
  } finally {
    state.loading = false
  }
}

async function rollbackCampaignStep(step) {
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
    })
    fillCampaignForm(campaign)
    await loadCampaigns()
    state.notice = `已回退到上一步：${campaignCurrentStatusLabel.value}`
  } catch (error) {
    state.error = `活动状态回退失败：${error.message}`
  } finally {
    state.loading = false
  }
}

async function loadMappingPreview() {
  try {
    const result = await request('/api/customer-mapping/osm/preview')
    state.mappingPreview = result
  } catch (error) {
    state.mappingPreview = null
    state.error = `Mapping 预览加载失败：${error.message}`
  }
}

async function createChannel() {
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
  } catch (error) {
    state.error = `通道保存失败：${error.message}`
  } finally {
    state.loading = false
  }
}

async function importOsm() {
  if (!state.importFile) {
    state.error = '请选择 OSM JSON 或 GeoJSON 文件'
    return
  }
  state.loading = true
  state.error = ''
  state.notice = ''
  try {
    const form = new FormData()
    form.append('file', state.importFile)
    state.importResult = await request('/api/imports/osm-json', {
      method: 'POST',
      body: form
    })
    await loadMappingPreview()
    state.activeNav = 'customers'
    state.customerTool = 'mapping'
    state.notice = 'OSM 数据导入完成，请预览后确认写入客户资产主表'
  } catch (error) {
    state.error = `导入失败：${error.message}`
  } finally {
    state.loading = false
  }
}

async function runOsmMapping() {
  state.loading = true
  state.error = ''
  state.notice = ''
  try {
    state.mappingResult = await request('/api/customer-mapping/osm', {
      method: 'POST',
      body: JSON.stringify({})
    })
    await Promise.allSettled([loadCustomers(), loadCustomerSummary(), loadMappingPreview()])
    state.notice = 'OSM 来源已 mapping 到客户资产主表'
  } catch (error) {
    state.error = `Mapping 失败：${error.message}`
  } finally {
    state.loading = false
  }
}

function onFileChange(event) {
  state.importFile = event.target.files?.[0] || null
}

if (state.token) {
  refreshAll()
}

const App = {
  components: {
    BarChart3,
    Building2,
    ChevronDown,
    CheckCircle2,
    Code2,
    Database,
    Eye,
    ExternalLink,
    FileUp,
    GitMerge,
    Globe2,
    KeyRound,
    Layers,
      LogOut,
      Mail,
      MapPin,
      PanelLeftClose,
      PanelLeftOpen,
      Pencil,
    PlugZap,
    Plus,
    RefreshCw,
    Search,
    Send,
    Settings,
    ShieldCheck,
    Trash2,
    Users,
    X
  },
  setup() {
    return {
      state,
      pageSizeOptions: PAGE_SIZE_OPTIONS,
      emptyTemplatePreviewHtml: EMPTY_TEMPLATE_PREVIEW_HTML,
      requiredTrackingLinkMessage: REQUIRED_TRACKING_LINK_MESSAGE,
      stats,
      customerCountryStats,
      isLoggedIn,
      filteredCustomers,
      pageMeta,
      availableNavItems,
      availablePrimaryNavItems,
      navChildItems,
      isNavItemActive,
      toggleSidebar,
      primaryRole,
      primaryRoleLabel,
      campaignCurrentStatusLabel,
      campaignNextAction,
      campaignNextActionLabel,
      templateMissingTrackingLinkParam,
      editableTemplateVariableRows,
      campaignLifecycleView,
      campaignActionLabel,
      isCampaignActionDisabled,
      isCampaignStepDisabled,
      isCampaignAdvanceDisabled,
      campaignActionTitle,
      campaignStepTitle,
      campaignAdvanceTitle,
      canAccessNav,
      percentValue,
      formatCountryShare,
      login,
      logout,
      setActiveNav,
      createChannel,
      saveSegment,
      refreshSegment,
      fillSegmentForm,
      resetSegmentForm,
      changeSegmentPage,
      changeSegmentPageSize,
      loadSegmentMembers,
      loadCampaigns,
      createCampaign,
      saveCampaignSetup,
      saveCampaignTrackingLink,
      previewCampaignTemplate,
      fillCampaignForm,
      openCampaignDetail,
      openCampaignList,
      startNewCampaign,
      addTemplateVariable,
      removeTemplateVariable,
      insertTemplateVariable,
      syncCampaignTemplateVariables,
      campaignTrackingLinkPayload,
      openTrackingLinkDialog,
      closeTrackingLinkDialog,
      filteredCampaignSegments,
      selectedCampaignSegments,
      isCampaignSegmentSelected,
      toggleCampaignSegment,
      removeCampaignSegment,
      changeCampaignPage,
      changeCampaignPageSize,
      runCampaignAction,
      advanceCampaignStep,
      rollbackCampaignStep,
      loadTrackingAnalytics,
      changeTrackingEventPage,
      changeTrackingLinkPage,
      copyShortLink,
      importOsm,
      loadMappingPreview,
      runOsmMapping,
      openStatTarget,
      setCustomerTool,
      changeCustomerPage,
      changeCustomerPageSize,
      changeChannelPage,
      changeChannelPageSize,
      EMAIL_QUALITY_OPTIONS,
      updateEmailQuality,
      normalizedWebsiteUrl,
      formatWebsiteLabel,
      displayValue,
      localizedName,
      formatLanguages,
      destinationLabel,
      profileAsset,
      openCustomerDetail,
      openCustomerEdit,
      closeCustomerDetail,
      saveCustomerEdit,
      onFileChange,
      RULE_FIELDS,
      RULE_OPS,
      ruleOpIsMulti,
      ruleOpHasValue,
      addRule,
      removeRule,
      buildRules
    }
  },
  template: `
    <main v-if="!isLoggedIn" class="auth-shell">
      <section class="auth-panel">
        <div class="brand-lockup">
          <div class="brand-mark"><Mail :size="22" /></div>
          <div>
            <h1>有解获客</h1>
            <p>邮箱获客系统后台</p>
          </div>
        </div>
        <div class="auth-tabs" role="tablist">
          <button :class="{active: state.authMode === 'login'}" @click="state.authMode = 'login'">登录</button>
          <button :class="{active: state.authMode === 'register'}" @click="state.authMode = 'register'">注册租户</button>
        </div>
        <form class="auth-form" @submit.prevent="login">
          <label v-if="state.authMode === 'register'">
            租户名称
            <input v-model="state.authForm.tenantName" autocomplete="organization" />
          </label>
          <label v-if="state.authMode === 'register'">
            用户名称
            <input v-model="state.authForm.displayName" autocomplete="name" />
          </label>
          <label>
            登录邮箱
            <input v-model="state.authForm.email" type="email" autocomplete="email" />
          </label>
          <label>
            密码
            <input v-model="state.authForm.password" type="password" autocomplete="current-password" />
          </label>
          <button class="primary-action" :disabled="state.loading">
            <KeyRound :size="17" />
            {{ state.authMode === 'register' ? '注册并登录' : '登录后台' }}
          </button>
        </form>
        <p v-if="state.error" class="message error">{{ state.error }}</p>
      </section>
    </main>

    <main v-else class="app-shell" :class="{'sidebar-collapsed': state.sidebarCollapsed}">
      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="brand-lockup compact">
            <div class="brand-mark"><Mail :size="20" /></div>
            <div>
              <h1>有解获客</h1>
              <p>yj-lead-admin</p>
            </div>
          </div>
          <button
            class="sidebar-toggle"
            type="button"
            :aria-label="state.sidebarCollapsed ? '展开菜单栏' : '收起菜单栏'"
            :title="state.sidebarCollapsed ? '展开菜单栏' : '收起菜单栏'"
            @click="toggleSidebar"
          >
            <PanelLeftOpen v-if="state.sidebarCollapsed" :size="18" />
            <PanelLeftClose v-else :size="18" />
          </button>
        </div>
        <nav>
          <div v-for="item in availablePrimaryNavItems" :key="item.key" class="nav-group">
            <button
              :class="{active: state.activeNav === item.key, 'child-active': isNavItemActive(item) && state.activeNav !== item.key}"
              :title="state.sidebarCollapsed ? item.label : ''"
              @click="setActiveNav(item.key)"
            >
              <component :is="item.icon" :size="18" />{{ item.label }}
            </button>
            <div v-if="navChildItems(item.key).length" class="sub-nav">
              <button
                v-for="child in navChildItems(item.key)"
                :key="child.key"
                class="sub-nav-button"
                :class="{active: state.activeNav === child.key}"
                :title="state.sidebarCollapsed ? child.label : ''"
                @click="setActiveNav(child.key)"
              >
                <component :is="child.icon" :size="16" />{{ child.label }}
              </button>
            </div>
          </div>
        </nav>
      </aside>

      <section class="workspace">
        <header class="topbar">
          <div>
            <h2>{{ pageMeta.title }}</h2>
            <p>{{ pageMeta.description }}</p>
          </div>
          <div class="tenant-chip">
            <ShieldCheck :size="17" />
            <span>{{ primaryRoleLabel }}</span>
            <strong>{{ state.user?.email }}</strong>
            <button class="icon-button" @click="logout" title="退出登录"><LogOut :size="17" /></button>
          </div>
        </header>

        <p v-if="state.notice" class="message success">{{ state.notice }}</p>
        <p v-if="state.error" class="message error">{{ state.error }}</p>

        <section v-if="state.activeNav === 'dashboard'" class="stats-grid">
          <button
            v-for="item in stats"
            :key="item.label"
            class="stat-card"
            type="button"
            :disabled="!canAccessNav(item.target)"
            @click="openStatTarget(item)"
          >
            <component :is="item.icon" :size="20" />
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </button>
        </section>

        <section v-if="state.activeNav === 'dashboard'" class="ops-panel dashboard-country-panel">
          <div class="panel-title">
            <Globe2 :size="19" />
            <h3>客户资产国家分布</h3>
          </div>
          <div v-if="customerCountryStats.length" class="country-stat-list">
            <button
              v-for="item in customerCountryStats"
              :key="item.country"
              class="country-stat-row"
              type="button"
              @click="setActiveNav('customers')"
            >
              <span class="country-stat-name">{{ item.country || '未填写' }}</span>
              <span class="country-stat-bar">
                <i :style="{ width: formatCountryShare(item.customers) }"></i>
              </span>
              <strong>{{ item.customers }}</strong>
              <small>{{ formatCountryShare(item.customers) }}</small>
            </button>
          </div>
          <div v-else class="empty-state compact-empty">暂无客户资产国家数据</div>
        </section>

        <section v-if="canAccessNav('customers') && state.activeNav === 'customers'" class="customer-tools">
          <button type="button" :class="{active: state.customerTool === 'list'}" @click="setCustomerTool('list')">
            <Database :size="17" />
            客户资产库
          </button>
          <button v-if="canAccessNav('imports')" type="button" :class="{active: state.customerTool === 'imports'}" @click="setCustomerTool('imports')">
            <FileUp :size="17" />
            OSM 导入
          </button>
          <button v-if="canAccessNav('mapping')" type="button" :class="{active: state.customerTool === 'mapping'}" @click="setCustomerTool('mapping')">
            <GitMerge :size="17" />
            资产 Mapping
          </button>
          <button type="button" class="help-link" @click="state.customerHelpVisible = !state.customerHelpVisible">
            用户提示
          </button>
        </section>

        <section v-if="canAccessNav('customers') && state.activeNav === 'customers' && state.customerHelpVisible" class="customer-help">
          <div>
            <strong>维护顺序</strong>
            <span>先用 OSM 导入把公开来源保存为来源数据，再通过资产 Mapping 预览、去重并确认写入客户资产库。</span>
          </div>
          <div>
            <strong>入库保护</strong>
            <span>新导入数据不会直接成为正式客户资产，避免重复、错误或低质量数据进入主表。</span>
          </div>
        </section>

        <section v-if="canAccessNav('mapping') && state.activeNav === 'customers' && state.customerTool === 'mapping'" class="mapping-page">
          <article class="table-panel">
            <div class="panel-header">
              <div>
                <h3>OSM 来源 Mapping 预览</h3>
                <p>只处理当前租户未绑定客户资产的 OSM 来源记录；确认后写入客户资产主表</p>
              </div>
              <div class="panel-actions">
                <button class="secondary-action compact" :disabled="state.loading" @click="loadMappingPreview">刷新预览</button>
                <button class="primary-action compact" :disabled="state.loading || !state.mappingPreview?.unmappedCount" @click="runOsmMapping">
                  确认写入主表
                </button>
              </div>
            </div>
            <div class="mapping-summary">
              <div><span>待处理来源</span><strong>{{ state.mappingPreview?.unmappedCount || 0 }}</strong></div>
              <div><span>预计新增</span><strong>{{ state.mappingPreview?.newCount || 0 }}</strong></div>
              <div><span>预计更新</span><strong>{{ state.mappingPreview?.updateCount || 0 }}</strong></div>
              <div><span>预计跳过</span><strong>{{ state.mappingPreview?.skippedCount || 0 }}</strong></div>
            </div>
            <div v-if="!state.mappingPreview?.items?.length" class="empty-state">
              <GitMerge :size="24" />
              <strong>暂无待 Mapping 的 OSM 来源</strong>
              <span>先导入 OSM JSON/GeoJSON，或刷新预览确认当前来源状态</span>
            </div>
            <div v-else class="data-table">
              <table>
                <thead>
                  <tr>
                    <th>来源对象</th>
                    <th>名称</th>
                    <th>邮箱</th>
                    <th>地区</th>
                    <th>动作</th>
                    <th>原因</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in state.mappingPreview.items" :key="item.sourceId">
                    <td>
                      <strong>{{ item.sourceObjectId }}</strong>
                      <span>{{ item.sourceId }}</span>
                    </td>
                    <td>{{ item.name || '未命名客户' }}</td>
                    <td>{{ item.email || '待补充' }}</td>
                    <td>{{ item.country || '-' }} / {{ item.city || '-' }}</td>
                    <td><span class="status">{{ item.action }}</span></td>
                    <td>{{ item.reason }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>

          <aside class="ops-stack">
            <article class="ops-panel">
              <div class="panel-title">
                <GitMerge :size="19" />
                <h3>执行结果</h3>
              </div>
              <dl class="result-list expanded" v-if="state.mappingResult">
                <div><dt>处理来源</dt><dd>{{ state.mappingResult.totalCount }}</dd></div>
                <div><dt>新增客户</dt><dd>{{ state.mappingResult.createdCount }}</dd></div>
                <div><dt>更新客户</dt><dd>{{ state.mappingResult.updatedCount }}</dd></div>
                <div><dt>跳过</dt><dd>{{ state.mappingResult.skippedCount }}</dd></div>
              </dl>
              <div v-else class="mapping-note">
                <strong>默认策略</strong>
                <span>来源对象或标准化邮箱命中已有客户时补全空字段；未命中时新建客户资产。</span>
              </div>
            </article>
          </aside>
        </section>

        <section
          v-if="canAccessNav('customers') && (state.activeNav === 'dashboard' || (state.activeNav === 'customers' && state.customerTool === 'list'))"
          :class="['main-grid', state.selectedCustomer ? 'with-detail' : 'single-column']"
        >
          <article class="table-panel">
            <div class="panel-header">
              <div>
                <h3>客户资产库</h3>
                <p>当前列表展示主表；OSM 导入先写来源表，再通过资产 Mapping 写入主表</p>
              </div>
              <label class="search-box">
                <Search :size="16" />
                <input v-model="state.filter" placeholder="搜索名称、邮箱、国家" />
              </label>
            </div>
            <div class="data-table">
              <table>
                <thead>
                  <tr>
                    <th>旅行社</th>
                    <th>邮箱</th>
                    <th>地区</th>
                    <th>状态</th>
                    <th>来源</th>
                    <th>坐标</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="customer in filteredCustomers"
                    :key="customer.id"
                    :class="{selected: state.selectedCustomer?.id === customer.id}"
                  >
                    <td>
                      <strong>{{ customer.name || '未命名客户' }}</strong>
                      <a
                        v-if="customer.website"
                        class="customer-website"
                        :href="normalizedWebsiteUrl(customer.website)"
                        target="_blank"
                        rel="noopener noreferrer"
                        :title="customer.website"
                      >
                        {{ formatWebsiteLabel(customer.website) }}
                      </a>
                      <span v-else>{{ customer.phone || '-' }}</span>
                    </td>
                    <td>{{ customer.email || '待补充' }}</td>
                    <td>{{ customer.country || '-' }} / {{ customer.city || '-' }}</td>
                    <td><span class="status">{{ customer.emailQuality || 'PENDING' }}</span></td>
                    <td>{{ customer.sourcePrimary || 'OSM' }}</td>
                    <td class="coord">
                      <MapPin :size="14" />
                      {{ customer.longitude || '-' }}, {{ customer.latitude || '-' }}
                    </td>
                    <td>
                      <button class="row-action" type="button" @click="openCustomerDetail(customer)">
                        <Eye :size="14" />
                        详情
                      </button>
                      <button class="row-action" type="button" @click="openCustomerEdit(customer)">
                        <Pencil :size="14" />
                        编辑
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="pagination-bar">
              <div class="pagination-meta">
                <span>
                  共 {{ state.customerPage.totalItems }} 条，当前第 {{ state.customerPage.totalPages ? state.customerPage.page + 1 : 0 }} / {{ state.customerPage.totalPages }} 页
                </span>
                <label class="page-size-control">
                  每页
                  <select v-model.number="state.customerPage.size" @change="changeCustomerPageSize(state.customerPage.size)">
                    <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
                  </select>
                  条
                </label>
              </div>
              <div class="pagination-actions">
                <button type="button" :disabled="!state.customerPage.hasPrevious" @click="changeCustomerPage(state.customerPage.page - 1)">上一页</button>
                <button type="button" :disabled="!state.customerPage.hasNext" @click="changeCustomerPage(state.customerPage.page + 1)">下一页</button>
              </div>
            </div>
          </article>

          <aside v-if="state.selectedCustomer" class="ops-stack">
            <article class="ops-panel customer-detail-panel">
              <div class="detail-header">
                <div>
                  <span>{{ state.customerEditMode ? '编辑客户' : '客户详情' }}</span>
                  <h3>{{ state.selectedCustomer.name || '未命名客户' }}</h3>
                </div>
                <div class="detail-header-actions">
                  <button
                    v-if="!state.customerEditMode"
                    class="row-action"
                    type="button"
                    @click="openCustomerEdit(state.selectedCustomer)"
                  >
                    <Pencil :size="13" />
                    编辑
                  </button>
                  <button class="icon-button" type="button" title="关闭" @click="closeCustomerDetail">
                    <X :size="16" />
                  </button>
                </div>
              </div>

              <!-- 查看模式 -->
              <template v-if="!state.customerEditMode">
                <div v-if="state.customerProfileLoading" class="inline-loading">正在加载客户全局画像...</div>
                <div class="detail-summary">
                  <span class="status neutral">{{ profileAsset().contactStatus || 'NOT_CONTACTED' }}</span>
                  <label class="detail-quality-label">
                    邮箱状态
                    <select
                      class="email-quality-select"
                      :value="profileAsset().emailQuality || 'PENDING'"
                      :disabled="state.loading"
                      @change="updateEmailQuality(profileAsset(), $event.target.value)"
                    >
                      <option v-for="q in EMAIL_QUALITY_OPTIONS" :key="q" :value="q">{{ q }}</option>
                    </select>
                  </label>
                </div>
                <dl class="detail-list">
                  <div><dt>名称</dt><dd>{{ displayValue(profileAsset().name) }}</dd></div>
                  <div><dt>邮箱</dt><dd>{{ displayValue(profileAsset().email) }}</dd></div>
                  <div><dt>电话</dt><dd>{{ displayValue(profileAsset().phone) }}</dd></div>
                  <div>
                    <dt>官网</dt>
                    <dd>
                      <a v-if="profileAsset().website" :href="normalizedWebsiteUrl(profileAsset().website)" target="_blank" rel="noopener noreferrer">
                        {{ formatWebsiteLabel(profileAsset().website) }}
                        <ExternalLink :size="13" />
                      </a>
                      <span v-else>-</span>
                    </dd>
                  </div>
                  <div><dt>业务范围</dt><dd>{{ displayValue(state.customerProfile?.businessScope || profileAsset().businessScope) }}</dd></div>
                  <div><dt>国家 / 城市</dt><dd>{{ displayValue(profileAsset().country) }} / {{ displayValue(profileAsset().city) }}</dd></div>
                  <div>
                    <dt>街道地址</dt>
                    <dd>{{ [profileAsset().street, profileAsset().houseNumber, profileAsset().postcode].filter(Boolean).join(' ') || '-' }}</dd>
                  </div>
                  <div><dt>客户类型</dt><dd>{{ displayValue(profileAsset().assetType) }}</dd></div>
                  <div><dt>来源</dt><dd>{{ displayValue(profileAsset().sourcePrimary) }}</dd></div>
                  <div><dt>来源对象 ID</dt><dd>{{ displayValue(profileAsset().sourceObjectId) }}</dd></div>
                  <div><dt>坐标</dt><dd>{{ displayValue(profileAsset().longitude) }}, {{ displayValue(profileAsset().latitude) }}</dd></div>
                  <div><dt>创建时间</dt><dd>{{ displayValue(profileAsset().createdAt) }}</dd></div>
                </dl>
                <dl class="detail-list detail-section">
                  <div><dt>旅行方向</dt><dd>{{ displayValue(state.customerProfile?.travelProfile?.travelDirection) }}</dd></div>
                  <div><dt>主国家 Basic</dt><dd>{{ state.customerProfile?.travelProfile?.primaryCountry ? state.customerProfile.travelProfile.primaryCountry.id + ' / ' + localizedName(state.customerProfile.travelProfile.primaryCountry.name) : '-' }}</dd></div>
                  <div><dt>主区域 Basic</dt><dd>{{ state.customerProfile?.travelProfile?.primaryWorldRegion ? localizedName(state.customerProfile.travelProfile.primaryWorldRegion.name) + ' / ' + state.customerProfile.travelProfile.primaryWorldRegion.fullPath : '-' }}</dd></div>
                  <div><dt>语言</dt><dd>{{ formatLanguages(state.customerProfile?.languages) }}</dd></div>
                </dl>
                <dl class="detail-list detail-section">
                  <div>
                    <dt>旅行目的地</dt>
                    <dd>
                      <span v-if="!state.customerProfile?.destinations?.length">-</span>
                      <span v-else v-for="destination in state.customerProfile.destinations" :key="destination.destinationType + destinationLabel(destination)" class="inline-token">
                        {{ destination.primary ? '主' : '辅' }} · {{ destination.destinationType }} · {{ destinationLabel(destination) }}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt>来源证据</dt>
                    <dd>
                      <span v-if="!state.customerProfile?.sources?.length">-</span>
                      <span v-else v-for="source in state.customerProfile.sources" :key="source.id" class="inline-token">
                        {{ source.sourceType }} · {{ source.sourceObjectId || source.name || source.sourceUrl }}
                      </span>
                    </dd>
                  </div>
                </dl>
              </template>

              <!-- 编辑模式 -->
              <template v-else>
                <form class="ops-form customer-edit-form" @submit.prevent="saveCustomerEdit">
                  <label>名称 <input v-model="state.customerEditForm.name" required /></label>
                  <label>邮箱 <input v-model="state.customerEditForm.email" type="email" /></label>
                  <label>电话 <input v-model="state.customerEditForm.phone" /></label>
                  <label>官网 <input v-model="state.customerEditForm.website" /></label>
                  <label>国家 <input v-model="state.customerEditForm.country" placeholder="DE" /></label>
                  <label>城市 <input v-model="state.customerEditForm.city" /></label>
                  <label>业务范围 <textarea v-model="state.customerEditForm.businessScope" rows="3"></textarea></label>
                  <label>邮编 <input v-model="state.customerEditForm.postcode" /></label>
                  <label>街道 <input v-model="state.customerEditForm.street" /></label>
                  <label>门牌号 <input v-model="state.customerEditForm.houseNumber" /></label>
                  <label>
                    邮箱状态
                    <select v-model="state.customerEditForm.emailQuality">
                      <option v-for="q in EMAIL_QUALITY_OPTIONS" :key="q" :value="q">{{ q }}</option>
                    </select>
                  </label>
                  <label>
                    客户状态
                    <select v-model="state.customerEditForm.contactStatus">
                      <option value="NOT_CONTACTED">NOT_CONTACTED</option>
                      <option value="READY_TO_VERIFY">READY_TO_VERIFY</option>
                      <option value="VERIFIED">VERIFIED</option>
                      <option value="UNSUBSCRIBED">UNSUBSCRIBED</option>
                      <option value="BOUNCED">BOUNCED</option>
                      <option value="INVALID">INVALID</option>
                    </select>
                  </label>
                  <div class="edit-form-actions">
                    <button class="primary-action" type="submit" :disabled="state.loading">保存</button>
                    <button class="secondary-action" type="button" @click="openCustomerDetail(state.selectedCustomer)">取消</button>
                  </div>
                </form>
              </template>
            </article>
          </aside>
        </section>

        <section v-if="canAccessNav('channels') && state.activeNav === 'channels'" class="channel-page">
          <article class="table-panel">
            <div class="panel-header">
              <div>
                <h3>已配置通道</h3>
                <p>这里只展示当前租户可用的推送通道；点击左侧菜单或仪表盘统计卡进入本页配置</p>
              </div>
            </div>
            <div class="channel-table">
              <div v-if="!state.channels.length" class="empty-state">
                <PlugZap :size="24" />
                <strong>暂无推送通道</strong>
                <span>保存右侧 AWS SES 配置后会显示在这里</span>
              </div>
              <ul v-else class="channel-list expanded">
                <li v-for="channel in state.channels" :key="channel.id">
                  <div>
                    <span>{{ channel.name }}</span>
                    <small v-if="channel.channelType === 'EMAIL_SMTP'">
                      SMTP / {{ channel.smtpHost }}:{{ channel.smtpPort }} / {{ channel.smtpEncryption }}
                    </small>
                    <small v-else>
                      AWS SES / {{ channel.awsRegion }} / Identity: {{ channel.sesIdentityStatus || 'NOT_CHECKED' }}
                    </small>
                    <small>{{ channel.fromEmail }} / {{ channel.replyTo || '无回复邮箱' }}</small>
                  </div>
                  <strong>{{ channel.status }}</strong>
                </li>
              </ul>
            </div>
            <div class="pagination-bar">
              <div class="pagination-meta">
                <span>
                  共 {{ state.channelPage.totalItems }} 条，当前第 {{ state.channelPage.totalPages ? state.channelPage.page + 1 : 0 }} / {{ state.channelPage.totalPages }} 页
                </span>
                <label class="page-size-control">
                  每页
                  <select v-model.number="state.channelPage.size" @change="changeChannelPageSize(state.channelPage.size)">
                    <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
                  </select>
                  条
                </label>
              </div>
              <div class="pagination-actions">
                <button type="button" :disabled="!state.channelPage.hasPrevious" @click="changeChannelPage(state.channelPage.page - 1)">上一页</button>
                <button type="button" :disabled="!state.channelPage.hasNext" @click="changeChannelPage(state.channelPage.page + 1)">下一页</button>
              </div>
            </div>
          </article>

          <aside class="ops-stack">
            <article class="ops-panel">
              <div class="panel-title">
                <PlugZap :size="19" />
                <h3>邮件发送通道</h3>
              </div>
              <div class="channel-tabs" role="tablist" aria-label="邮件发送通道类型">
                <button type="button" :class="{active: state.channelType === 'smtp'}" @click="state.channelType = 'smtp'">
                  SMTP 通道
                </button>
                <button type="button" :class="{active: state.channelType === 'aws-ses'}" @click="state.channelType = 'aws-ses'">
                  AWS SES 通道
                </button>
              </div>
              <form class="ops-form" @submit.prevent="createChannel">
                <template v-if="state.channelType === 'smtp'">
                  <label>通道名称<input v-model="state.smtpForm.name" /></label>
                  <label>SMTP Host<input v-model="state.smtpForm.smtpHost" /></label>
                  <label>SMTP Port<input v-model.number="state.smtpForm.smtpPort" type="number" min="1" max="65535" /></label>
                  <label>
                    加密方式
                    <select v-model="state.smtpForm.smtpEncryption">
                      <option>None</option>
                      <option>STARTTLS</option>
                      <option>SSL</option>
                    </select>
                  </label>
                  <label>Username<input v-model="state.smtpForm.smtpUsername" autocomplete="off" /></label>
                  <label>Password<input v-model="state.smtpForm.smtpPassword" type="password" autocomplete="new-password" /></label>
                  <label>发件邮箱<input v-model="state.smtpForm.fromEmail" type="email" /></label>
                  <label>发件名称<input v-model="state.smtpForm.fromName" /></label>
                  <label>回复邮箱<input v-model="state.smtpForm.replyTo" type="email" /></label>
                </template>
                <template v-else>
                  <label>通道名称<input v-model="state.awsSesForm.name" /></label>
                  <label>Region<input v-model="state.awsSesForm.awsRegion" /></label>
                  <label>Access Key<input v-model="state.awsSesForm.awsAccessKeyId" autocomplete="off" /></label>
                  <label>Secret Key<input v-model="state.awsSesForm.awsSecretAccessKey" type="password" autocomplete="new-password" /></label>
                  <label>发件邮箱<input v-model="state.awsSesForm.fromEmail" type="email" /></label>
                  <label>发件名称<input v-model="state.awsSesForm.fromName" /></label>
                  <label>回复邮箱<input v-model="state.awsSesForm.replyTo" type="email" /></label>
                  <div class="readonly-field">
                    <span>SES Identity 状态</span>
                    <strong>NOT_CHECKED</strong>
                  </div>
                </template>
                <button class="primary-action" :disabled="state.loading">保存通道</button>
              </form>
            </article>
          </aside>
        </section>

        <section v-if="canAccessNav('imports') && state.activeNav === 'customers' && state.customerTool === 'imports'" class="utility-page">
            <article class="ops-panel">
              <div class="panel-title">
                <FileUp :size="19" />
                <h3>OSM JSON/GeoJSON 导入</h3>
              </div>
              <div class="upload-box">
                <Globe2 :size="24" />
                <input type="file" accept=".json,.geojson,application/json" @change="onFileChange" />
                <span>{{ state.importFile?.name || '选择 OSM JSON 或 GeoJSON 文件' }}</span>
              </div>
              <button class="secondary-action" :disabled="state.loading" @click="importOsm">开始导入</button>
              <dl v-if="state.importResult" class="result-list">
                <div><dt>成功</dt><dd>{{ state.importResult.successCount }}</dd></div>
                <div><dt>重复</dt><dd>{{ state.importResult.duplicateCount }}</dd></div>
                <div><dt>失败</dt><dd>{{ state.importResult.failedCount }}</dd></div>
              </dl>
            </article>
        </section>

        <section v-if="canAccessNav('segments') && state.activeNav === 'segments'" class="main-grid with-detail">
          <article class="table-panel">
            <div class="panel-header">
              <div>
                <h3>客户群</h3>
                <p>客群规则由后端规则引擎执行，刷新后写入客户群成员关系表</p>
              </div>
              <button class="secondary-action compact" type="button" @click="resetSegmentForm">新建客群</button>
            </div>
            <div class="data-table">
              <table>
                <thead>
                  <tr>
                    <th>客群</th>
                    <th>ID</th>
                    <th>规则</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="segment in state.segments" :key="segment.id" :class="{selected: state.selectedSegment?.id === segment.id}">
                    <td><strong>{{ segment.name }}</strong><span>{{ segment.description || '-' }}</span></td>
                    <td>{{ segment.id }}</td>
                    <td>
                      <span v-if="segment.rules?.conditions?.length">{{ segment.rules.conditions.length }} 条条件 (AND)</span>
                      <span v-else class="muted">无规则</span>
                    </td>
                    <td><span class="status">{{ segment.status }}</span></td>
                    <td>
                      <button class="row-action" type="button" @click="fillSegmentForm(segment)">维护</button>
                      <button class="row-action" type="button" @click="refreshSegment(segment.id)">
                        <RefreshCw :size="14" />
                        刷新成员
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="pagination-bar">
              <div class="pagination-meta">
                <span>共 {{ state.segmentPage.totalItems }} 条，当前第 {{ state.segmentPage.totalPages ? state.segmentPage.page + 1 : 0 }} / {{ state.segmentPage.totalPages }} 页</span>
                <label class="page-size-control">
                  每页
                  <select v-model.number="state.segmentPage.size" @change="changeSegmentPageSize(state.segmentPage.size)">
                    <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
                  </select>
                  条
                </label>
              </div>
              <div class="pagination-actions">
                <button type="button" :disabled="!state.segmentPage.hasPrevious" @click="changeSegmentPage(state.segmentPage.page - 1)">上一页</button>
                <button type="button" :disabled="!state.segmentPage.hasNext" @click="changeSegmentPage(state.segmentPage.page + 1)">下一页</button>
              </div>
            </div>

            <div class="panel-header secondary-header">
              <div>
                <h3>客群成员</h3>
                <p>展示最近一次规则刷新后写入关系表的客户</p>
              </div>
            </div>
            <div class="data-table compact-table">
              <table>
                <thead>
                  <tr>
                    <th>成员 ID</th>
                    <th>客户</th>
                    <th>邮箱</th>
                    <th>地区</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="member in state.segmentMembers" :key="member.memberId">
                    <td>{{ member.memberId }}</td>
                    <td>{{ member.customerName || member.customerId }}</td>
                    <td>{{ member.email || '-' }}</td>
                    <td>{{ member.country || '-' }} / {{ member.city || '-' }}</td>
                    <td><span class="status">{{ member.contactStatus }}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>

          <aside class="ops-stack">
            <article class="ops-panel">
              <div class="panel-title">
                <Users :size="19" />
                <h3>{{ state.segmentForm.id ? '维护客群' : '新建客群' }}</h3>
              </div>
              <form class="ops-form" @submit.prevent="saveSegment">
                <label>客群名称<input v-model="state.segmentForm.name" /></label>
                <label>说明<input v-model="state.segmentForm.description" /></label>
                <div class="rule-editor">
                  <div class="rule-editor-header">
                    <span>动态规则 <em class="rule-logic-badge">AND</em></span>
                    <button type="button" class="rule-add-btn" @click="addRule">+ 添加条件</button>
                  </div>
                  <div v-if="state.segmentForm.rules.length === 0" class="rule-empty">暂无动态条件</div>
                  <div v-for="(rule, idx) in state.segmentForm.rules" :key="idx" class="rule-row">
                    <select v-model="rule.field" class="rule-select rule-field">
                      <option v-for="f in RULE_FIELDS" :key="f.value" :value="f.value">{{ f.label }}</option>
                    </select>
                    <select v-model="rule.op" class="rule-select rule-op">
                      <option v-for="o in RULE_OPS" :key="o.value" :value="o.value">{{ o.label }}</option>
                    </select>
                    <input
                      v-if="ruleOpHasValue(rule.op)"
                      v-model="rule._valueText"
                      class="rule-value"
                      :placeholder="ruleOpIsMulti(rule.op) ? 'DE,FR,GB' : '值'"
                    />
                    <button type="button" class="rule-remove-btn" @click="removeRule(idx)" title="删除条件">✕</button>
                  </div>
                  <div v-if="state.segmentForm.rules.length > 0" class="rule-json-preview">
                    <span>预览 JSON：</span>
                    <code>{{ JSON.stringify(buildRules(state.segmentForm.rules), null, 0) }}</code>
                  </div>
                </div>

                <button class="primary-action" :disabled="state.loading">保存客群</button>
                <button class="secondary-action" type="button" :disabled="state.loading || !state.segmentForm.id" @click="refreshSegment()">
                  刷新成员关系
                </button>
              </form>
              <dl v-if="state.segmentRefreshResult" class="result-list">
                <div><dt>命中客户</dt><dd>{{ state.segmentRefreshResult.matchedCount }}</dd></div>
                <div><dt>排除客户</dt><dd>{{ state.segmentRefreshResult.excludedCount }}</dd></div>
              </dl>
            </article>
          </aside>
        </section>

        <section v-if="canAccessNav('campaign-list') && state.activeNav === 'campaign-list'" class="campaign-list-page">
          <article class="table-panel">
            <div class="panel-header">
              <div>
                <h3>邮件活动列表</h3>
                <p>从列表进入某个活动的详情编辑页面；详情页负责模板、短链、客群和生命周期维护</p>
              </div>
              <div class="panel-actions">
                <button class="secondary-action compact" type="button" :disabled="state.loading" @click="loadCampaigns(0)">
                  <RefreshCw :size="16" />
                  刷新
                </button>
                <button class="primary-action compact" type="button" @click="startNewCampaign">
                  <Plus :size="16" />
                  新建活动
                </button>
              </div>
            </div>
            <div v-if="!state.campaigns.length" class="empty-state">
              <Layers :size="24" />
              <strong>暂无邮件活动</strong>
              <span>点击“新建活动”进入详情编辑页后创建第一条活动</span>
            </div>
            <div v-else class="data-table">
              <table>
                <thead>
                  <tr>
                    <th>活动</th>
                    <th>状态</th>
                    <th>推送通道</th>
                    <th>客群</th>
                    <th>待审</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="campaign in state.campaigns" :key="campaign.id" :class="{selected: state.selectedCampaign?.id === campaign.id}">
                    <td>
                      <strong>{{ campaign.name }}</strong>
                      <span>{{ campaign.id }} / {{ campaign.objective || '暂无目标说明' }}</span>
                    </td>
                    <td><span class="status">{{ campaign.status }}</span></td>
                    <td>{{ campaign.channelId || '未绑定' }}</td>
                    <td>{{ campaign.segmentIds?.length || 0 }} 个</td>
                    <td>{{ campaign.prePushRecords?.filter((item) => item.status === 'PENDING_REVIEW').length || 0 }}</td>
                    <td>
                      <button class="row-action" type="button" @click="openCampaignDetail(campaign)">
                        <Pencil :size="14" />
                        进入详情
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="pagination-bar">
              <div class="pagination-meta">
                <span>
                  共 {{ state.campaignPage.totalItems }} 条，当前第 {{ state.campaignPage.totalPages ? state.campaignPage.page + 1 : 0 }} / {{ state.campaignPage.totalPages }} 页
                </span>
                <label class="page-size-control">
                  每页
                  <select v-model.number="state.campaignPage.size" @change="changeCampaignPageSize(state.campaignPage.size)">
                    <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
                  </select>
                  条
                </label>
              </div>
              <div class="pagination-actions">
                <button type="button" :disabled="!state.campaignPage.hasPrevious" @click="changeCampaignPage(state.campaignPage.page - 1)">上一页</button>
                <button type="button" :disabled="!state.campaignPage.hasNext" @click="changeCampaignPage(state.campaignPage.page + 1)">下一页</button>
              </div>
            </div>
          </article>
        </section>

        <section v-if="canAccessNav('campaigns') && state.activeNav === 'campaigns'" class="campaign-workbench">
          <article class="ops-panel campaign-basics">
            <div class="panel-title">
              <Send :size="19" />
              <h3>活动与投放</h3>
              <button class="row-action" type="button" @click="openCampaignList">
                <Layers :size="14" />
                返回列表
              </button>
            </div>
            <form class="ops-form" @submit.prevent="saveCampaignSetup">
              <label>活动名称<input v-model="state.campaignForm.name" /></label>
              <label>目标说明<input v-model="state.campaignForm.objective" /></label>
              <label>邮件主题<input v-model="state.campaignForm.subject" @input="syncCampaignTemplateVariables" /></label>
              <label>发件名称<input v-model="state.campaignForm.fromName" /></label>
              <label>
                推送通道
                <select v-model="state.campaignForm.channelId">
                  <option value="">请选择通道</option>
                  <option v-for="channel in state.channels" :key="channel.id" :value="channel.id">{{ channel.name }} / {{ channel.channelType }}</option>
                </select>
              </label>
              <div class="field-block">
                客群
                <div class="campaign-segment-dropdown">
                  <button class="dropdown-trigger" type="button" @click="state.segmentDropdownOpen = !state.segmentDropdownOpen">
                    <span>{{ state.campaignForm.segmentIds.length ? '已选择 ' + state.campaignForm.segmentIds.length + ' 个客群' : '请选择客群' }}</span>
                    <ChevronDown :size="16" />
                  </button>
                  <div v-if="state.campaignForm.segmentIds.length" class="selected-segment-tags">
                    <button v-for="segment in selectedCampaignSegments()" :key="segment.id" type="button" @click="removeCampaignSegment(segment.id)">
                      {{ segment.name }}
                      <X :size="13" />
                    </button>
                  </div>
                  <div v-if="state.segmentDropdownOpen" class="dropdown-panel">
                    <input v-model="state.segmentDropdownQuery" placeholder="搜索客群名称或 ID" />
                    <button
                      v-for="segment in filteredCampaignSegments()"
                      :key="segment.id"
                      class="dropdown-option"
                      :class="{selected: isCampaignSegmentSelected(segment.id)}"
                      type="button"
                      @click="toggleCampaignSegment(segment.id)"
                    >
                      <span>
                        <strong>{{ segment.name }}</strong>
                        <small>{{ segment.id }} / {{ segment.description || '暂无说明' }}</small>
                      </span>
                      <CheckCircle2 v-if="isCampaignSegmentSelected(segment.id)" :size="16" />
                    </button>
                    <div v-if="filteredCampaignSegments().length === 0" class="dropdown-empty">暂无匹配客群</div>
                  </div>
                </div>
              </div>
              <div class="stacked-actions">
                <button class="primary-action" :disabled="state.loading">
                  <CheckCircle2 :size="17" />
                  保存活动配置
                </button>
                <button class="secondary-action" type="button" :disabled="state.loading" @click="createCampaign">
                  <Plus :size="17" />
                  创建活动
                </button>
              </div>
            </form>
          </article>

          <article class="ops-panel template-editor-panel">
            <div class="panel-title">
              <Code2 :size="19" />
              <h3>HTML 模板编辑与预览</h3>
            </div>
            <div class="template-split">
              <section class="template-split-pane">
                <div class="split-pane-header">
                  <span>HTML</span>
                  <button class="row-action" type="button" :disabled="state.templatePreviewLoading" @click="previewCampaignTemplate">
                    <Eye :size="15" />
                    渲染预览
                  </button>
                </div>
                <textarea
                  id="campaign-html-editor"
                  v-model="state.campaignForm.htmlBody"
                  class="html-editor"
                  spellcheck="false"
                  @input="syncCampaignTemplateVariables"
                ></textarea>
              </section>
              <section class="template-split-pane">
                <div class="split-pane-header">
                  <span>邮件预览</span>
                  <strong>{{ state.templatePreviewSubject || '未渲染' }}</strong>
                </div>
                <div v-if="state.templatePreviewError" class="message error preview-error">{{ state.templatePreviewError }}</div>
                <iframe
                  v-else
                  class="template-preview-frame"
                  title="邮件 HTML 预览"
                  sandbox=""
                  :srcdoc="state.templatePreviewHtml || emptyTemplatePreviewHtml"
                ></iframe>
              </section>
            </div>
            <div class="campaign-lifecycle-flow" aria-label="邮件营销活动生命周期">
              <div class="lifecycle-summary">
                <span>当前状态</span>
                <strong>{{ campaignCurrentStatusLabel }}</strong>
              </div>
              <ol class="lifecycle-steps">
                <li
                  v-for="(step, index) in campaignLifecycleView"
                  :key="step.status"
                  :class="{active: step.active, done: step.done, rollback: step.rollback}"
                >
                  <button type="button" :disabled="isCampaignStepDisabled(step)" :title="campaignStepTitle(step)" @click="rollbackCampaignStep(step)">
                    <span class="step-index">{{ index + 1 }}</span>
                    <span class="step-copy">
                      <strong>{{ step.label }}</strong>
                      <small>{{ step.hint }}</small>
                    </span>
                  </button>
                </li>
              </ol>
            </div>
            <div class="lifecycle-actions">
              <button class="primary-action lifecycle-advance" type="button" :disabled="isCampaignAdvanceDisabled()" :title="campaignAdvanceTitle()" @click="advanceCampaignStep">
                <CheckCircle2 :size="17" />
                确认并进入下一步：{{ campaignNextActionLabel }}
              </button>
            </div>
            <div v-if="state.selectedCampaign?.prePushRecords?.length" class="data-table compact-table prepush-table">
              <table>
                <thead>
                  <tr>
                    <th>客户</th>
                    <th>邮箱</th>
                    <th>短链</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="record in state.selectedCampaign.prePushRecords" :key="record.customerId">
                    <td><strong>{{ record.customerName || record.customerId }}</strong><span>{{ record.segmentNames?.join(', ') }}</span></td>
                    <td>{{ record.email || '-' }}</td>
                    <td>
                      <button v-if="record.trackingShortUrl" class="link-button" type="button" @click="copyShortLink(record.trackingShortUrl)">复制短链</button>
                      <span>{{ record.trackingShortUrl || '-' }}</span>
                    </td>
                    <td><span class="status">{{ record.status }}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>

          <aside class="ops-panel template-preview-panel">
            <div class="panel-title">
              <Code2 :size="19" />
              <h3>短链与变量配置</h3>
            </div>
            <div class="tracking-link-dock">
              <div>
                <strong>短链接配置</strong>
                <span>{{ state.selectedCampaign?.trackingLink ? state.selectedCampaign.trackingLink.shortCode : '未配置' }}</span>
              </div>
              <button class="secondary-action compact" type="button" :disabled="!state.selectedCampaign?.id" @click="openTrackingLinkDialog">
                <ExternalLink :size="16" />
                {{ state.selectedCampaign?.trackingLink ? '编辑短链接配置' : '配置短链接' }}
              </button>
              <div v-if="templateMissingTrackingLinkParam" class="message error template-param-error">{{ requiredTrackingLinkMessage }}</div>
              <dl class="tracking-link-summary">
                <div><dt>目标长链接</dt><dd>{{ state.selectedCampaign?.trackingLink?.targetUrl || '未配置' }}</dd></div>
                <div><dt>短链接码</dt><dd>{{ state.selectedCampaign?.trackingLink?.shortCode || '未配置' }}</dd></div>
                <div><dt>UTM Campaign</dt><dd>{{ state.selectedCampaign?.trackingLink?.utmCampaign || '未配置' }}</dd></div>
              </dl>
            </div>
            <div class="variable-list">
              <div class="variable-row variable-head">
                <span>Key</span>
                <span>标签</span>
                <span>示例值</span>
                <span>必填</span>
              </div>
              <div v-for="item in editableTemplateVariableRows" :key="item.index" class="variable-row">
                <input v-model="item.variable.key" placeholder="customerName" />
                <input v-model="item.variable.label" placeholder="客户名称" />
                <input v-model="item.variable.sampleValue" placeholder="Reisen Scala" />
                <label class="checkbox-label"><input v-model="item.variable.required" type="checkbox" /> 必填</label>
                <button class="icon-action" type="button" title="插入变量" @click="insertTemplateVariable(item.variable)">
                  <Code2 :size="15" />
                </button>
                <button class="icon-action danger" type="button" title="删除变量" @click="removeTemplateVariable(item.index)">
                  <Trash2 :size="15" />
                </button>
              </div>
              <button class="secondary-action compact" type="button" @click="addTemplateVariable">
                <Plus :size="16" />
                添加变量
              </button>
            </div>
          </aside>
        </section>

        <div v-if="state.trackingLinkDialogOpen" class="modal-backdrop" @click.self="closeTrackingLinkDialog">
          <section class="modal-panel tracking-link-modal" role="dialog" aria-modal="true" aria-labelledby="tracking-link-title">
            <div class="modal-header">
              <div>
                <h3 id="tracking-link-title">短链接配置</h3>
                <p>为当前邮件活动单独维护跳转目标、短链接码和 UTM 参数</p>
              </div>
              <button class="icon-action" type="button" title="关闭" @click="closeTrackingLinkDialog">
                <X :size="16" />
              </button>
            </div>
            <form class="ops-form" @submit.prevent="saveCampaignTrackingLink">
              <label>目标长链接<input v-model="state.campaignForm.trackingTargetUrl" placeholder="https://www.example.com/travel-agency-partnership" /></label>
              <label>短链接码<input v-model="state.campaignForm.trackingShortCode" placeholder="china-trip" /></label>
              <div class="utm-grid">
                <label>UTM Source<input v-model="state.campaignForm.trackingUtmSource" placeholder="email" /></label>
                <label>UTM Medium<input v-model="state.campaignForm.trackingUtmMedium" placeholder="email" /></label>
                <label>UTM Campaign<input v-model="state.campaignForm.trackingUtmCampaign" placeholder="1780118309231001" /></label>
                <label>UTM Content<input v-model="state.campaignForm.trackingUtmContent" placeholder="template_a" /></label>
                <label>UTM Term<input v-model="state.campaignForm.trackingUtmTerm" /></label>
              </div>
              <div class="modal-actions">
                <button class="secondary-action" type="button" :disabled="state.loading" @click="closeTrackingLinkDialog">取消</button>
                <button class="primary-action" :disabled="state.loading">保存短链接配置</button>
              </div>
            </form>
          </section>
        </div>

        <section v-if="canAccessNav('tracking') && state.activeNav === 'tracking'" class="tracking-page">
          <div class="toolbar compact-toolbar">
            <label>
              活动筛选
              <select v-model="state.trackingFilter.campaignId" @change="loadTrackingAnalytics(0, 0)">
                <option value="">全部活动</option>
                <option v-for="campaign in state.campaigns" :key="campaign.id" :value="campaign.id">{{ campaign.name }} / {{ campaign.id }}</option>
              </select>
            </label>
            <button class="secondary-action" type="button" :disabled="state.loading" @click="loadTrackingAnalytics(0, 0)">
              <RefreshCw :size="16" /> 刷新
            </button>
          </div>

          <section class="stats-grid tracking-stats">
            <button class="stat-card" type="button">
              <BarChart3 :size="22" />
              <span>总点击</span>
              <strong>{{ state.trackingSummary.totalClicks || 0 }}</strong>
            </button>
            <button class="stat-card" type="button">
              <Users :size="22" />
              <span>已点击客户</span>
              <strong>{{ state.trackingSummary.clickedCustomers || 0 }}</strong>
            </button>
            <button class="stat-card" type="button">
              <ExternalLink :size="22" />
              <span>短链数</span>
              <strong>{{ state.trackingSummary.shortLinks || 0 }}</strong>
            </button>
            <button class="stat-card" type="button">
              <CheckCircle2 :size="22" />
              <span>客户点击率</span>
              <strong>{{ percentValue(state.trackingSummary.clickRate) }}</strong>
            </button>
          </section>

          <article class="ops-panel tracking-trend">
            <div class="panel-title">
              <BarChart3 :size="19" />
              <h3>点击趋势</h3>
            </div>
            <div class="trend-row" v-if="state.trackingTimeseries.length">
              <div v-for="point in state.trackingTimeseries" :key="point.bucket" class="trend-point">
                <span>{{ point.bucket }}</span>
                <strong>{{ point.clicks }}</strong>
                <small>{{ point.customers }} 客户</small>
              </div>
            </div>
            <div v-else class="empty-state compact-empty">暂无点击趋势数据</div>
          </article>

          <section class="main-grid with-detail">
            <article class="ops-panel">
              <div class="panel-title">
                <Layers :size="19" />
                <h3>UTM 维度</h3>
              </div>
              <div class="data-table compact-table">
                <table>
                  <thead>
                    <tr>
                      <th>维度</th>
                      <th>点击</th>
                      <th>客户</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in state.trackingUtmStats" :key="item.dimension">
                      <td>{{ item.dimension || '-' }}</td>
                      <td>{{ item.clicks }}</td>
                      <td>{{ item.customers }}</td>
                    </tr>
                    <tr v-if="!state.trackingUtmStats.length">
                      <td colspan="3">暂无 UTM 点击数据</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </article>

            <article class="ops-panel">
              <div class="panel-title">
                <Eye :size="19" />
                <h3>点击明细</h3>
              </div>
              <div class="data-table compact-table">
                <table>
                  <thead>
                    <tr>
                      <th>时间</th>
                      <th>活动</th>
                      <th>客户</th>
                      <th>来源</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="event in state.trackingEvents" :key="event.id">
                      <td>{{ event.clickedAt }}</td>
                      <td>{{ event.campaignId }}</td>
                      <td>{{ event.customerId || '-' }}</td>
                      <td>{{ event.referrer || '-' }}</td>
                    </tr>
                    <tr v-if="!state.trackingEvents.length">
                      <td colspan="4">暂无点击明细</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="pagination">
                <span>第 {{ state.trackingEventPage.page + 1 }} 页 / 共 {{ state.trackingEventPage.totalPages || 1 }} 页</span>
                <button type="button" :disabled="!state.trackingEventPage.hasPrevious" @click="changeTrackingEventPage(state.trackingEventPage.page - 1)">上一页</button>
                <button type="button" :disabled="!state.trackingEventPage.hasNext" @click="changeTrackingEventPage(state.trackingEventPage.page + 1)">下一页</button>
              </div>
            </article>
          </section>

          <article class="ops-panel tracking-rank">
            <div class="panel-title">
              <ExternalLink :size="19" />
              <h3>短链排行</h3>
            </div>
            <div class="data-table compact-table">
              <table>
                <thead>
                  <tr>
                    <th>短链</th>
                    <th>目标链接</th>
                    <th>点击</th>
                    <th>客户</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="link in state.trackingLinkStats" :key="link.shortLinkId">
                    <td>{{ link.shortUrl }}</td>
                    <td>{{ link.finalUrl }}</td>
                    <td>{{ link.clicks }}</td>
                    <td>{{ link.customers }}</td>
                  </tr>
                  <tr v-if="!state.trackingLinkStats.length">
                    <td colspan="4">暂无短链排行数据</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="pagination">
              <span>第 {{ state.trackingLinkPage.page + 1 }} 页 / 共 {{ state.trackingLinkPage.totalPages || 1 }} 页</span>
              <button type="button" :disabled="!state.trackingLinkPage.hasPrevious" @click="changeTrackingLinkPage(state.trackingLinkPage.page - 1)">上一页</button>
              <button type="button" :disabled="!state.trackingLinkPage.hasNext" @click="changeTrackingLinkPage(state.trackingLinkPage.page + 1)">下一页</button>
            </div>
          </article>
        </section>

        <section v-if="canAccessNav('settings') && state.activeNav === 'settings'" class="utility-page">
          <article class="ops-panel">
            <div class="panel-title">
              <Settings :size="19" />
              <h3>租户账号</h3>
            </div>
            <dl class="settings-list">
              <div><dt>登录邮箱</dt><dd>{{ state.user?.email }}</dd></div>
              <div><dt>租户 ID</dt><dd>{{ state.user?.tenantId }}</dd></div>
              <div><dt>用户 ID</dt><dd>{{ state.user?.userId }}</dd></div>
              <div><dt>主角色</dt><dd>{{ primaryRoleLabel }}（{{ primaryRole }}）</dd></div>
              <div><dt>全部角色</dt><dd>{{ state.user?.roles?.join(', ') || 'TENANT_OWNER' }}</dd></div>
              <div><dt>可访问页面</dt><dd>{{ availableNavItems.map((item) => item.label).join('、') }}</dd></div>
            </dl>
          </article>
        </section>
      </section>
    </main>
  `
}

createApp(App).mount('#app')
