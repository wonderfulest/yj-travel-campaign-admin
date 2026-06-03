import type { Component } from 'vue'

// ==================== 基础类型 ====================

export type EmailQuality = 'PENDING' | 'VERIFIED' | 'BOUNCED' | 'MISSING'
export type ContactStatus = 'NOT_CONTACTED' | 'CONTACTED' | 'UNSUBSCRIBED' | 'BOUNCED' | 'INVALID' | 'READY_TO_VERIFY'
export type CampaignStatus = 'DRAFT' | 'CONFIGURED' | 'SIMULATED' | 'PREVIEW_GENERATED' | 'CONFIRMED'
export type UserRole = 'TENANT_OWNER' | 'TENANT_ADMIN' | 'TENANT_USER'
export type ChannelType = 'smtp' | 'aws-ses'
export type CustomerTool = 'list' | 'import' | 'mapping'
export type AuthMode = 'login' | 'register'

export interface TemplateVariable {
  key: string
  label: string
  sampleValue: string
  required: boolean
}

export interface NavItem {
  key: string
  label: string
  icon: Component
  title?: string
  description?: string
  parentKey?: string
}

export interface NavChildItem {
  key: string
  label: string
}

export interface StatCard {
  label: string
  value: string | number
  icon: Component
  target: string
  tool?: string
}

export interface DonutSegment {
  label: string
  color: string
  percent: number
  dashArray: string
  dashOffset: string
}

export interface DonutChart {
  total: number
  radius: number
  segments: DonutSegment[]
}

export interface SummaryStatItem {
  status?: string
  label?: string
  customers: number
}

export interface ReadinessBar {
  segmentId: string | number
  segmentName: string
  totalShare: string
  reachableShare: string
  reachableMemberCount: number
  memberCount: number
}

// ==================== 分页类型 ====================

export interface PageResult<T> {
  items: T[]
  page: number
  size: number
  totalItems: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

// ==================== 用户相关 ====================

export interface User {
  email: string
  tenantId: string | number
  userId: string | number
  roles: UserRole[]
}

export interface AuthForm {
  tenantName: string
  displayName: string
  email: string
  password: string
}

export interface LoginResult {
  accessToken: string
  email: string
  tenantId: string | number
  userId: string | number
  roles?: UserRole[]
}

export interface TenantApiSecretStatus {
  tenantId: string
  configured: boolean
  lastRotatedAt?: string
}

export interface TenantApiSecretRotationResult {
  tenantId: string
  secretKey: string
  rotatedAt: string
}

export interface TenantSettings {
  tenantId: string
  unsubscribePageUrl?: string
}

export interface CustomerSearchIndexSyncResult {
  tenantId: string
  indexedAssets: number
}

// ==================== 客户资产 ====================

export interface Customer {
  id: string
  tenantId?: string
  assetType?: string
  name: string
  country: string
  region?: string
  city: string
  email: string
  emailNormalized?: string
  website: string
  phone: string
  emailQuality: EmailQuality
  contactStatus: ContactStatus
  sourcePrimary: string
  sourceObjectId?: string
  rawPayload?: string
  longitude?: number
  latitude?: number
  postcode?: string
  street?: string
  houseNumber?: string
  businessScope?: string
  timezone?: string
  createdAt?: string
}

export interface CustomerSegmentMember extends Partial<Customer> {
  memberId: string
  customerId: string
  customerName: string
  matchedAt?: string
}

export interface CustomerProfile {
  asset: Customer
  businessScope: string
  travelProfile: unknown | null
  destinations: unknown[]
  languages: unknown[]
  sources: unknown[]
}

export interface CustomerSummary {
  totalCustomers: number
  customersWithEmail: number
  pendingEmailCustomers: number
  verifiedEmailCustomers: number
  missingEmailCustomers: number
  reachableCustomers: number
  unreachableCustomers: number
  customersByCountry: Array<{ country: string; customers: number }>
  customersByEmailQuality: SummaryStatItem[]
  customersByContactStatus: SummaryStatItem[]
}

export interface CustomerEditForm {
  name: string
  country: string
  city: string
  postcode: string
  street: string
  houseNumber: string
  website: string
  phone: string
  email: string
  emailQuality: EmailQuality
  contactStatus: ContactStatus
  businessScope: string
}

// ==================== 推送通道 ====================

export interface Channel {
  id: string | number
  name: string
  type: ChannelType
  channelType: string
  fromEmail: string
  fromName: string
  replyTo?: string
  smtpHost?: string
  smtpPort?: number
  smtpEncryption?: string
  smtpUsername?: string
  awsRegion?: string
  awsAccessKeyId?: string
  sesIdentityStatus?: string
  status?: string
}

export interface SmtpForm {
  name: string
  smtpHost: string
  smtpPort: number
  smtpEncryption: string
  smtpUsername: string
  smtpPassword: string
  fromEmail: string
  fromName: string
  replyTo: string
}

export interface AwsSesForm {
  name: string
  fromEmail: string
  fromName: string
  replyTo: string
  awsRegion: string
  awsAccessKeyId: string
  awsSecretAccessKey: string
}

// ==================== 客群管理 ====================

export interface SegmentRuleCondition {
  field: string
  op: string
  values: string[]
  _valueText?: string
  _countryValues?: string[]
}

export interface SegmentRule {
  logic: 'AND' | 'OR'
  conditions: Array<{
    field: string
    op: string
    values: string[]
  }>
}

export interface Segment {
  id: string | number
  name: string
  description: string
  rules?: SegmentRule
  memberCount?: number
}

export interface SegmentForm {
  id: string | number
  name: string
  description: string
  rules: SegmentRuleCondition[]
}

export interface SegmentSummary {
  segmentCount: number
  memberCount: number
  uniqueCustomerCount: number
  reachableMemberCount: number
  topSegments: Array<{
    segmentId: string | number
    segmentName: string
    memberCount: number
    reachableMemberCount: number
  }>
}

export interface SegmentRefreshResult {
  matchedCount: number
  excludedCount?: number
}

// ==================== 邮件活动 ====================

export interface TrackingLink {
  targetUrl: string
  shortCode: string
  shortLinkBaseUrl?: string
  utmSource: string
  utmMedium: string
  utmCampaign: string
  utmContent: string
  utmTerm: string
}

export interface CampaignTemplate {
  subject: string
  fromName: string
  htmlBody: string
  body?: string
  variablesJson?: string
}

export interface Campaign {
  id: string | number
  name: string
  objective: string
  status: CampaignStatus
  channelId?: string | number
  segmentIds?: (string | number)[]
  template?: CampaignTemplate
  trackingLink?: TrackingLink
  prePushRecords?: PrePushRecord[]
}

export interface PrePushRecord {
  campaignId: string | number
  customerId: string | number
  customerName?: string
  email?: string
  status: string
  exclusionReason?: string
  trackingLinkCode?: string
  trackingShortUrl?: string
  trackingFinalUrl?: string
  recipientToken?: string
}

export interface CampaignForm {
  name: string
  objective: string
  subject: string
  fromName: string
  htmlBody: string
  templateVariables: TemplateVariable[]
  trackingTargetUrl: string
  trackingShortCode: string
  trackingUtmSource: string
  trackingUtmMedium: string
  trackingUtmCampaign: string
  trackingUtmContent: string
  trackingUtmTerm: string
  channelId: string | number | ''
  segmentIds: (string | number)[]
}

export interface TemplateVariableOption {
  category: string
  key: string
  label: string
  description?: string
  sampleValue?: string
  required?: boolean
}

// ==================== 测试客户 ====================

// ==================== 短链统计 ====================

export interface TrackingSummary {
  totalClicks: number
  clickedCustomers: number
  shortLinks: number
  clickRate: number
}

export interface TrackingTimeseriesPoint {
  date: string
  clicks: number
}

export interface TrackingUtmStat {
  utmSource: string
  utmMedium: string
  utmCampaign: string
  clicks: number
}

export interface TrackingLinkStat {
  shortLinkId?: string
  shortCode: string
  shortUrl?: string
  finalUrl?: string
  targetUrl: string
  clicks: number
  customers?: number
}

export interface TrackingEventLink {
  id: string
  code: string
  tenantId: string
  campaignId: string
  customerId?: string
  originalUrl?: string
  finalUrl?: string
  shortUrl?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
  utmTerm?: string
}

export interface TrackingEvent {
  id: string
  tenantId?: string
  customerId: string
  customer?: Customer | null
  pushRecordId?: string
  campaignId: string
  shortLinkId?: string
  shortCode: string
  clickedAt: string
  redirectUrl?: string
  referrer?: string
  ipHash?: string
  userAgent?: string
  country?: string
  city?: string
  deviceType?: string
  browser?: string
  os?: string
  originalUrl?: string
  finalUrl?: string
  shortUrl?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
  utmTerm?: string
  trackingLink?: TrackingEventLink | null
}

export interface TrackingFilter {
  campaignId: string
}

// ==================== Mapping/导入 ====================

export interface MappingPreview {
  unmappedCount: number
  previewItems?: unknown[]
}

export interface MappingResult {
  mappedCount: number
  createdCount: number
  updatedCount: number
}

export interface ImportResult {
  importedCount?: number
  totalCount?: number
  successCount?: number
  duplicateCount?: number
  failedCount?: number
  errors?: Array<string | { index?: number; externalId?: string; message?: string }>
}

// ==================== 字典数据 ====================

export interface LocalizedName {
  en_us?: string
  zh_cn?: string
  'zh-CN'?: string
  zh?: string
  en?: string
  [key: string]: string | undefined
}

export interface Country {
  id: string
  alpha3: string
  name: LocalizedName
  languages: string[]
}

export interface City {
  id: string
  name: LocalizedName
  fullName: LocalizedName
  timezone: string
  country: Country | null
}

export interface DictionaryState {
  countries: Country[]
  citiesCache: Record<string, City[]>
  loading: boolean
  error: string
}
