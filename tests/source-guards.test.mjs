import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8')

assert(
  !/catch\s*\{[\s\S]*state\.customers\s*=\s*demoCustomers/.test(source),
  'loadCustomers must not replace failed API responses with demoCustomers'
)

assert(
  /function changeCustomerPageSize\(size\) \{[\s\S]*loadCustomers\(0\)/.test(source) &&
    !/function changeCustomerPageSize\(size\) \{[\s\S]*nextSize === state\.customerPage\.size[\s\S]*loadCustomers\(0\)/.test(source),
  'customer page-size changes must immediately reload the first page'
)

assert(
  /function changeChannelPageSize\(size\) \{[\s\S]*loadChannels\(0\)/.test(source) &&
    !/function changeChannelPageSize\(size\) \{[\s\S]*nextSize === state\.channelPage\.size[\s\S]*loadChannels\(0\)/.test(source),
  'channel page-size changes must immediately reload the first page'
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
    /最终确认发送/.test(source),
  'mail campaign page must render a linear lifecycle flow for status management'
)

assert(
  /key: 'campaign-list'/.test(source) &&
    /state\.activeNav === 'campaign-list'/.test(source) &&
    /function openCampaignDetail\(campaign\)[\s\S]*fillCampaignForm\(campaign\)[\s\S]*state\.activeNav = 'campaigns'/.test(source) &&
    !/<div class="campaign-list">/.test(source),
  'mail campaign list must be a standalone page with a jump action into the campaign detail editor'
)

assert(
  /function clearCampaignSelection\(\)[\s\S]*state\.selectedCampaign = null[\s\S]*state\.campaignForm = defaultCampaignForm\(\)/.test(source) &&
    /async function loadCampaigns\(page = state\.campaignPage\.page\) \{[\s\S]*pageResult\.items\.some\(\(item\) => item\.id === state\.selectedCampaign\.id\)[\s\S]*clearCampaignSelection\(\)[\s\S]*catch \(error\) \{[\s\S]*clearCampaignSelection\(\)/.test(source),
  'mail campaign loading must clear selectedCampaign and stale form data when the tenant-scoped list no longer contains it'
)

assert(
  /const CAMPAIGN_NEXT_ACTION_BY_STATUS[\s\S]*REVIEW_APPROVED: 'simulateSend'[\s\S]*SIMULATED: 'confirm'/.test(source) &&
    /rollback: index === currentIndex - 1/.test(source) &&
    /\/api\/campaigns\/\$\{state\.selectedCampaign\.id\}\/rollback/.test(source) &&
    /isCampaignStepDisabled\(step\)/.test(source) &&
    /只能回退到上一步或确认进入下一步/.test(source),
  'mail campaign lifecycle must only allow rollback to the previous step or advancing one step'
)

assert(
  /function campaignPrePushBlockReason\(\)[\s\S]*!state\.selectedCampaign\.channelId[\s\S]*请先保存活动配置以绑定推送通道/.test(source) &&
    /campaignNextAction\.value === 'prePush'[\s\S]*campaignPrePushBlockReason\(\)/.test(source) &&
    /advanceCampaignStep\(\)[\s\S]*state\.error = reason/.test(source),
  'mail campaign pre-push must require saved template, channel, and segment setup before calling the backend'
)

assert(
  /function isCampaignAdvanceDisabled\(\)[\s\S]*if \(state\.selectedCampaign\?\.id\) return false[\s\S]*campaignNextAction\.value !== 'prePush'/.test(source) &&
    /async function saveCampaignDraftForAdvance\(\)[\s\S]*\/api\/campaigns'[\s\S]*\/template`[\s\S]*\/tracking-link`[\s\S]*\/channel`[\s\S]*\/segments`/.test(source) &&
    /advanceCampaignStep\(\)[\s\S]*const campaign = await saveCampaignDraftForAdvance\(\)[\s\S]*\/advance`/.test(source),
  'mail campaign lifecycle advance must keep the draft-step button clickable and persist setup before generating pre-push'
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
  /REQUIRED_TRACKING_LINK_PARAM = 'trackingLink'/.test(source) &&
    /REQUIRED_TRACKING_LINK_MESSAGE = 'HTML 模板必须包含短链参数 \$\{trackingLink\}'/.test(source) &&
    /function validateCampaignTemplateTrackingLink\(\)[\s\S]*state\.templatePreviewError = REQUIRED_TRACKING_LINK_MESSAGE/.test(source) &&
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
