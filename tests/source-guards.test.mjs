import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'

function readSourceFiles(directoryUrl) {
  return readdirSync(directoryUrl, { withFileTypes: true })
    .flatMap((entry) => {
      const entryUrl = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directoryUrl)
      if (entry.isDirectory()) return readSourceFiles(entryUrl)
      return entry.name.endsWith('.js') || entry.name.endsWith('.ts') || entry.name.endsWith('.vue')
        ? [readFileSync(entryUrl, 'utf8')]
        : []
    })
}

const source = readSourceFiles(new URL('../src/', import.meta.url)).join('\n')
const defaultCampaignFormSource = source.match(/function defaultCampaignForm\(\)[\s\S]*?\n\}/)?.[0] || ''

assert(
  !/catch\s*\{[\s\S]*state\.customers\s*=\s*demoCustomers/.test(source),
  'loadCustomers must not replace failed API responses with demoCustomers'
)

assert(
  /function changeCustomerPageSize\([^)]*\)[^{]*\{[\s\S]*loadCustomers\(0\)/.test(source) &&
    !/function changeCustomerPageSize\([^)]*\)[^{]*\{[\s\S]*nextSize === state\.customerPage\.size[\s\S]*loadCustomers\(0\)/.test(source),
  'customer page-size changes must immediately reload the first page'
)

assert(
  /extractApiErrorMessage\(response, text\)/.test(source) &&
    /JSON\.parse\(text\)/.test(source) &&
    /parsed\.detail/.test(source),
  'API request failures must prefer backend ProblemDetail.detail over generic HTTP or auth messages'
)

assert(
  /function changeChannelPageSize\([^)]*\)[^{]*\{[\s\S]*loadChannels\(0\)/.test(source) &&
    !/function changeChannelPageSize\([^)]*\)[^{]*\{[\s\S]*nextSize === state\.channelPage\.size[\s\S]*loadChannels\(0\)/.test(source),
  'channel page-size changes must immediately reload the first page'
)

assert(
  /async function deleteChannel\(channel[^)]*\)[\s\S]*\/api\/channels\/\$\{channel\.id\}[\s\S]*method: 'DELETE'[\s\S]*await loadChannels\(/.test(source) &&
    /@click="deleteChannel\(channel\)"/.test(source) &&
    /删除/.test(source),
  'push channel page must support deleting configured channels through DELETE /api/channels/{id}'
)

assert(
  /editingChannelId:\s*null/.test(source) &&
    /function editChannel\(channel[^)]*\)[\s\S]*editingChannelId = channel\.id/.test(source) &&
    /async function saveChannel\(\)[\s\S]*\/api\/channels\/email\/smtp\/\$\{channelStore\.editingChannelId\}[\s\S]*method: channelStore\.editingChannelId \? 'PUT' : 'POST'/.test(source) &&
    /@click="editChannel\(channel\)"/.test(source) &&
    /cancelChannelEdit/.test(source),
  'push channel page must support editing configured channels through PUT and allow cancelling edit mode'
)

assert(
  /request\('\/api\/customers\/summary'\)/.test(source),
  'dashboard customer totals must be loaded from /api/customers/summary'
)

assert(
  /request\('\/api\/segments\/summary'\)/.test(source),
  'dashboard customer segment readiness must be loaded from /api/segments/summary'
)

assert(
  !/德国有邮箱旅行社|德国市场第一批可触达旅行社/.test(source) &&
    /segmentForm:\s*\{[\s\S]*name: ''[\s\S]*description: ''[\s\S]*rules: \[\]/.test(source) &&
    /function resetSegmentForm\(\)[\s\S]*name: ''[\s\S]*description: ''[\s\S]*rules: \[\]/.test(source),
  'new customer segment form must not default name, description, or dynamic rules'
)

assert(
  /customerCountryStats/.test(source) &&
    /customersByCountry/.test(source) &&
    /客户资产国家分布/.test(source) &&
    /country-stat-row/.test(source),
  'dashboard must render customer asset statistics grouped by country'
)

assert(
  /customersByEmailQuality/.test(source) &&
    /customersByContactStatus/.test(source) &&
    /数据质量/.test(source) &&
    /触达准备度/.test(source) &&
    /可触达客户/.test(source) &&
    /不可触达客户/.test(source),
  'dashboard must render P0 customer quality and reachability analysis'
)

assert(
  /segmentSummary/.test(source) &&
    /客群准备度/.test(source) &&
    /reachableMemberCount/.test(source) &&
    /topSegments/.test(source),
  'dashboard must render P0 customer segment readiness analysis'
)

assert(
  !/const withEmail = state\.customers\.filter/.test(source) &&
    !/const pending = state\.customers\.filter/.test(source),
  'dashboard customer totals must not be calculated from the current customer page'
)

assert(
  /\/api\/customers\/\$\{customer\.id\}\/email-quality/.test(source),
  'customer asset page must call the email quality update endpoint'
)

assert(
  /openCustomerCreate/.test(source) &&
    /手动录入/.test(source) &&
    /request\('\/api\/customers'[\s\S]*method: 'POST'/.test(source),
  'customer asset page must support manually creating customers through POST /api/customers'
)

assert(
  /updateEmailQuality/.test(source) && /VERIFIED/.test(source),
  'customer asset page must expose manual email quality updates'
)

assert(
  /\/api\/campaigns\/\$\{campaignId\}\/template\/preview/.test(source),
  'mail campaign template editor must call the backend template preview endpoint'
)

assert(
  /templatePreviewHtml/.test(source) && /<iframe[\s\S]+:srcdoc="state\.templatePreviewHtml/.test(source),
  'mail campaign template editor must render preview HTML through an iframe srcdoc'
)

assert(
  /addTemplateVariable/.test(source) && /insertTemplateVariable/.test(source) && /const placeholder = '\$\{' \+ key \+ '\}'/.test(source),
  'mail campaign template editor must support variable form rows and FreeMarker placeholder insertion'
)

assert(
  /CAMPAIGN_LIFECYCLE_STEPS/.test(source) &&
    /campaign-lifecycle-flow/.test(source) &&
    /确认推送/.test(source),
  'mail campaign page must render a linear lifecycle flow for status management'
)

assert(
    /key: 'campaign-list'/.test(source) &&
    /state\.activeNav === 'campaign-list'/.test(source) &&
    /function openCampaignDetail\(campaign[^)]*\)[\s\S]*fillCampaignForm\(campaign\)[\s\S]*activateNav\('campaigns'[^)]*\)/.test(source) &&
    !/<div class="campaign-list">/.test(source),
  'mail campaign list must be a standalone page with a jump action into the campaign detail editor'
)

assert(
  /import router from '\.\.\/router'/.test(source) &&
    /ACTIVE_NAV_STORAGE_KEY = 'travel_admin_active_nav'/.test(source) &&
    /CUSTOMER_TOOL_STORAGE_KEY = 'travel_admin_customer_tool'/.test(source) &&
    /ADMIN_NAV_QUERY_KEY = 'nav'/.test(source) &&
    /function initialAdminNav\(\)[\s\S]*resolveNavigationFromLocation\(window\.location\.pathname, queryNav\)[\s\S]*localStorage\.getItem\(ACTIVE_NAV_STORAGE_KEY\)[\s\S]*'dashboard'/.test(source) &&
    /activeNav: initialAdminNav\(\)/.test(source) &&
    /function activateNav\(nav[^)]*\)[\s\S]*persistNavigationState\([^)]*\)[\s\S]*router\.push\(navToPath\(nav, [^)]*customerTool\)\)/.test(source) &&
    /function normalizeActiveNavAccess\(\)/.test(source) &&
    /function syncNavigationFromRoute\(pathname[^)]*queryNav = ''[^)]*\)[\s\S]*resolveNavigationFromLocation\(pathname, queryNav\)/.test(source) &&
    /if \(appStore\.token\) \{[\s\S]*normalizeActiveNavAccess\(\)[\s\S]*refreshAll\(\)/.test(source) &&
    /router\.replace\(navToPath\([^)]*activeNav, [^)]*customerTool\)\)/.test(source) &&
    /router\.replace\('\/login'\)/.test(source),
  'admin must restore deep-linked or saved navigation and normalize inaccessible pages after refresh'
)

assert(
  /router\.isReady\(\)\.then\(\(\) => \{[\s\S]*app\.mount\('#app'\)[\s\S]*\}\)/.test(source),
  'admin must wait for the initial Vue Router navigation before mounting so page refresh preserves the current path'
)

assert(
  /function clearCampaignSelection\(\)[\s\S]*campaignStore\.selectedCampaign = null[\s\S]*campaignStore\.campaignForm = defaultCampaignForm\(\)/.test(source) &&
    /async function loadCampaigns\(page = campaignStore\.campaignPage\.page\)[\s\S]*pageResult\.items\.some\(\(item\) => item\.id === campaignStore\.selectedCampaign[^)]*\.id\)[\s\S]*clearCampaignSelection\(\)[\s\S]*catch \(error[^)]*\) \{[\s\S]*clearCampaignSelection\(\)/.test(source),
  'mail campaign loading must clear selectedCampaign and stale form data when the tenant-scoped list no longer contains it'
)

assert(
  /name: ''[\s\S]*objective: ''[\s\S]*subject: ''[\s\S]*fromName: ''[\s\S]*htmlBody: ''[\s\S]*templateVariables: \[\][\s\S]*trackingTargetUrl: ''[\s\S]*trackingShortCode: ''[\s\S]*trackingUtmSource: ''[\s\S]*trackingUtmMedium: ''[\s\S]*trackingUtmCampaign: ''[\s\S]*trackingUtmContent: ''/.test(defaultCampaignFormSource) &&
    !/pioneerChinaEmailTemplate/.test(source) &&
    !/先锋中国行程推广邮件|China Discovery from US\$399\+|travel-agency-partnership|china-trip/.test(defaultCampaignFormSource),
  'new mail campaign forms must not be prefilled with demo campaign defaults'
)

assert(
  /function fillCampaignForm\(campaign[^)]*\)[\s\S]*campaignStore\.campaignForm\.subject = campaign\.template\?\.subject \|\| ''[\s\S]*campaignStore\.campaignForm\.htmlBody = campaign\.template\?\.htmlBody \|\| campaign\.template\?\.body \|\| ''[\s\S]*campaign\.template[\s\S]*parseTemplateVariables\(campaign\.template\.variablesJson, DEFAULT_TEMPLATE_VARIABLES\)[\s\S]*: \[\][\s\S]*campaignStore\.campaignForm\.trackingTargetUrl = campaign\.trackingLink\?\.targetUrl \|\| ''[\s\S]*campaignStore\.campaignForm\.trackingUtmCampaign = campaign\.trackingLink\?\.utmCampaign \|\| ''/.test(source),
  'mail campaign detail forms must not inherit template or short-link fields from stale/default form state'
)

assert(
  !/placeholder="https:\/\/www\.example\.com\/travel-agency-partnership"|placeholder="china-trip"|placeholder="1780118309231001"|placeholder="template_a"/.test(source),
  'mail campaign short-link dialog must not show demo tracking parameters as placeholders'
)

assert(
  /const CAMPAIGN_NEXT_ACTION_BY_STATUS[\s\S]*DRAFT: 'saveDraft'[\s\S]*CONFIGURED: 'simulateSend'[\s\S]*SIMULATED: 'prePush'[\s\S]*PREVIEW_GENERATED: 'confirm'/.test(source) &&
    /const CAMPAIGN_STATUS_LABELS[\s\S]*CONFIGURED: '模拟发送'/.test(source) &&
    !/review: '审核通过'/.test(source) &&
    !/\/api\/campaigns\/\$\{campaignId\}\/review/.test(source) &&
    /rollback: campaignCurrentStatus\.value !== 'CONFIRMED' && index === currentIndex - 1/.test(source) &&
    /\/api\/campaigns\/\$\{campaignStore\.selectedCampaign\.id\}\/rollback/.test(source) &&
    /isCampaignStepDisabled\(step\)/.test(source) &&
    /推送完成后状态不可修改/.test(source) &&
    /只能回退到上一步或确认进入下一步/.test(source),
  'mail campaign lifecycle must only allow rollback to the previous step before final push and lock confirmed campaigns'
)

assert(
  /function campaignPrePushBlockReason\(\)[\s\S]*!campaignStore\.selectedCampaign\.channelId[\s\S]*请先保存活动配置以绑定推送通道/.test(source) &&
    /campaignNextAction\.value === 'prePush'[\s\S]*campaignPrePushBlockReason\(\)/.test(source) &&
    /runCampaignAction\([^)]*\)[\s\S]*appStore\.error = reason/.test(source),
  'mail campaign pre-push must require saved template, channel, and segment setup before calling the backend'
)

assert(
    /function campaignDraftAdvanceBlockReason\(\)[\s\S]*campaignNextAction\.value !== 'saveDraft'[\s\S]*请先创建活动，并保存短链接配置、推送通道和客群[\s\S]*!.*selectedCampaign\.trackingLink[\s\S]*请先保存活动短链接配置[\s\S]*campaignTrackingLinkDirty\.value[\s\S]*当前短链接配置有未保存修改[\s\S]*!.*selectedCampaign\.channelId[\s\S]*请先选择并保存推送通道[\s\S]*!.*selectedCampaign\.segmentIds\?\.length[\s\S]*请先选择并保存客群[\s\S]*campaignSetupDirty\.value[\s\S]*当前模板、通道或客群有未保存修改/.test(source) &&
    /campaignAdvanceTitle\(\)[\s\S]*campaignNextAction\.value === 'saveDraft'[\s\S]*campaignDraftAdvanceBlockReason\(\)/.test(source) &&
    /advanceCampaignStep\([^)]*\)[\s\S]*const draftBlockReason = campaignDraftAdvanceBlockReason\(\)[\s\S]*(state|appStore)\.error = draftBlockReason[\s\S]*return/.test(source),
  'mail campaign draft confirmation must require saved short-link, channel, and segment configuration before entering the next lifecycle step'
)

assert(
    /function isCampaignAdvanceDisabled\(\)[\s\S]*if \(campaignStore\.selectedCampaign\?\.id\) return false[\s\S]*campaignNextAction\.value !== 'saveDraft'/.test(source) &&
    /async function saveCampaignDraftForAdvance\(\)[\s\S]*\/api\/campaigns'[\s\S]*\/template`[\s\S]*fillCampaignForm\(campaign\)/.test(source) &&
    !/async function saveCampaignDraftForAdvance\(\)[\s\S]*请先选择推送通道[\s\S]*\/template`/.test(source) &&
    !/async function saveCampaignDraftForAdvance\(\)[\s\S]*\/tracking-link`[\s\S]*\/channel`[\s\S]*\/segments`/.test(source) &&
    /advanceCampaignStep\([^)]*\)[\s\S]*campaignNextAction\.value !== 'saveDraft'[\s\S]*const campaign = await saveCampaignDraftForAdvance\(\)/.test(source) &&
    !/advanceCampaignStep\([^)]*\)[\s\S]*\/advance`/.test(source),
  'mail campaign lifecycle advance must keep the draft-step button clickable, persist the draft template first, and never call the generic advance endpoint'
)

assert(
  /function runCampaignAction\([^)]*\)[\s\S]*\/simulate-send`/.test(source) &&
    /function runCampaignAction\([^)]*\)[\s\S]*\/pre-push`/.test(source) &&
    /function runCampaignAction\([^)]*\)[\s\S]*\/confirm`/.test(source) &&
    /advanceCampaignStep\([^)]*\)[\s\S]*runCampaignAction\(campaignNextAction\.value, options\)/.test(source),
  'mail campaign lifecycle confirmation must call independent business endpoints for simulation, pre-push generation, and final push'
)

assert(
  /key: 'tracking'/.test(source) &&
    /label: '短链统计'/.test(source) &&
    /\/api\/tracking\/analytics\/summary/.test(source) &&
    /\/api\/tracking\/analytics\/timeseries/.test(source) &&
    /\/api\/tracking\/analytics\/by-link/.test(source) &&
    /\/api\/tracking\/analytics\/events/.test(source),
  'admin must expose a short-link analytics page backed by tracking analytics APIs'
)

assert(
  /trackingShortUrl/.test(source) &&
    /复制短链/.test(source),
  'mail campaign pre-push records must show generated tracking short links'
)

assert(
  /\/api\/campaigns\/\$\{campaignId\}\/tracking-link/.test(source) &&
    /trackingTargetUrl/.test(source) &&
    /trackingShortCode/.test(source) &&
    /trackingUtmCampaign/.test(source),
  'mail campaign setup must save required campaign tracking short-link configuration'
)

assert(
    /testEmailDialogOpen/.test(source) &&
    /\/api\/campaigns\/test-emails/.test(source) &&
    /deleteTestEmail/.test(source) &&
    /testEmails: campaignStore\.selectedTestEmails/.test(source) &&
    /action === 'simulateSend' && !options\.confirmedTestEmails/.test(source) &&
    /action === 'simulateSend'[\s\S]*closeTestEmailDialog\(\)[\s\S]*campaignStore\.selectedTestEmails = \[\][\s\S]*模拟发送成功/.test(source) &&
    /advanceCampaignStep\(\{ confirmedTestEmails: true \}\)/.test(source) &&
    /选择测试邮箱/.test(source) &&
    /模拟发送到测试邮箱/.test(source),
  'mail campaign simulation must open the persisted tenant test email dialog, close it after success, and show a success notice'
)

assert(
  /finalConfirmDialogOpen/.test(source) &&
    /campaignNextAction\.value === 'confirm' && !options\.confirmedFinalPush/.test(source) &&
    /openFinalConfirmDialog\(\)/.test(source) &&
    /async function confirmFinalPush\(\)[\s\S]*runCampaignAction\('confirm'/.test(source) &&
    /确认后将发送未推送完成的邮件记录/.test(source) &&
    /campaignAdvanceButtonLabel/.test(source),
  'mail campaign final confirm must use a second confirmation dialog and call the direct confirm action'
)

assert(
    /REQUIRED_TRACKING_LINK_PARAM = 'trackingLink'/.test(source) &&
    /REQUIRED_TRACKING_LINK_MESSAGE = 'HTML 模板必须包含短链参数 \$\{trackingLink\}'/.test(source) &&
    /function validateCampaignTemplateTrackingLink\(\)[\s\S]*campaignStore\.templatePreviewError = REQUIRED_TRACKING_LINK_MESSAGE/.test(source) &&
    /<h3>短链与变量配置<\/h3>[\s\S]*tracking-link-dock[\s\S]*v-if="templateMissingTrackingLinkParam"[\s\S]*requiredTrackingLinkMessage/.test(source) &&
    /editableTemplateVariableRows[\s\S]*REQUIRED_TRACKING_LINK_PARAM/.test(source) &&
    /v-for="item in editableTemplateVariableRows"/.test(source) &&
    !/<textarea[\s\S]*id="campaign-html-editor"[\s\S]*<\/textarea>\s*<div v-if="templateMissingTrackingLinkParam"/.test(source),
  'mail campaign variable config panel must require trackingLink without repeating it in the variable list'
)

assert(
  /segmentDropdownOpen/.test(source) &&
    /campaign-segment-dropdown/.test(source) &&
    /toggleCampaignSegment/.test(source) &&
    !/<select v-model="state\.campaignForm\.segmentIds" multiple>/.test(source),
  'mail campaign customer segments must use a searchable dropdown multi-select, not native select multiple'
)

assert(
  /function filteredCampaignSegments\(segments = segmentStore\.segments\)/.test(source) &&
    /function selectedCampaignSegments\(segments = segmentStore\.segments\)/.test(source),
  'campaign segment dropdown helpers must default to the loaded segment store when called from the view'
)
