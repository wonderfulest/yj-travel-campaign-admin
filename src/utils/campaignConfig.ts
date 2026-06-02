import type { CampaignForm, CampaignStatus, TrackingLink } from '../types'

export const REQUIRED_TRACKING_LINK_PARAM = 'trackingLink'
export const REQUIRED_TRACKING_LINK_MESSAGE = 'HTML 模板必须包含短链参数 ${trackingLink}'
export const DEFAULT_TEMPLATE_VARIABLES = [
  { key: REQUIRED_TRACKING_LINK_PARAM, label: '短链', sampleValue: 'https://s.example.com/china-trip-demo', required: true }
]
export const EMPTY_TEMPLATE_PREVIEW_HTML = '<!doctype html><html><body style="font-family:Arial,sans-serif;color:#667;margin:24px;">暂无可预览的邮件模板</body></html>'

export const CAMPAIGN_LIFECYCLE_STEPS = [
  { status: 'DRAFT', label: '配置草稿', hint: '模板、通道、客群' },
  { status: 'CONFIGURED', label: '模拟发送', hint: '发送到测试客户' },
  { status: 'SIMULATED', label: '生成推送', hint: '记录入库' },
  { status: 'PREVIEW_GENERATED', label: '确认推送', hint: '开始执行' },
  { status: 'CONFIRMED', label: '推送完成', hint: '生命周期结束' }
] as const

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  DRAFT: '配置草稿',
  CONFIGURED: '模拟发送',
  SIMULATED: '已模拟发送',
  PREVIEW_GENERATED: '已生成推送',
  CONFIRMED: '已确认推送'
}

export const CAMPAIGN_NEXT_ACTION_BY_STATUS: Partial<Record<CampaignStatus, string>> = {
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

export function defaultCampaignForm(): CampaignForm {
  return {
    name: '',
    objective: '',
    subject: '',
    fromName: '',
    htmlBody: '',
    templateVariables: [],
    trackingTargetUrl: '',
    trackingShortCode: '',
    trackingUtmSource: '',
    trackingUtmMedium: '',
    trackingUtmCampaign: '',
    trackingUtmContent: '',
    trackingUtmTerm: '',
    channelId: '',
    segmentIds: []
  }
}

export function campaignLifecycleIndex(status: CampaignStatus): number {
  const index = CAMPAIGN_LIFECYCLE_STEPS.findIndex((step) => step.status === status)
  return index >= 0 ? index : 0
}

export function campaignActionLabel(action: string): string {
  return CAMPAIGN_ACTION_LABELS[action as keyof typeof CAMPAIGN_ACTION_LABELS] || action
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

export function trackingShortUrl(trackingLink: Pick<TrackingLink, 'shortCode' | 'shortLinkBaseUrl'> | null | undefined): string {
  if (!trackingLink?.shortCode) return ''
  const baseUrl = String(trackingLink.shortLinkBaseUrl || '').trim()
  const shortCode = String(trackingLink.shortCode || '').trim()
  if (!baseUrl) return shortCode
  return `${baseUrl.replace(/\/$/, '')}/${shortCode}`
}

export function trackingFinalUrl(trackingLink: Pick<TrackingLink, 'targetUrl' | 'utmSource' | 'utmMedium' | 'utmCampaign' | 'utmContent' | 'utmTerm'> | null | undefined): string {
  const targetUrl = String(trackingLink?.targetUrl || '').trim()
  if (!targetUrl) return ''
  const hashIndex = targetUrl.indexOf('#')
  const base = hashIndex >= 0 ? targetUrl.slice(0, hashIndex) : targetUrl
  const fragment = hashIndex >= 0 ? targetUrl.slice(hashIndex) : ''
  const params = new URLSearchParams()
  const utmSource = String(trackingLink?.utmSource || '').trim()
  const utmMedium = String(trackingLink?.utmMedium || '').trim()
  const utmCampaign = String(trackingLink?.utmCampaign || '').trim()
  const utmContent = String(trackingLink?.utmContent || '').trim()
  const utmTerm = String(trackingLink?.utmTerm || '').trim()
  if (utmSource) params.set('utm_source', utmSource)
  if (utmMedium) params.set('utm_medium', utmMedium)
  if (utmCampaign) params.set('utm_campaign', utmCampaign)
  if (utmContent) params.set('utm_content', utmContent)
  if (utmTerm) params.set('utm_term', utmTerm)
  const utmQuery = params.toString()
  if (!utmQuery) return targetUrl
  return `${base}${base.includes('?') ? '&' : '?'}${utmQuery}${fragment}`
}
