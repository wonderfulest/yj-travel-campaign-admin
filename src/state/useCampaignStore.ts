import { computed, nextTick } from 'vue'
import { defineStore } from 'pinia'
import type { Campaign, CampaignForm, CampaignStatus, Customer, Segment, TemplateVariableOption } from '../types'
import { campaignsApi, type CampaignActionKey } from '../api/campaigns'
import { customersApi } from '../api/customers'
import { useAppStore } from './useAppStore'
import { boundedPage, emptyPageResult, normalizePageResult, pageQuery } from '../utils/pagination'
import { useSegmentStore } from './useSegmentStore'
import {
  CAMPAIGN_LIFECYCLE_STEPS,
  CAMPAIGN_NEXT_ACTION_BY_STATUS,
  CAMPAIGN_STATUS_LABELS,
  DEFAULT_TEMPLATE_VARIABLES,
  REQUIRED_TRACKING_LINK_MESSAGE,
  REQUIRED_TRACKING_LINK_PARAM,
  campaignActionLabel,
  campaignLifecycleIndex,
  defaultCampaignForm,
  normalizedIdList,
  normalizedTemplateVariables,
  trackingFinalUrl,
  trackingShortUrl
} from '../utils/campaignConfig'
import {
  cloneTemplateVariables,
  parseTemplateVariables,
  renderTemplatePreview,
  scanTemplateVariableKeys,
  syncTemplateVariables,
  templateVariablesToJson
} from '../utils/templateVariables'

export {
  CAMPAIGN_ACTION_LABELS,
  CAMPAIGN_LIFECYCLE_STEPS,
  CAMPAIGN_NEXT_ACTION_BY_STATUS,
  CAMPAIGN_STATUS_LABELS,
  DEFAULT_TEMPLATE_VARIABLES,
  EMPTY_TEMPLATE_PREVIEW_HTML,
  REQUIRED_TRACKING_LINK_MESSAGE,
  REQUIRED_TRACKING_LINK_PARAM,
  campaignActionLabel,
  campaignLifecycleIndex,
  defaultCampaignForm,
  normalizedIdList,
  normalizedTemplateVariables,
  trackingFinalUrl,
  trackingShortUrl
} from '../utils/campaignConfig'

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
    testCustomerDialogOpen: false,
    testCustomers: [] as Customer[],
    selectedTestCustomerIds: [] as string[],
    testCustomerQuery: '',
    segmentDropdownOpen: false,
    segmentDropdownQuery: '',
    templateVariableOptions: [] as TemplateVariableOption[],
    templatePreviewHtml: '',
    templatePreviewSubject: '',
    templatePreviewError: '',
    templatePreviewLoading: false
  })
})

const campaignState = () => useCampaignStore()
const appState = () => useAppStore()
const segmentState = () => useSegmentStore()

export const campaignCurrentStatus = computed(() => campaignState().selectedCampaign?.status || 'DRAFT')
export const campaignCurrentStatusLabel = computed(() => CAMPAIGN_STATUS_LABELS[campaignCurrentStatus.value] || campaignCurrentStatus.value)
export const campaignNextAction = computed(() => CAMPAIGN_NEXT_ACTION_BY_STATUS[campaignCurrentStatus.value] || '')
export const campaignNextActionLabel = computed(() => campaignNextAction.value ? campaignActionLabel(campaignNextAction.value) : '生命周期已完成')
export const campaignAdvanceButtonLabel = computed(() => campaignNextAction.value ? '确认' : '生命周期已完成')
export const templateMissingTrackingLinkParam = computed(() => !campaignHtmlHasTrackingLinkParam())

export const editableTemplateVariableRows = computed(() =>
  campaignState().campaignForm.templateVariables
    .map((variable, index) => ({ variable, index }))
    .filter(({ variable }) => String(variable.key || '').trim() !== REQUIRED_TRACKING_LINK_PARAM)
)

export const campaignSetupDirty = computed(() => {
  const campaign = campaignState().selectedCampaign
  if (!campaign?.id || !campaign.template) return false
  return (campaign.template.subject || '') !== (campaignState().campaignForm.subject || '')
    || (campaign.template.fromName || '') !== (campaignState().campaignForm.fromName || '')
    || (campaign.template.htmlBody || campaign.template.body || '') !== (campaignState().campaignForm.htmlBody || '')
    || String(campaign.channelId || '') !== String(campaignState().campaignForm.channelId || '')
    || normalizedIdList(campaign.segmentIds) !== normalizedIdList(campaignState().campaignForm.segmentIds)
    || normalizedTemplateVariables(parseTemplateVariables(campaign.template.variablesJson, DEFAULT_TEMPLATE_VARIABLES)) !== normalizedTemplateVariables(campaignState().campaignForm.templateVariables)
})

export const campaignTrackingLinkDirty = computed(() => {
  const campaign = campaignState().selectedCampaign
  if (!campaign?.id) return false
  return (campaign.trackingLink?.targetUrl || '') !== (campaignState().campaignForm.trackingTargetUrl || '')
    || (campaign.trackingLink?.shortCode || '') !== (campaignState().campaignForm.trackingShortCode || '')
    || (campaign.trackingLink?.utmSource || '') !== (campaignState().campaignForm.trackingUtmSource || '')
    || (campaign.trackingLink?.utmMedium || '') !== (campaignState().campaignForm.trackingUtmMedium || '')
    || (campaign.trackingLink?.utmCampaign || '') !== (campaignState().campaignForm.trackingUtmCampaign || '')
    || (campaign.trackingLink?.utmContent || '') !== (campaignState().campaignForm.trackingUtmContent || '')
    || (campaign.trackingLink?.utmTerm || '') !== (campaignState().campaignForm.trackingUtmTerm || '')
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

export function campaignPrePushBlockReason() {
  if (!campaignState().selectedCampaign?.id) return '请先创建或选择活动'
  if (!campaignState().selectedCampaign.template) return '请先保存活动配置以写入邮件模板'
  if (templateMissingTrackingLinkParam.value) return REQUIRED_TRACKING_LINK_MESSAGE
  if (campaignSetupDirty.value) return '当前模板、通道或客群有未保存修改，请先保存活动配置'
  if (!campaignState().selectedCampaign.trackingLink) return '请先保存活动短链接配置'
  if (campaignTrackingLinkDirty.value) return '当前短链接配置有未保存修改，请先保存短链接配置'
  if (!campaignState().selectedCampaign.channelId) {
    return campaignState().campaignForm.channelId ? '请先保存活动配置以绑定推送通道' : '请先选择并保存推送通道'
  }
  if (!campaignState().selectedCampaign.segmentIds?.length) {
    return campaignState().campaignForm.segmentIds.length ? '请先保存活动配置以绑定客群' : '请先选择并保存客群'
  }
  return ''
}

export function campaignDraftAdvanceBlockReason() {
  if (campaignNextAction.value !== 'saveDraft') return ''
  if (!campaignState().selectedCampaign?.id) return '请先创建活动，并保存短链接配置、推送通道和客群'
  if (!campaignState().selectedCampaign.trackingLink) return '请先保存活动短链接配置'
  if (campaignTrackingLinkDirty.value) return '当前短链接配置有未保存修改，请先保存短链接配置'
  if (!campaignState().selectedCampaign.channelId) {
    return campaignState().campaignForm.channelId ? '请先保存活动配置以绑定推送通道' : '请先选择并保存推送通道'
  }
  if (!campaignState().selectedCampaign.segmentIds?.length) {
    return campaignState().campaignForm.segmentIds.length ? '请先保存活动配置以绑定客群' : '请先选择并保存客群'
  }
  if (campaignSetupDirty.value) return '当前模板、通道或客群有未保存修改，请先保存活动配置'
  return ''
}

export function isCampaignActionDisabled(action) {
  if (appState().loading || !campaignState().selectedCampaign?.id) return true
  if (action === 'prePush' && campaignPrePushBlockReason()) return true
  return campaignNextAction.value !== action
}

export function isCampaignAdvanceDisabled() {
  if (appState().loading || !campaignNextAction.value) return true
  if (campaignState().selectedCampaign?.id) return false
  return campaignNextAction.value !== 'saveDraft' || !campaignState().campaignForm.name.trim()
}

export function isCampaignStepDisabled(step) {
  return appState().loading || !campaignState().selectedCampaign?.id || !step?.rollback
}

export function campaignActionTitle(action) {
  if (!campaignState().selectedCampaign?.id) return '请先创建或选择活动'
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
  if (!campaignState().selectedCampaign?.id) return '请先创建或选择活动'
  if (campaignNextAction.value === 'prePush') {
    const reason = campaignPrePushBlockReason()
    if (reason) return reason
  }
  if (campaignNextAction.value === 'confirm') return '确认推送'
  return `确认完成当前步骤，并进入：${campaignNextActionLabel.value}`
}

export function campaignStepTitle(step) {
  if (!campaignState().selectedCampaign?.id) return '请先创建或选择活动'
  if (campaignCurrentStatus.value === 'CONFIRMED') return '推送完成后状态不可修改'
  if (step?.active) return '当前步骤'
  if (step?.rollback) return `回退到上一步：${step.label}`
  return '只能回退到上一步或确认进入下一步'
}

export function fillCampaignForm(campaign: Campaign): void {
  campaignState().selectedCampaign = campaign
  campaignState().campaignForm.name = campaign.name || ''
  campaignState().campaignForm.objective = campaign.objective || ''
  campaignState().campaignForm.subject = campaign.template?.subject || ''
  campaignState().campaignForm.fromName = campaign.template?.fromName || ''
  campaignState().campaignForm.htmlBody = campaign.template?.htmlBody || campaign.template?.body || ''
  campaignState().campaignForm.templateVariables = campaign.template
    ? parseTemplateVariables(campaign.template.variablesJson, DEFAULT_TEMPLATE_VARIABLES)
    : []
  syncCampaignTemplateVariables()
  campaignState().campaignForm.trackingTargetUrl = campaign.trackingLink?.targetUrl || ''
  campaignState().campaignForm.trackingShortCode = campaign.trackingLink?.shortCode || ''
  campaignState().campaignForm.trackingUtmSource = campaign.trackingLink?.utmSource || ''
  campaignState().campaignForm.trackingUtmMedium = campaign.trackingLink?.utmMedium || ''
  campaignState().campaignForm.trackingUtmCampaign = campaign.trackingLink?.utmCampaign || ''
  campaignState().campaignForm.trackingUtmContent = campaign.trackingLink?.utmContent || ''
  campaignState().campaignForm.trackingUtmTerm = campaign.trackingLink?.utmTerm || ''
  campaignState().campaignForm.channelId = campaign.channelId || ''
  campaignState().campaignForm.segmentIds = [...(campaign.segmentIds || [])]
  campaignState().segmentDropdownOpen = false
  campaignState().segmentDropdownQuery = ''
  campaignState().trackingLinkDialogOpen = false
  updateLocalTemplatePreview()
}

export function clearCampaignSelection(): void {
  campaignState().selectedCampaign = null
  campaignState().campaignForm = defaultCampaignForm()
  campaignState().segmentDropdownOpen = false
  campaignState().segmentDropdownQuery = ''
  campaignState().trackingLinkDialogOpen = false
  updateLocalTemplatePreview()
}

export function syncCampaignTemplateVariables(): void {
  campaignState().campaignForm.templateVariables = syncTemplateVariables({
    subject: campaignState().campaignForm.subject,
    htmlBody: campaignState().campaignForm.htmlBody,
    variables: campaignState().campaignForm.templateVariables
  })
  updateLocalTemplatePreview()
}

export async function loadTemplateVariableOptions(): Promise<void> {
  try {
    campaignState().templateVariableOptions = await campaignsApi.listTemplateVariables()
  } catch (error: unknown) {
    const err = error as { message?: string }
    campaignState().templateVariableOptions = []
    appState().error = `模板变量加载失败：${err.message}`
  }
}

export function updateLocalTemplatePreview(): void {
  const preview = renderTemplatePreview({
    subject: campaignState().campaignForm.subject,
    htmlBody: campaignState().campaignForm.htmlBody,
    variables: campaignState().campaignForm.templateVariables,
    runtimeVariables: {
      [REQUIRED_TRACKING_LINK_PARAM]: trackingShortUrl(campaignState().selectedCampaign?.trackingLink)
    }
  })
  campaignState().templatePreviewSubject = preview.subjectPreview || ''
  campaignState().templatePreviewHtml = preview.htmlPreview || ''
  campaignState().templatePreviewError = ''
}

export function templateVariablesJson(): string {
  syncCampaignTemplateVariables()
  return templateVariablesToJson(campaignState().campaignForm.templateVariables)
}

export function addTemplateVariable(): void {
  campaignState().campaignForm.templateVariables.push({
    key: '',
    label: '',
    sampleValue: '',
    required: false
  })
}

export function removeTemplateVariable(index: number): void {
  campaignState().campaignForm.templateVariables.splice(index, 1)
}

export async function insertTemplateVariable(variable: { key?: string }): Promise<void> {
  const key = String(variable?.key || '').trim()
  if (!key) return
  const placeholder = '${' + key + '}'
  const editor = document.getElementById('campaign-html-editor') as HTMLTextAreaElement | null
  if (!editor) {
    campaignState().campaignForm.htmlBody += placeholder
    syncCampaignTemplateVariables()
    return
  }
  const start = editor.selectionStart ?? campaignState().campaignForm.htmlBody.length
  const end = editor.selectionEnd ?? campaignState().campaignForm.htmlBody.length
  campaignState().campaignForm.htmlBody = `${campaignState().campaignForm.htmlBody.slice(0, start)}${placeholder}${campaignState().campaignForm.htmlBody.slice(end)}`
  syncCampaignTemplateVariables()
  await nextTick()
  editor.focus()
  editor.setSelectionRange(start + placeholder.length, start + placeholder.length)
}

export async function insertTrackingLinkVariable(): Promise<void> {
  await insertTemplateVariable({ key: REQUIRED_TRACKING_LINK_PARAM })
}

export async function insertCampaignFormVariable(field: keyof CampaignForm, variable: { key?: string }, elementId: string): Promise<void> {
  const key = String(variable?.key || '').trim()
  if (!key) return
  const placeholder = '${' + key + '}'
  const currentValue = String(campaignState().campaignForm[field] || '')
  const input = document.getElementById(elementId) as HTMLInputElement | null
  if (!input) {
    campaignState().campaignForm[field] = `${currentValue}${placeholder}`
    return
  }
  const start = input.selectionStart ?? currentValue.length
  const end = input.selectionEnd ?? currentValue.length
  campaignState().campaignForm[field] = `${currentValue.slice(0, start)}${placeholder}${currentValue.slice(end)}`
  await nextTick()
  input.focus()
  input.setSelectionRange(start + placeholder.length, start + placeholder.length)
}

export interface CampaignTemplatePayload {
  name: string
  objective: string
  subject: string
  fromName: string
  htmlBody: string
  variablesJson: string
}

export function campaignTemplatePayload(): CampaignTemplatePayload {
  syncCampaignTemplateVariables()
  return {
    name: campaignState().campaignForm.name,
    objective: campaignState().campaignForm.objective,
    subject: campaignState().campaignForm.subject,
    fromName: campaignState().campaignForm.fromName,
    htmlBody: campaignState().campaignForm.htmlBody,
    variablesJson: templateVariablesJson()
  }
}

export function campaignHtmlHasTrackingLinkParam(): boolean {
  const html = campaignState().campaignForm.htmlBody
  if (!html) return true
  return scanTemplateVariableKeys(html).includes(REQUIRED_TRACKING_LINK_PARAM)
}

export function validateCampaignTemplateTrackingLink(): boolean {
  const html = campaignState().campaignForm.htmlBody
  if (!html || campaignHtmlHasTrackingLinkParam()) return true
  campaignState().templatePreviewHtml = ''
  campaignState().templatePreviewSubject = ''
  campaignState().templatePreviewError = REQUIRED_TRACKING_LINK_MESSAGE
  appState().error = REQUIRED_TRACKING_LINK_MESSAGE
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
    targetUrl: campaignState().campaignForm.trackingTargetUrl,
    shortCode: campaignState().campaignForm.trackingShortCode,
    utmSource: campaignState().campaignForm.trackingUtmSource,
    utmMedium: campaignState().campaignForm.trackingUtmMedium,
    utmCampaign: campaignState().campaignForm.trackingUtmCampaign,
    utmContent: campaignState().campaignForm.trackingUtmContent,
    utmTerm: campaignState().campaignForm.trackingUtmTerm
  }
}

export function openTrackingLinkDialog(): void {
  if (!campaignState().selectedCampaign?.id) {
    appState().error = '请先创建或选择活动'
    return
  }
  campaignState().trackingLinkDialogOpen = true
}

export function closeTrackingLinkDialog(): void {
  campaignState().trackingLinkDialogOpen = false
}

export function openFinalConfirmDialog(): void {
  if (!campaignState().selectedCampaign?.id) {
    appState().error = '请先选择或创建活动'
    return
  }
  campaignState().finalConfirmDialogOpen = true
  appState().error = ''
}

export function closeFinalConfirmDialog(): void {
  campaignState().finalConfirmDialogOpen = false
}

export function filteredCampaignSegments(segments = segmentState().segments): Segment[] {
  const items = Array.isArray(segments) ? segments : []
  const keyword = campaignState().segmentDropdownQuery.trim().toLowerCase()
  if (!keyword) return items
  return items.filter((segment) =>
    [segment.name, segment.id, segment.description]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(keyword))
  )
}

export function selectedCampaignSegments(segments = segmentState().segments): Segment[] {
  const items = Array.isArray(segments) ? segments : []
  return campaignState().campaignForm.segmentIds
    .map((id) => items.find((segment) => segment.id === id))
    .filter((s): s is Segment => Boolean(s))
}

export function isCampaignSegmentSelected(segmentId: string | number): boolean {
  return campaignState().campaignForm.segmentIds.includes(segmentId)
}

export function toggleCampaignSegment(segmentId: string | number): void {
  if (isCampaignSegmentSelected(segmentId)) {
    campaignState().campaignForm.segmentIds = campaignState().campaignForm.segmentIds.filter((id) => id !== segmentId)
    return
  }
  campaignState().campaignForm.segmentIds = [...campaignState().campaignForm.segmentIds, segmentId]
}

export function removeCampaignSegment(segmentId: string | number): void {
  campaignState().campaignForm.segmentIds = campaignState().campaignForm.segmentIds.filter((id) => id !== segmentId)
}

export function normalizeEmailInput(email: unknown): string {
  return String(email || '').trim().toLowerCase()
}

export function isTestCustomerSelected(customerId: string | number): boolean {
  return campaignState().selectedTestCustomerIds.includes(String(customerId))
}

export function toggleTestCustomer(customer: Customer): void {
  const customerId = String(customer?.id || '')
  if (!customerId || !customer.email) return
  if (isTestCustomerSelected(customerId)) {
    campaignState().selectedTestCustomerIds = campaignState().selectedTestCustomerIds.filter((item) => item !== customerId)
    return
  }
  campaignState().selectedTestCustomerIds = [...campaignState().selectedTestCustomerIds, customerId]
}

export async function loadTestCustomers(): Promise<void> {
  try {
    const query = new URLSearchParams({
      page: '0',
      size: '20',
      sort: 'createdAt:desc'
    })
    const keyword = campaignState().testCustomerQuery.trim()
    if (keyword) query.set('q', keyword)
    const result = await customersApi.searchWithEmail(query.toString())
    const pageResult = normalizePageResult<Customer>(result, [], 0, 20)
    campaignState().testCustomers = pageResult.items
  } catch (error: unknown) {
    const err = error as { message?: string }
    campaignState().testCustomers = []
    appState().error = `测试客户加载失败：${err.message}`
  }
}

export async function openTestCustomerDialog(): Promise<void> {
  if (!campaignState().selectedCampaign?.id) {
    appState().error = '请先选择或创建活动'
    return
  }
  campaignState().testCustomerDialogOpen = true
  appState().error = ''
  await loadTestCustomers()
}

export function closeTestCustomerDialog(): void {
  campaignState().testCustomerDialogOpen = false
}

export async function loadCampaigns(page = campaignState().campaignPage.page): Promise<void> {
  try {
    const result = await campaignsApi.list(pageQuery(campaignState().campaignPage, page))
    const pageResult = normalizePageResult<Campaign>(result, [], page, campaignState().campaignPage.size)
    campaignState().campaigns = pageResult.items
    campaignState().campaignPage = pageResult
    if (campaignState().selectedCampaign && !pageResult.items.some((item) => item.id === campaignState().selectedCampaign!.id)) {
      clearCampaignSelection()
    }
    if (campaignState().selectedCampaign) {
      campaignState().selectedCampaign = pageResult.items.find((item) => item.id === campaignState().selectedCampaign!.id) || null
    }
    if (!pageResult.items.length) {
      clearCampaignSelection()
    }
  } catch (error: unknown) {
    const err = error as { message?: string }
    campaignState().campaigns = []
    campaignState().campaignPage = emptyPageResult<Campaign>(0, campaignState().campaignPage.size)
    clearCampaignSelection()
    appState().error = `活动加载失败：${err.message}`
  }
}

export async function loadCampaignDetail(campaignId: string | number): Promise<void> {
  if (!campaignId) return
  if (campaignState().selectedCampaign?.id === campaignId) return
  appState().loading = true
  appState().error = ''
  try {
    const campaign = await campaignsApi.get(campaignId)
    fillCampaignForm(campaign)
    const existingIndex = campaignState().campaigns.findIndex((item) => item.id === campaign.id)
    if (existingIndex >= 0) {
      campaignState().campaigns.splice(existingIndex, 1, campaign)
    } else {
      campaignState().campaigns = [campaign, ...campaignState().campaigns]
    }
  } catch (error: unknown) {
    const err = error as { message?: string }
    clearCampaignSelection()
    appState().error = `活动详情加载失败：${err.message}`
  } finally {
    appState().loading = false
  }
}

export async function createCampaign(): Promise<void> {
  appState().loading = true
  appState().error = ''
  appState().notice = ''
  try {
    const campaign = await campaignsApi.create({ name: campaignState().campaignForm.name, objective: campaignState().campaignForm.objective })
    campaignState().selectedCampaign = campaign
    fillCampaignForm(campaign)
    await loadCampaigns()
    appState().notice = '邮件活动已创建'
  } catch (error: unknown) {
    const err = error as { message?: string }
    appState().error = `活动创建失败：${err.message}`
  } finally {
    appState().loading = false
  }
}

export async function deleteCampaign(campaign: Campaign): Promise<void> {
  if (!campaign?.id) return
  if (!window.confirm(`确认删除邮件活动「${campaign.name || campaign.id}」？此操作会同时清理该活动的推送记录和追踪数据。`)) return
  appState().loading = true
  appState().error = ''
  appState().notice = ''
  try {
    await campaignsApi.remove(campaign.id)
    if (campaignState().selectedCampaign?.id === campaign.id) {
      clearCampaignSelection()
    }
    const nextPage = campaignState().campaigns.length === 1 && campaignState().campaignPage.page > 0
      ? campaignState().campaignPage.page - 1
      : campaignState().campaignPage.page
    await loadCampaigns(nextPage)
    appState().notice = '邮件活动已删除'
  } catch (error: unknown) {
    const err = error as { message?: string }
    appState().error = `活动删除失败：${err.message}`
  } finally {
    appState().loading = false
  }
}

export async function saveCampaignSetup(): Promise<void> {
  if (!validateCampaignTemplateTrackingLink()) return
  if (!campaignState().selectedCampaign?.id) {
    await createCampaign()
  }
  const campaignId = campaignState().selectedCampaign?.id
  if (!campaignId) return
  appState().loading = true
  appState().error = ''
  appState().notice = ''
  try {
    let campaign = await campaignsApi.updateTemplate(campaignId, campaignTemplatePayload())
    if (campaignState().campaignForm.channelId) {
      campaign = await campaignsApi.updateChannel(campaignId, campaignState().campaignForm.channelId)
    }
    if (campaignState().campaignForm.segmentIds.length) {
      campaign = await campaignsApi.updateSegments(campaignId, campaignState().campaignForm.segmentIds)
    }
    fillCampaignForm(campaign)
    await loadCampaigns()
    appState().notice = '活动配置已保存'
  } catch (error: unknown) {
    const err = error as { message?: string }
    appState().error = `活动配置保存失败：${err.message}`
  } finally {
    appState().loading = false
  }
}

async function saveCampaignDraftForAdvance(): Promise<Campaign | null> {
  if (!validateCampaignTemplateTrackingLink()) return null
  let campaign = campaignState().selectedCampaign
  if (!campaign?.id) {
    campaign = await campaignsApi.create({ name: campaignState().campaignForm.name, objective: campaignState().campaignForm.objective })
    campaignState().selectedCampaign = campaign
  }
  const campaignId = campaign.id
  campaign = await campaignsApi.updateTemplate(campaignId, campaignTemplatePayload())
  fillCampaignForm(campaign)
  await loadCampaigns()
  return campaign
}

export async function saveCampaignTrackingLink(): Promise<void> {
  if (!campaignState().selectedCampaign?.id) {
    appState().error = '请先创建或选择活动'
    return
  }
  const campaignId = campaignState().selectedCampaign.id
  appState().loading = true
  appState().error = ''
  appState().notice = ''
  try {
    const campaign = await campaignsApi.updateTrackingLink(campaignId, campaignTrackingLinkPayload())
    fillCampaignForm(campaign)
    await loadCampaigns()
    campaignState().trackingLinkDialogOpen = false
    appState().notice = '短链接配置已保存'
  } catch (error: unknown) {
    const err = error as { message?: string }
    appState().error = `短链接配置保存失败：${err.message}`
  } finally {
    appState().loading = false
  }
}

export async function previewCampaignTemplate(): Promise<void> {
  if (!validateCampaignTemplateTrackingLink()) return
  if (!campaignState().selectedCampaign?.id) {
    updateLocalTemplatePreview()
    return
  }
  const campaignId = campaignState().selectedCampaign.id
  campaignState().templatePreviewLoading = true
  campaignState().templatePreviewError = ''
  try {
    const result = await campaignsApi.previewTemplate(campaignId, campaignTemplatePayload())
    campaignState().templatePreviewSubject = result.subjectPreview || ''
    campaignState().templatePreviewHtml = result.htmlPreview || ''
  } catch (error: unknown) {
    const err = error as { message?: string }
    campaignState().templatePreviewHtml = ''
    campaignState().templatePreviewSubject = ''
    campaignState().templatePreviewError = err.message || '模板预览失败'
  } finally {
    campaignState().templatePreviewLoading = false
  }
}

interface CampaignActionOptions {
  confirmedTestCustomers?: boolean
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
  if (!campaignState().selectedCampaign?.id) {
    appState().error = '请先选择或创建活动'
    return
  }
  if (campaignNextAction.value !== action) {
    appState().error = campaignActionTitle(action)
    return
  }
  if (action === 'prePush') {
    const reason = campaignPrePushBlockReason()
    if (reason) {
      appState().error = reason
      return
    }
  }
  if (action === 'simulateSend' && !options.confirmedTestCustomers) {
    await openTestCustomerDialog()
    return
  }
  if (action === 'simulateSend' && !campaignState().selectedTestCustomerIds.length) {
    appState().error = '请选择至少一个测试客户'
    return
  }
  appState().loading = true
  appState().error = ''
  appState().notice = ''
  try {
    const campaignId = campaignState().selectedCampaign.id
    const body = action === 'simulateSend' ? { customerIds: campaignState().selectedTestCustomerIds } : {}
    const campaign = await campaignsApi.action(campaignId, action as CampaignActionKey, body)
    fillCampaignForm(campaign)
    await loadCampaigns()
    if (action === 'simulateSend') {
      closeTestCustomerDialog()
      campaignState().selectedTestCustomerIds = []
      appState().notice = '模拟发送成功'
    } else {
      appState().notice = '活动状态已更新'
    }
  } catch (error: unknown) {
    const err = error as { message?: string }
    appState().error = `活动操作失败：${err.message}`
  } finally {
    appState().loading = false
  }
}

export async function advanceCampaignStep(options: CampaignActionOptions = {}): Promise<void> {
  if (!campaignNextAction.value) {
    appState().error = '当前活动生命周期已完成'
    return
  }
  if (!campaignState().selectedCampaign?.id && campaignNextAction.value !== 'saveDraft') {
    appState().error = '请先选择或创建活动'
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
    appState().error = draftBlockReason
    return
  }
  appState().loading = true
  appState().error = ''
  appState().notice = ''
  try {
    const campaign = await saveCampaignDraftForAdvance()
    if (!campaign) return
    appState().notice = `已确认并进入下一步：${campaignCurrentStatusLabel.value}`
  } catch (error: unknown) {
    const err = error as { message?: string }
    appState().error = `活动状态推进失败：${err.message}`
  } finally {
    appState().loading = false
  }
}

export async function confirmTestSimulation(): Promise<void> {
  if (!campaignState().selectedTestCustomerIds.length) {
    appState().error = '请选择至少一个测试客户'
    return
  }
  await advanceCampaignStep({ confirmedTestCustomers: true })
}

export async function confirmFinalPush(): Promise<void> {
  closeFinalConfirmDialog()
  await runCampaignAction('confirm', { confirmedFinalPush: true })
}

export async function rollbackCampaignStep(step: CampaignStep | null | undefined): Promise<void> {
  if (!campaignState().selectedCampaign?.id) {
    appState().error = '请先选择或创建活动'
    return
  }
  if (!step?.rollback) {
    appState().error = campaignStepTitle(step)
    return
  }
  appState().loading = true
  appState().error = ''
  appState().notice = ''
  try {
    const campaign = await campaignsApi.rollback(campaignState().selectedCampaign.id, {
      expectedStatus: campaignCurrentStatus.value,
      targetStatus: step.status
    })
    fillCampaignForm(campaign)
    await loadCampaigns()
    appState().notice = `已回退到上一步：${campaignCurrentStatusLabel.value}`
  } catch (error: unknown) {
    const err = error as { message?: string }
    appState().error = `活动状态回退失败：${err.message}`
  } finally {
    appState().loading = false
  }
}

export function changeCampaignPage(nextPage: number): void {
  if (nextPage < 0 || (campaignState().campaignPage.totalPages && nextPage >= campaignState().campaignPage.totalPages)) return
  loadCampaigns(nextPage)
}

export function jumpCampaignPage(pageNumber: number | string): void {
  const nextPage = boundedPage(campaignState().campaignPage, pageNumber)
  if (nextPage === null || nextPage === campaignState().campaignPage.page) return
  loadCampaigns(nextPage)
}

export function changeCampaignPageSize(size: number | string): void {
  const nextSize = Number(size)
  if (!nextSize) return
  campaignState().campaignPage.size = nextSize
  loadCampaigns(0)
}
