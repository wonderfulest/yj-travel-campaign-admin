import { computed, nextTick } from 'vue'
import { defineStore } from 'pinia'
import type { Campaign, CampaignForm, CampaignStatus, Segment, TestEmail } from '../types.ts'
import { request, appStore } from './appContext.ts'
import { normalizePageResult, emptyPageResult, pageQuery, boundedPage } from './useCustomerStore.ts'
import { segmentStore } from './useSegmentStore.ts'
import {
  cloneTemplateVariables,
  parseTemplateVariables,
  renderTemplatePreview,
  scanTemplateVariableKeys,
  syncTemplateVariables,
  templateVariablesToJson
} from '../utils/templateVariables.ts'

export const REQUIRED_TRACKING_LINK_PARAM = 'trackingLink'
export const REQUIRED_TRACKING_LINK_MESSAGE = 'HTML 模板必须包含短链参数 ${trackingLink}'
export const DEFAULT_TEMPLATE_VARIABLES = [
  { key: 'customerName', label: '客户名称', sampleValue: 'Reisen Scala', required: true },
  { key: 'companyName', label: '公司名称', sampleValue: 'Youjie Tech', required: false },
  { key: REQUIRED_TRACKING_LINK_PARAM, label: '短链', sampleValue: 'https://s.example.com/china-trip-demo', required: true }
]
export const EMPTY_TEMPLATE_PREVIEW_HTML = '<!doctype html><html><body style="font-family:Arial,sans-serif;color:#667;margin:24px;">暂无可预览的邮件模板</body></html>'

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

export const useCampaignStore = defineStore('campaign', {
  state: () => ({
    campaigns: [] as Campaign[],
    campaignPage: {
      page: 0,
      size: 20,
      totalItems: 0,
      totalPages: 0,
      hasNext: false,
      hasPrevious: false
    },
    selectedCampaign: null as Campaign | null,
    campaignForm: defaultCampaignForm(),
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
    templatePreviewLoading: false
  })
})

export const campaignStore = useCampaignStore()

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

export const campaignCurrentStatus = computed(() => campaignStore.selectedCampaign?.status || 'DRAFT')
export const campaignCurrentStatusLabel = computed(() => CAMPAIGN_STATUS_LABELS[campaignCurrentStatus.value] || campaignCurrentStatus.value)
export const campaignNextAction = computed(() => CAMPAIGN_NEXT_ACTION_BY_STATUS[campaignCurrentStatus.value] || '')
export const campaignNextActionLabel = computed(() => campaignNextAction.value ? campaignActionLabel(campaignNextAction.value) : '生命周期已完成')
export const campaignAdvanceButtonLabel = computed(() => campaignNextAction.value ? '确认' : '生命周期已完成')
export const templateMissingTrackingLinkParam = computed(() => !campaignHtmlHasTrackingLinkParam())

export const editableTemplateVariableRows = computed(() =>
  campaignStore.campaignForm.templateVariables
    .map((variable, index) => ({ variable, index }))
    .filter(({ variable }) => String(variable.key || '').trim() !== REQUIRED_TRACKING_LINK_PARAM)
)

export const campaignSetupDirty = computed(() => {
  const campaign = campaignStore.selectedCampaign
  if (!campaign?.id || !campaign.template) return false
  return (campaign.template.subject || '') !== (campaignStore.campaignForm.subject || '')
    || (campaign.template.fromName || '') !== (campaignStore.campaignForm.fromName || '')
    || (campaign.template.htmlBody || campaign.template.body || '') !== (campaignStore.campaignForm.htmlBody || '')
    || String(campaign.channelId || '') !== String(campaignStore.campaignForm.channelId || '')
    || normalizedIdList(campaign.segmentIds) !== normalizedIdList(campaignStore.campaignForm.segmentIds)
    || normalizedTemplateVariables(parseTemplateVariables(campaign.template.variablesJson, DEFAULT_TEMPLATE_VARIABLES)) !== normalizedTemplateVariables(campaignStore.campaignForm.templateVariables)
})

export const campaignTrackingLinkDirty = computed(() => {
  const campaign = campaignStore.selectedCampaign
  if (!campaign?.id) return false
  return (campaign.trackingLink?.targetUrl || '') !== (campaignStore.campaignForm.trackingTargetUrl || '')
    || (campaign.trackingLink?.shortCode || '') !== (campaignStore.campaignForm.trackingShortCode || '')
    || (campaign.trackingLink?.utmSource || '') !== (campaignStore.campaignForm.trackingUtmSource || '')
    || (campaign.trackingLink?.utmMedium || '') !== (campaignStore.campaignForm.trackingUtmMedium || '')
    || (campaign.trackingLink?.utmCampaign || '') !== (campaignStore.campaignForm.trackingUtmCampaign || '')
    || (campaign.trackingLink?.utmContent || '') !== (campaignStore.campaignForm.trackingUtmContent || '')
    || (campaign.trackingLink?.utmTerm || '') !== (campaignStore.campaignForm.trackingUtmTerm || '')
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

export function campaignPrePushBlockReason() {
  if (!campaignStore.selectedCampaign?.id) return '请先创建或选择活动'
  if (!campaignStore.selectedCampaign.template) return '请先保存活动配置以写入邮件模板'
  if (templateMissingTrackingLinkParam.value) return REQUIRED_TRACKING_LINK_MESSAGE
  if (campaignSetupDirty.value) return '当前模板、通道或客群有未保存修改，请先保存活动配置'
  if (!campaignStore.selectedCampaign.trackingLink) return '请先保存活动短链接配置'
  if (campaignTrackingLinkDirty.value) return '当前短链接配置有未保存修改，请先保存短链接配置'
  if (!campaignStore.selectedCampaign.channelId) {
    return campaignStore.campaignForm.channelId ? '请先保存活动配置以绑定推送通道' : '请先选择并保存推送通道'
  }
  if (!campaignStore.selectedCampaign.segmentIds?.length) {
    return campaignStore.campaignForm.segmentIds.length ? '请先保存活动配置以绑定客群' : '请先选择并保存客群'
  }
  return ''
}

export function campaignDraftAdvanceBlockReason() {
  if (campaignNextAction.value !== 'saveDraft') return ''
  if (!campaignStore.selectedCampaign?.id) return '请先创建活动，并保存短链接配置、推送通道和客群'
  if (!campaignStore.selectedCampaign.trackingLink) return '请先保存活动短链接配置'
  if (campaignTrackingLinkDirty.value) return '当前短链接配置有未保存修改，请先保存短链接配置'
  if (!campaignStore.selectedCampaign.channelId) {
    return campaignStore.campaignForm.channelId ? '请先保存活动配置以绑定推送通道' : '请先选择并保存推送通道'
  }
  if (!campaignStore.selectedCampaign.segmentIds?.length) {
    return campaignStore.campaignForm.segmentIds.length ? '请先保存活动配置以绑定客群' : '请先选择并保存客群'
  }
  if (campaignSetupDirty.value) return '当前模板、通道或客群有未保存修改，请先保存活动配置'
  return ''
}

export function isCampaignActionDisabled(action) {
  if (appStore.loading || !campaignStore.selectedCampaign?.id) return true
  if (action === 'prePush' && campaignPrePushBlockReason()) return true
  return campaignNextAction.value !== action
}

export function isCampaignAdvanceDisabled() {
  if (appStore.loading || !campaignNextAction.value) return true
  if (campaignStore.selectedCampaign?.id) return false
  return campaignNextAction.value !== 'saveDraft' || !campaignStore.campaignForm.name.trim()
}

export function isCampaignStepDisabled(step) {
  return appStore.loading || !campaignStore.selectedCampaign?.id || !step?.rollback
}

export function campaignActionTitle(action) {
  if (!campaignStore.selectedCampaign?.id) return '请先创建或选择活动'
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
  if (campaignNextAction.value === 'saveDraft') return campaignDraftAdvanceBlockReason() || '保存当前草稿配置，并进入模拟发送步骤'
  if (!campaignStore.selectedCampaign?.id) return '请先创建或选择活动'
  if (campaignNextAction.value === 'prePush') {
    const reason = campaignPrePushBlockReason()
    if (reason) return reason
  }
  if (campaignNextAction.value === 'confirm') return '确认推送'
  return `确认完成当前步骤，并进入：${campaignNextActionLabel.value}`
}

export function campaignStepTitle(step) {
  if (!campaignStore.selectedCampaign?.id) return '请先创建或选择活动'
  if (campaignCurrentStatus.value === 'CONFIRMED') return '推送完成后状态不可修改'
  if (step?.active) return '当前步骤'
  if (step?.rollback) return `回退到上一步：${step.label}`
  return '只能回退到上一步或确认进入下一步'
}

export function fillCampaignForm(campaign: Campaign): void {
  campaignStore.selectedCampaign = campaign
  campaignStore.campaignForm.name = campaign.name || ''
  campaignStore.campaignForm.objective = campaign.objective || ''
  campaignStore.campaignForm.subject = campaign.template?.subject || ''
  campaignStore.campaignForm.fromName = campaign.template?.fromName || ''
  campaignStore.campaignForm.htmlBody = campaign.template?.htmlBody || campaign.template?.body || ''
  campaignStore.campaignForm.templateVariables = campaign.template
    ? parseTemplateVariables(campaign.template.variablesJson, DEFAULT_TEMPLATE_VARIABLES)
    : []
  syncCampaignTemplateVariables()
  campaignStore.campaignForm.trackingTargetUrl = campaign.trackingLink?.targetUrl || ''
  campaignStore.campaignForm.trackingShortCode = campaign.trackingLink?.shortCode || ''
  campaignStore.campaignForm.trackingUtmSource = campaign.trackingLink?.utmSource || ''
  campaignStore.campaignForm.trackingUtmMedium = campaign.trackingLink?.utmMedium || ''
  campaignStore.campaignForm.trackingUtmCampaign = campaign.trackingLink?.utmCampaign || ''
  campaignStore.campaignForm.trackingUtmContent = campaign.trackingLink?.utmContent || ''
  campaignStore.campaignForm.trackingUtmTerm = campaign.trackingLink?.utmTerm || ''
  campaignStore.campaignForm.channelId = campaign.channelId || ''
  campaignStore.campaignForm.segmentIds = [...(campaign.segmentIds || [])]
  campaignStore.segmentDropdownOpen = false
  campaignStore.segmentDropdownQuery = ''
  campaignStore.trackingLinkDialogOpen = false
  updateLocalTemplatePreview()
}

export function clearCampaignSelection(): void {
  campaignStore.selectedCampaign = null
  campaignStore.campaignForm = defaultCampaignForm()
  campaignStore.segmentDropdownOpen = false
  campaignStore.segmentDropdownQuery = ''
  campaignStore.trackingLinkDialogOpen = false
  updateLocalTemplatePreview()
}

export function syncCampaignTemplateVariables(): void {
  campaignStore.campaignForm.templateVariables = syncTemplateVariables({
    subject: campaignStore.campaignForm.subject,
    htmlBody: campaignStore.campaignForm.htmlBody,
    variables: campaignStore.campaignForm.templateVariables
  })
  updateLocalTemplatePreview()
}

export function updateLocalTemplatePreview(): void {
  const preview = renderTemplatePreview({
    subject: campaignStore.campaignForm.subject,
    htmlBody: campaignStore.campaignForm.htmlBody,
    variables: campaignStore.campaignForm.templateVariables
  })
  campaignStore.templatePreviewSubject = preview.subjectPreview || ''
  campaignStore.templatePreviewHtml = preview.htmlPreview || ''
  campaignStore.templatePreviewError = ''
}

export function templateVariablesJson(): string {
  syncCampaignTemplateVariables()
  return templateVariablesToJson(campaignStore.campaignForm.templateVariables)
}

export function addTemplateVariable(): void {
  campaignStore.campaignForm.templateVariables.push({
    key: '',
    label: '',
    sampleValue: '',
    required: false
  })
}

export function removeTemplateVariable(index: number): void {
  campaignStore.campaignForm.templateVariables.splice(index, 1)
}

export async function insertTemplateVariable(variable: { key?: string }): Promise<void> {
  const key = String(variable?.key || '').trim()
  if (!key) return
  const placeholder = '${' + key + '}'
  const editor = document.getElementById('campaign-html-editor') as HTMLTextAreaElement | null
  if (!editor) {
    campaignStore.campaignForm.htmlBody += placeholder
    syncCampaignTemplateVariables()
    return
  }
  const start = editor.selectionStart ?? campaignStore.campaignForm.htmlBody.length
  const end = editor.selectionEnd ?? campaignStore.campaignForm.htmlBody.length
  campaignStore.campaignForm.htmlBody = `${campaignStore.campaignForm.htmlBody.slice(0, start)}${placeholder}${campaignStore.campaignForm.htmlBody.slice(end)}`
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
    subject: campaignStore.campaignForm.subject,
    fromName: campaignStore.campaignForm.fromName,
    htmlBody: campaignStore.campaignForm.htmlBody,
    variablesJson: templateVariablesJson()
  }
}

export function campaignHtmlHasTrackingLinkParam(): boolean {
  return scanTemplateVariableKeys(campaignStore.campaignForm.htmlBody).includes(REQUIRED_TRACKING_LINK_PARAM)
}

export function validateCampaignTemplateTrackingLink(): boolean {
  if (campaignHtmlHasTrackingLinkParam()) return true
  campaignStore.templatePreviewHtml = ''
  campaignStore.templatePreviewSubject = ''
  campaignStore.templatePreviewError = REQUIRED_TRACKING_LINK_MESSAGE
  appStore.error = REQUIRED_TRACKING_LINK_MESSAGE
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
    targetUrl: campaignStore.campaignForm.trackingTargetUrl,
    shortCode: campaignStore.campaignForm.trackingShortCode,
    utmSource: campaignStore.campaignForm.trackingUtmSource,
    utmMedium: campaignStore.campaignForm.trackingUtmMedium,
    utmCampaign: campaignStore.campaignForm.trackingUtmCampaign,
    utmContent: campaignStore.campaignForm.trackingUtmContent,
    utmTerm: campaignStore.campaignForm.trackingUtmTerm
  }
}

export function openTrackingLinkDialog(): void {
  if (!campaignStore.selectedCampaign?.id) {
    appStore.error = '请先创建或选择活动'
    return
  }
  campaignStore.trackingLinkDialogOpen = true
}

export function closeTrackingLinkDialog(): void {
  campaignStore.trackingLinkDialogOpen = false
}

export function openFinalConfirmDialog(): void {
  if (!campaignStore.selectedCampaign?.id) {
    appStore.error = '请先选择或创建活动'
    return
  }
  campaignStore.finalConfirmDialogOpen = true
  appStore.error = ''
}

export function closeFinalConfirmDialog(): void {
  campaignStore.finalConfirmDialogOpen = false
}

export function filteredCampaignSegments(segments = segmentStore.segments): Segment[] {
  const items = Array.isArray(segments) ? segments : []
  const keyword = campaignStore.segmentDropdownQuery.trim().toLowerCase()
  if (!keyword) return items
  return items.filter((segment) =>
    [segment.name, segment.id, segment.description]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(keyword))
  )
}

export function selectedCampaignSegments(segments = segmentStore.segments): Segment[] {
  const items = Array.isArray(segments) ? segments : []
  return campaignStore.campaignForm.segmentIds
    .map((id) => items.find((segment) => segment.id === id))
    .filter((s): s is Segment => Boolean(s))
}

export function isCampaignSegmentSelected(segmentId: string | number): boolean {
  return campaignStore.campaignForm.segmentIds.includes(segmentId)
}

export function toggleCampaignSegment(segmentId: string | number): void {
  if (isCampaignSegmentSelected(segmentId)) {
    campaignStore.campaignForm.segmentIds = campaignStore.campaignForm.segmentIds.filter((id) => id !== segmentId)
    return
  }
  campaignStore.campaignForm.segmentIds = [...campaignStore.campaignForm.segmentIds, segmentId]
}

export function removeCampaignSegment(segmentId: string | number): void {
  campaignStore.campaignForm.segmentIds = campaignStore.campaignForm.segmentIds.filter((id) => id !== segmentId)
}

export function normalizeEmailInput(email: unknown): string {
  return String(email || '').trim().toLowerCase()
}

export function isTestEmailSelected(email: string): boolean {
  return campaignStore.selectedTestEmails.includes(normalizeEmailInput(email))
}

export function toggleTestEmail(email: string): void {
  const normalized = normalizeEmailInput(email)
  if (!normalized) return
  if (isTestEmailSelected(normalized)) {
    campaignStore.selectedTestEmails = campaignStore.selectedTestEmails.filter((item) => item !== normalized)
    return
  }
  campaignStore.selectedTestEmails = [...campaignStore.selectedTestEmails, normalized]
}

export async function loadTestEmails(): Promise<void> {
  try {
    campaignStore.testEmails = await request('/api/campaigns/test-emails') as TestEmail[]
  } catch (error: unknown) {
    const err = error as { message?: string }
    campaignStore.testEmails = []
    appStore.error = `测试邮箱加载失败：${err.message}`
  }
}

export async function openTestEmailDialog(): Promise<void> {
  if (!campaignStore.selectedCampaign?.id) {
    appStore.error = '请先选择或创建活动'
    return
  }
  campaignStore.testEmailDialogOpen = true
  appStore.error = ''
  await loadTestEmails()
}

export function closeTestEmailDialog(): void {
  campaignStore.testEmailDialogOpen = false
}

export async function addTestEmail(): Promise<void> {
  const email = normalizeEmailInput(campaignStore.newTestEmail)
  if (!email) {
    appStore.error = '请输入测试邮箱'
    return
  }
  appStore.loading = true
  appStore.error = ''
  try {
    await request('/api/campaigns/test-emails', {
      method: 'POST',
      body: JSON.stringify({ email })
    })
    await loadTestEmails()
    if (!isTestEmailSelected(email)) {
      campaignStore.selectedTestEmails = [...campaignStore.selectedTestEmails, email]
    }
    campaignStore.newTestEmail = ''
  } catch (error: unknown) {
    const err = error as { message?: string }
    appStore.error = `测试邮箱保存失败：${err.message}`
  } finally {
    appStore.loading = false
  }
}

export async function deleteTestEmail(testEmail: TestEmail): Promise<void> {
  if (!testEmail?.id) return
  appStore.loading = true
  appStore.error = ''
  try {
    await request(`/api/campaigns/test-emails/${testEmail.id}`, { method: 'DELETE' })
    campaignStore.selectedTestEmails = campaignStore.selectedTestEmails.filter((email) => email !== normalizeEmailInput(testEmail.email))
    await loadTestEmails()
  } catch (error: unknown) {
    const err = error as { message?: string }
    appStore.error = `测试邮箱删除失败：${err.message}`
  } finally {
    appStore.loading = false
  }
}

export async function loadCampaigns(page = campaignStore.campaignPage.page): Promise<void> {
  try {
    const result = await request(`/api/campaigns?${pageQuery(campaignStore.campaignPage, page)}`)
    const pageResult = normalizePageResult<Campaign>(result, [], page, campaignStore.campaignPage.size)
    campaignStore.campaigns = pageResult.items
    campaignStore.campaignPage = pageResult
    if (campaignStore.selectedCampaign && !pageResult.items.some((item) => item.id === campaignStore.selectedCampaign!.id)) {
      clearCampaignSelection()
    }
    if (campaignStore.selectedCampaign) {
      campaignStore.selectedCampaign = pageResult.items.find((item) => item.id === campaignStore.selectedCampaign!.id) || null
    }
    if (!pageResult.items.length) {
      clearCampaignSelection()
    }
    if (!campaignStore.selectedCampaign && pageResult.items.length) {
      fillCampaignForm(pageResult.items[0])
    }
  } catch (error: unknown) {
    const err = error as { message?: string }
    campaignStore.campaigns = []
    campaignStore.campaignPage = emptyPageResult<Campaign>(0, campaignStore.campaignPage.size)
    clearCampaignSelection()
    appStore.error = `活动加载失败：${err.message}`
  }
}

async function createCampaign(): Promise<void> {
  appStore.loading = true
  appStore.error = ''
  appStore.notice = ''
  try {
    const campaign = await request('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify({ name: campaignStore.campaignForm.name, objective: campaignStore.campaignForm.objective })
    }) as Campaign
    campaignStore.selectedCampaign = campaign
    fillCampaignForm(campaign)
    await loadCampaigns()
    appStore.notice = '邮件活动已创建'
  } catch (error: unknown) {
    const err = error as { message?: string }
    appStore.error = `活动创建失败：${err.message}`
  } finally {
    appStore.loading = false
  }
}

export async function saveCampaignSetup(): Promise<void> {
  if (!validateCampaignTemplateTrackingLink()) return
  if (!campaignStore.selectedCampaign?.id) {
    await createCampaign()
  }
  const campaignId = campaignStore.selectedCampaign?.id
  if (!campaignId) return
  appStore.loading = true
  appStore.error = ''
  appStore.notice = ''
  try {
    let campaign = await request(`/api/campaigns/${campaignId}/template`, {
      method: 'PUT',
      body: JSON.stringify(campaignTemplatePayload())
    }) as Campaign
    if (campaignStore.campaignForm.channelId) {
      campaign = await request(`/api/campaigns/${campaignId}/channel`, {
        method: 'PUT',
        body: JSON.stringify({ channelId: campaignStore.campaignForm.channelId })
      }) as Campaign
    }
    if (campaignStore.campaignForm.segmentIds.length) {
      campaign = await request(`/api/campaigns/${campaignId}/segments`, {
        method: 'PUT',
        body: JSON.stringify({ segmentIds: campaignStore.campaignForm.segmentIds })
      }) as Campaign
    }
    fillCampaignForm(campaign)
    await loadCampaigns()
    appStore.notice = '活动配置已保存'
  } catch (error: unknown) {
    const err = error as { message?: string }
    appStore.error = `活动配置保存失败：${err.message}`
  } finally {
    appStore.loading = false
  }
}

async function saveCampaignDraftForAdvance(): Promise<Campaign | null> {
  if (!validateCampaignTemplateTrackingLink()) return null
  let campaign = campaignStore.selectedCampaign
  if (!campaign?.id) {
    campaign = await request('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify({ name: campaignStore.campaignForm.name, objective: campaignStore.campaignForm.objective })
    }) as Campaign
    campaignStore.selectedCampaign = campaign
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

export async function saveCampaignTrackingLink(): Promise<void> {
  if (!campaignStore.selectedCampaign?.id) {
    appStore.error = '请先创建或选择活动'
    return
  }
  const campaignId = campaignStore.selectedCampaign.id
  appStore.loading = true
  appStore.error = ''
  appStore.notice = ''
  try {
    const campaign = await request(`/api/campaigns/${campaignId}/tracking-link`, {
      method: 'PUT',
      body: JSON.stringify(campaignTrackingLinkPayload())
    }) as Campaign
    fillCampaignForm(campaign)
    await loadCampaigns()
    campaignStore.trackingLinkDialogOpen = false
    appStore.notice = '短链接配置已保存'
  } catch (error: unknown) {
    const err = error as { message?: string }
    appStore.error = `短链接配置保存失败：${err.message}`
  } finally {
    appStore.loading = false
  }
}

export async function previewCampaignTemplate(): Promise<void> {
  if (!validateCampaignTemplateTrackingLink()) return
  if (!campaignStore.selectedCampaign?.id) {
    updateLocalTemplatePreview()
    return
  }
  const campaignId = campaignStore.selectedCampaign.id
  campaignStore.templatePreviewLoading = true
  campaignStore.templatePreviewError = ''
  try {
    const result = await request(`/api/campaigns/${campaignId}/template/preview`, {
      method: 'POST',
      body: JSON.stringify(campaignTemplatePayload())
    }) as { subjectPreview?: string; htmlPreview?: string }
    campaignStore.templatePreviewSubject = result.subjectPreview || ''
    campaignStore.templatePreviewHtml = result.htmlPreview || ''
  } catch (error: unknown) {
    const err = error as { message?: string }
    campaignStore.templatePreviewHtml = ''
    campaignStore.templatePreviewSubject = ''
    campaignStore.templatePreviewError = err.message || '模板预览失败'
  } finally {
    campaignStore.templatePreviewLoading = false
  }
}

interface CampaignActionOptions {
  confirmedTestEmails?: boolean
  confirmedFinalPush?: boolean
}

interface CampaignStep {
  status: CampaignStatus
  label: string
  hint?: string
  active?: boolean
  done?: boolean
  rollback?: boolean
}

export async function runCampaignAction(action: string, options: CampaignActionOptions = {}): Promise<void> {
  if (!campaignStore.selectedCampaign?.id) {
    appStore.error = '请先选择或创建活动'
    return
  }
  if (campaignNextAction.value !== action) {
    appStore.error = campaignActionTitle(action)
    return
  }
  if (action === 'prePush') {
    const reason = campaignPrePushBlockReason()
    if (reason) {
      appStore.error = reason
      return
    }
  }
  if (action === 'simulateSend' && !options.confirmedTestEmails) {
    await openTestEmailDialog()
    return
  }
  if (action === 'simulateSend' && !campaignStore.selectedTestEmails.length) {
    appStore.error = '请选择或新增至少一个测试邮箱'
    return
  }
  appStore.loading = true
  appStore.error = ''
  appStore.notice = ''
  try {
    const campaignId = campaignStore.selectedCampaign.id
    const requestOptions = {
      method: 'POST',
      body: JSON.stringify(action === 'simulateSend' ? { testEmails: campaignStore.selectedTestEmails } : {})
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
      campaignStore.selectedTestEmails = []
      appStore.notice = '模拟发送成功'
    } else {
      appStore.notice = '活动状态已更新'
    }
  } catch (error: unknown) {
    const err = error as { message?: string }
    appStore.error = `活动操作失败：${err.message}`
  } finally {
    appStore.loading = false
  }
}

export async function advanceCampaignStep(options: CampaignActionOptions = {}): Promise<void> {
  if (!campaignNextAction.value) {
    appStore.error = '当前活动生命周期已完成'
    return
  }
  if (!campaignStore.selectedCampaign?.id && campaignNextAction.value !== 'saveDraft') {
    appStore.error = '请先选择或创建活动'
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
  const draftBlockReason = campaignDraftAdvanceBlockReason()
  if (draftBlockReason) {
    appStore.error = draftBlockReason
    return
  }
  appStore.loading = true
  appStore.error = ''
  appStore.notice = ''
  try {
    const campaign = await saveCampaignDraftForAdvance()
    if (!campaign) return
    appStore.notice = `已确认并进入下一步：${campaignCurrentStatusLabel.value}`
  } catch (error: unknown) {
    const err = error as { message?: string }
    appStore.error = `活动状态推进失败：${err.message}`
  } finally {
    appStore.loading = false
  }
}

export async function confirmTestSimulation(): Promise<void> {
  if (!campaignStore.selectedTestEmails.length) {
    appStore.error = '请选择或新增至少一个测试邮箱'
    return
  }
  await advanceCampaignStep({ confirmedTestEmails: true })
}

export async function confirmFinalPush(): Promise<void> {
  closeFinalConfirmDialog()
  await runCampaignAction('confirm', { confirmedFinalPush: true })
}

export async function rollbackCampaignStep(step: CampaignStep | null | undefined): Promise<void> {
  if (!campaignStore.selectedCampaign?.id) {
    appStore.error = '请先选择或创建活动'
    return
  }
  if (!step?.rollback) {
    appStore.error = campaignStepTitle(step)
    return
  }
  appStore.loading = true
  appStore.error = ''
  appStore.notice = ''
  try {
    const campaign = await request(`/api/campaigns/${campaignStore.selectedCampaign.id}/rollback`, {
      method: 'POST',
      body: JSON.stringify({
        expectedStatus: campaignCurrentStatus.value,
        targetStatus: step.status
      })
    }) as Campaign
    fillCampaignForm(campaign)
    await loadCampaigns()
    appStore.notice = `已回退到上一步：${campaignCurrentStatusLabel.value}`
  } catch (error: unknown) {
    const err = error as { message?: string }
    appStore.error = `活动状态回退失败：${err.message}`
  } finally {
    appStore.loading = false
  }
}

export function changeCampaignPage(nextPage: number): void {
  if (nextPage < 0 || (campaignStore.campaignPage.totalPages && nextPage >= campaignStore.campaignPage.totalPages)) return
  loadCampaigns(nextPage)
}

export function jumpCampaignPage(pageNumber: number | string): void {
  const nextPage = boundedPage(campaignStore.campaignPage, pageNumber)
  if (nextPage === null || nextPage === campaignStore.campaignPage.page) return
  loadCampaigns(nextPage)
}

export function changeCampaignPageSize(size: number | string): void {
  const nextSize = Number(size)
  if (!nextSize) return
  campaignStore.campaignPage.size = nextSize
  loadCampaigns(0)
}
