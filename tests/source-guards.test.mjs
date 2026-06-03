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
const settingsViewSource = readFileSync(new URL('../src/views/settings/SettingsView.vue', import.meta.url), 'utf8')
const defaultCampaignFormSource = source.match(/function defaultCampaignForm\(\)[\s\S]*?\n\}/)?.[0] || ''
const saveCampaignDraftForAdvanceSource = source.match(/async function saveCampaignDraftForAdvance\([^)]*\)[\s\S]*?\n\}/)?.[0] || ''

assert(
  !/setActivePinia\(createPinia\(\)\)/.test(source) &&
    !/from ['"]\.\/appContext(?:\.ts)?['"]/.test(source) &&
    !/from ['"]\.\.\/state\/index['"]/.test(source) &&
    !/from ['"]\.\.\/\.\.\/state\/index['"]/.test(source) &&
    !/new Proxy\(\{\} as Record<string, unknown>/.test(source),
  'admin state must use app-installed Pinia stores directly instead of the appContext singleton, state/index barrel wrappers, or merged Proxy state'
)

assert(
  /storeToRefs\(appStore\)/.test(settingsViewSource) &&
    /accessibleNavLabels/.test(settingsViewSource) &&
    !/availableNavItems\.map/.test(settingsViewSource),
  'settings page must read Pinia navigation getters through storeToRefs before rendering accessible nav labels'
)

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
    /parsed\.msg/.test(source) &&
    /unwrapApiResponse/.test(source) &&
    /parsed\.code !== 0/.test(source) &&
    /return parsed\.data/.test(source) &&
    !/parsed\.detail|parsed\.title|parsed\.message/.test(source),
  'API request failures must use backend envelope msg and successful API calls must unwrap envelope data'
)

assert(
  /function changeChannelPageSize\([^)]*\)[^{]*\{[\s\S]*loadChannels\(0\)/.test(source) &&
    !/function changeChannelPageSize\([^)]*\)[^{]*\{[\s\S]*nextSize === state\.channelPage\.size[\s\S]*loadChannels\(0\)/.test(source),
  'channel page-size changes must immediately reload the first page'
)

assert(
  /客群成员[\s\S]*<th>操作<\/th>/.test(source) &&
    /function segmentMemberCustomer\(member[^)]*\)[\s\S]*id: String\(member\.customerId \|\| member\.id \|\| ''\)[\s\S]*name: member\.customerName \|\| member\.name \|\| ''/.test(source) &&
    /@click="openCustomerDetail\(segmentMemberCustomer\(member\)\)"/.test(source) &&
    /@click="openCustomerEdit\(segmentMemberCustomer\(member\)\)"/.test(source) &&
    /<CustomerAssetDialog @saved="loadSegmentMembers\(\)" \/>/.test(source),
  'customer segment member rows must support detail and edit actions backed by customer asset dialogs and keep the member list in sync after edits'
)

assert(
  /remove\(channel[^)]*\)[\s\S]*\/api\/channels\/\$\{channel\.id\}[\s\S]*method: 'DELETE'/.test(source) &&
    /async function deleteChannel\(channel[^)]*\)[\s\S]*channelsApi\.remove\(channel\)[\s\S]*await loadChannels\(/.test(source) &&
    /@click="deleteChannel\(channel\)"/.test(source) &&
    /删除/.test(source),
  'push channel page must support deleting configured channels through DELETE /api/channels/{id}'
)

assert(
  /editingChannelId:\s*null/.test(source) &&
    /function editChannel\(channel[^)]*\)[\s\S]*editingChannelId = channel\.id/.test(source) &&
    /function channelSavePath\(channelType[^)]*editingChannelId[^)]*\)[\s\S]*\/api\/channels\/email\/smtp\/\$\{editingChannelId\}[\s\S]*method: editingChannelId \? 'PUT' : 'POST'/.test(source) &&
    /async function saveChannel\(\)[\s\S]*channelsApi\.save\(channelStore\.channelType, channelStore\.editingChannelId, payload\)/.test(source) &&
    /@click="editChannel\(channel\)"/.test(source) &&
    /cancelChannelEdit/.test(source),
  'push channel page must support editing configured channels through PUT and allow cancelling edit mode'
)

assert(
  /\/api\/customers\/summary\?topCountries=/.test(source),
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
  /\/api\/customers\/\$\{id\}\/email-quality/.test(source) &&
    /customersApi\.updateEmailQuality\(/.test(source),
  'customer asset page must call the email quality update endpoint via customersApi.updateEmailQuality'
)

assert(
  /<strong>{{ customer\.name \|\| "未命名客户" }}<\/strong>[\s\S]*class="customer-website"[\s\S]*:href="normalizedWebsiteUrl\(customer\.website\)"/.test(source) &&
    !/class="customer-name-link"/.test(source),
  'customer asset list must keep names as text and render website links below the name'
)

assert(
  /<strong>{{ member\.customerName \|\| member\.name \|\| member\.customerId \|\| '未命名客户' }}<\/strong>[\s\S]*class="customer-website"[\s\S]*:href="normalizedWebsiteUrl\(member\.website\)"[\s\S]*{{ formatWebsiteLabel\(member\.website\) }}[\s\S]*<span v-else>{{ member\.phone \|\| '-' }}<\/span>/.test(source),
  'customer segment member rows must match customer asset list formatting for name, website, and phone'
)

assert(
  /客群成员[\s\S]*<th>旅行社<\/th>[\s\S]*<th>邮箱<\/th>[\s\S]*<th>地区<\/th>[\s\S]*<th>状态<\/th>[\s\S]*<th>来源<\/th>[\s\S]*<th>坐标<\/th>[\s\S]*<th>操作<\/th>/.test(source) &&
    !/客群成员[\s\S]*<th>成员 ID<\/th>[\s\S]*<\/table>/.test(source) &&
    /{{ member\.email \|\| "待补充" }}/.test(source) &&
    /{{ member\.emailQuality \|\| 'PENDING' }}/.test(source) &&
    /{{ member\.sourcePrimary \|\| "OSM" }}/.test(source) &&
    /<MapPin :size="14" \/>[\s\S]*{{ member\.longitude \|\| "-" }}, {{ member\.latitude \|\| "-" }}/.test(source),
  'customer segment member list columns must match the customer asset list display'
)

assert(
  /openCustomerCreate/.test(source) &&
    /手动录入/.test(source) &&
    /request\('\/api\/customers'[\s\S]*method: 'POST'/.test(source),
  'customer asset page must support manually creating customers through POST /api/customers'
)

assert(
  /客户数据导入/.test(source) &&
    /API 导入/.test(source) &&
    /JSON 导入/.test(source) &&
    /Excel 文件导入/.test(source) &&
    /importCustomerFile\('json'\)/.test(source) &&
    /importCustomerFile\('excel'\)/.test(source),
  'customer import page must split API, JSON, and Excel imports into separate tabs and actions'
)

assert(
  /客户 JSON 示例结构/.test(source) &&
    /"records": \[/.test(source) &&
    /"externalId": "lead-001"/.test(source) &&
    /至少要有 name \/ email \/ phone \/ website 之一/.test(source),
  'customer JSON import page must show the required records array file structure and minimum identifier rule'
)

assert(
  /通过接口导入/.test(source) &&
    /\/api\/imports\/customers-json\/api/.test(source) &&
    /X-Tenant-Id/.test(source) &&
    /X-Tenant-Secret/.test(source) &&
    /loadTenantApiSecretStatus/.test(source) &&
    /rotateTenantApiSecret/.test(source),
  'customer import page must expose API import endpoint instructions and tenant secret key rotation'
)

assert(
  /updateEmailQuality/.test(source) && /VERIFIED/.test(source),
  'customer asset page must expose manual email quality updates'
)

assert(
  /\/api\/campaigns\/\$\{id\}\/template\/preview/.test(source) &&
    /campaignsApi\.previewTemplate\(/.test(source),
  'mail campaign template editor must call the backend template preview endpoint via campaignsApi.previewTemplate'
)

assert(
  /function trackingFinalUrl\([^)]*trackingLink/.test(source) &&
    /params\.set\('utm_source'/.test(source) &&
    /base\.includes\('\?'\) \? '&' : '\?'/.test(source),
  'campaign tracking target URL copies must build the final long URL with UTM tags before the hash fragment'
)

assert(
  /@click="copyShortLink\(trackingFinalUrl, '目标长链接已复制'\)"/.test(source) &&
    /const trackingFinalUrl = computed/.test(source) &&
    /@click="copyShortLink\(trackingFinalUrlText, '目标长链接已复制'\)"/.test(source) &&
    /const trackingFinalUrlText = computed/.test(source),
  'campaign tracking workbench and dialog must copy the UTM-tagged target URL instead of the raw targetUrl'
)

assert(
  /templatePreviewHtml/.test(source) && /<iframe[\s\S]+:srcdoc="state\.templatePreviewHtml/.test(source),
  'mail campaign template editor must render preview HTML through an iframe srcdoc'
)

assert(
  /insertTrackingLinkVariable/.test(source) &&
    /const placeholder = '\$\{' \+ key \+ '\}'/.test(source) &&
    !/添加变量/.test(source) &&
    !/插入变量到 UTM/.test(source),
  'mail campaign template editor must only expose insertion of the trackingLink short-link placeholder'
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
    /function openCampaignDetail\(campaign[^)]*\)[\s\S]*fillCampaignForm\(campaign\)[\s\S]*(activateNav|navigateToNav)\('campaigns'[^)]*\)/.test(source) &&
    !/<div class="campaign-list">/.test(source),
  'mail campaign list must be a standalone page with a jump action into the campaign detail editor'
)

assert(
  /function startNewCampaign\(\)[\s\S]*clearCampaignSelection\(\)[\s\S]*navigateToNav\('campaigns'\)/.test(source) &&
    !/if \(!campaignState\(\)\.selectedCampaign && pageResult\.items\.length\) \{[\s\S]*fillCampaignForm\(pageResult\.items\[0\]\)[\s\S]*\}/.test(source),
  'new mail campaign navigation must keep the form empty instead of letting loadCampaigns auto-fill the first campaign'
)

assert(
  /ACTIVE_NAV_STORAGE_KEY = 'travel_admin_active_nav'/.test(source) &&
    /CUSTOMER_TOOL_STORAGE_KEY = 'travel_admin_customer_tool'/.test(source) &&
    /ADMIN_NAV_QUERY_KEY = 'nav'/.test(source) &&
    /function initialAdminNav\(\)[\s\S]*resolveNavigationFromLocation\(window\.location\.pathname, queryNav\)[\s\S]*localStorage\.getItem\(ACTIVE_NAV_STORAGE_KEY\)[\s\S]*'dashboard'/.test(source) &&
    /activeNav: initialAdminNav\(\)/.test(source) &&
    /function activateNav\(nav[^)]*\)[\s\S]*persistNavigationState\([^)]*\)/.test(source) &&
    /function navigateToNav\(nav[^)]*\)[\s\S]*router\.push\(navToPath\(nav, [^)]*customerTool\)\)/.test(source) &&
    /function normalizeActiveNavAccess\([^)]*\)/.test(source) &&
    /function syncNavigationFromRoute\(pathname[^)]*queryNav = ''[^)]*\)[\s\S]*resolveNavigationFromLocation\(pathname, queryNav\)/.test(source) &&
    /if \(appStore\.token\) \{[\s\S]*appStore\.normalizeActiveNavAccess\(\)[\s\S]*\}/.test(source) &&
    /function replaceWithActiveNav\(\)[\s\S]*router\.replace\(navToPath\([^)]*activeNav, [^)]*customerTool\)\)/.test(source) &&
    /function replaceWithLogin\(\)[\s\S]*router\.replace\('\/login'\)/.test(source),
  'admin must restore deep-linked or saved navigation and normalize inaccessible pages after refresh'
)

assert(
  /router\.isReady\(\)\.then\(\(\) => \{[\s\S]*app\.mount\('#app'\)[\s\S]*\}\)/.test(source),
  'admin must wait for the initial Vue Router navigation before mounting so page refresh preserves the current path'
)

assert(
  /route\.fullPath[\s\S]*syncNavigationFromRoute[\s\S]*route\.path[\s\S]*queryNav/.test(source) &&
    /v-for="child in navChildItems\(item\.key\)"[\s\S]*:to="navToPath\(child\.key\)"/.test(source) &&
    /key: 'campaigns'[\s\S]*parentKey: 'campaign-list'[\s\S]*hideFromMenu: true/.test(source) &&
    /navChildItems\(parentKey[^)]*\)[\s\S]*item\.parentKey === parentKey[\s\S]*!item\.hideFromMenu/.test(source),
  'admin sidebar navigation must sync route state and hide campaign detail editing from the menu'
)

assert(
  /function clearCampaignSelection\(\)[\s\S]*selectedCampaign = null[\s\S]*campaignForm = defaultCampaignForm\(\)/.test(source) &&
    /async function loadCampaigns\([^)]*page[\s\S]*pageResult\.items\.some\(\(item\) => item\.id === [\s\S]*selectedCampaign[^)]*\.id\)[\s\S]*clearCampaignSelection\(\)[\s\S]*catch \(error[^)]*\) \{[\s\S]*clearCampaignSelection\(\)/.test(source),
  'mail campaign loading must clear selectedCampaign and stale form data when the tenant-scoped list no longer contains it'
)

assert(
  /name: ''[\s\S]*objective: ''[\s\S]*subject: ''[\s\S]*fromName: ''[\s\S]*htmlBody: ''[\s\S]*templateVariables: \[\][\s\S]*trackingTargetUrl: ''[\s\S]*trackingShortCode: ''[\s\S]*trackingUtmSource: ''[\s\S]*trackingUtmMedium: ''[\s\S]*trackingUtmCampaign: ''[\s\S]*trackingUtmContent: ''/.test(defaultCampaignFormSource) &&
    !/pioneerChinaEmailTemplate/.test(source) &&
    !/先锋中国行程推广邮件|China Discovery from US\$399\+|travel-agency-partnership|china-trip/.test(defaultCampaignFormSource),
  'new mail campaign forms must not be prefilled with demo campaign defaults'
)

assert(
  /function fillCampaignForm\(campaign[^)]*\)[\s\S]*campaignForm\.subject = campaign\.template\?\.subject \|\| ''[\s\S]*campaignForm\.htmlBody = campaign\.template\?\.htmlBody \|\| campaign\.template\?\.body \|\| ''[\s\S]*campaign\.template[\s\S]*parseTemplateVariables\(campaign\.template\.variablesJson, DEFAULT_TEMPLATE_VARIABLES\)[\s\S]*: \[\][\s\S]*campaignForm\.trackingTargetUrl = campaign\.trackingLink\?\.targetUrl \|\| ''[\s\S]*campaignForm\.trackingUtmCampaign = campaign\.trackingLink\?\.utmCampaign \|\| ''/.test(source),
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
    /rollback\(id[^)]*body[^)]*\)[\s\S]*\/api\/campaigns\/\$\{id\}\/rollback/.test(source) &&
    /campaignsApi\.rollback\([\s\S]*selectedCampaign\.id/.test(source) &&
    /isCampaignStepDisabled\(step\)/.test(source) &&
    /推送完成后状态不可修改/.test(source) &&
    /只能回退到上一步或确认进入下一步/.test(source),
  'mail campaign lifecycle must only allow rollback to the previous step before final push and lock confirmed campaigns'
)

assert(
  /function campaignPrePushBlockReason\(\)[\s\S]*!.*selectedCampaign\.channelId[\s\S]*请先保存活动配置以绑定推送通道/.test(source) &&
    /campaignNextAction\.value === 'prePush'[\s\S]*campaignPrePushBlockReason\(\)/.test(source) &&
    /runCampaignAction\([^)]*\)[\s\S]*error = reason/.test(source),
  'mail campaign pre-push must require saved template, channel, and segment setup before calling the backend'
)

assert(
    /function campaignDraftAdvanceBlockReason\(\)[\s\S]*campaignNextAction\.value !== 'saveDraft'[\s\S]*请先创建活动，并保存短链接配置、推送通道和客群[\s\S]*!.*selectedCampaign\.trackingLink[\s\S]*请先保存活动短链接配置[\s\S]*campaignTrackingLinkDirty\.value[\s\S]*当前短链接配置有未保存修改[\s\S]*!.*selectedCampaign\.channelId[\s\S]*请先选择并保存推送通道[\s\S]*!.*selectedCampaign\.segmentIds\?\.length[\s\S]*请先选择并保存客群[\s\S]*campaignSetupDirty\.value[\s\S]*当前模板、通道或客群有未保存修改/.test(source) &&
    /campaignAdvanceTitle\(\)[\s\S]*campaignNextAction\.value === 'saveDraft'[\s\S]*campaignDraftAdvanceBlockReason\(\)/.test(source) &&
    /advanceCampaignStep\([^)]*\)[\s\S]*const draftBlockReason = campaignDraftAdvanceBlockReason\(\)[\s\S]*error = draftBlockReason[\s\S]*return/.test(source),
  'mail campaign draft confirmation must require saved short-link, channel, and segment configuration before entering the next lifecycle step'
)

assert(
    /function isCampaignAdvanceDisabled\(\)[\s\S]*if \(.*selectedCampaign\?\.id\) return false[\s\S]*campaignNextAction\.value !== 'saveDraft'/.test(source) &&
    /async function saveCampaignDraftForAdvance\([^)]*\)[^{]*\{[\s\S]*campaignsApi\.create\([\s\S]*campaignsApi\.updateTemplate\([\s\S]*fillCampaignForm\(campaign\)/.test(source) &&
    !/campaignsApi\.(updateChannel|updateSegments|updateTrackingLink)\(/.test(saveCampaignDraftForAdvanceSource) &&
    /advanceCampaignStep\([^)]*\)[\s\S]*campaignNextAction\.value !== 'saveDraft'[\s\S]*const campaign = await saveCampaignDraftForAdvance\(\)/.test(source) &&
    !/advanceCampaignStep\([^)]*\)[\s\S]*\/advance`/.test(source),
  'mail campaign lifecycle advance must keep the draft-step button clickable, persist the draft template first, and never call the generic advance endpoint'
)

assert(
  /function runCampaignAction\([^)]*\)[\s\S]*campaignsApi\.action\(/.test(source) &&
    /'simulate-send'/.test(source) &&
    /'pre-push'/.test(source) &&
    /'confirm'/.test(source) &&
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
  /<CustomerAssetDialog \/>/.test(source) &&
    /openTrackingCustomerDetail\(event\)/.test(source) &&
    /openCustomerDetail\(trackingEventCustomer\(event\)\)/.test(source) &&
    /utmTags\(event\)/.test(source) &&
    /\['src', event\.utmSource\]/.test(source) &&
    /\['med', event\.utmMedium\]/.test(source) &&
    /\['cmp', event\.utmCampaign\]/.test(source),
  'tracking click detail must show UTM tags and reuse the customer asset detail dialog from clickable customer ids'
)

assert(
  /trackingShortUrl/.test(source) &&
    /完整短链已复制/.test(source),
  'mail campaign pre-push records must show generated tracking short links'
)

assert(
  /\/api\/campaigns\/\$\{id\}\/tracking-link/.test(source) &&
    /campaignsApi\.updateTrackingLink\(/.test(source) &&
    /trackingTargetUrl/.test(source) &&
    /trackingShortCode/.test(source) &&
    /trackingUtmCampaign/.test(source),
  'mail campaign setup must save required campaign tracking short-link configuration'
)

assert(
    /testCustomerDialogOpen/.test(source) &&
    /\/api\/customers\/search\?\$\{query\}\$\{separator\}hasEmail=true/.test(source) &&
    /customersApi\.searchWithEmail\(query\.toString\(\)\)/.test(source) &&
    /testCustomers: [\s\S]*selectedTestCustomerIds/.test(source) &&
    /action === 'simulateSend' && !options\.confirmedTestCustomers/.test(source) &&
    /action === 'simulateSend'[\s\S]*closeTestCustomerDialog\(\)[\s\S]*selectedTestCustomerIds = \[\][\s\S]*模拟发送成功/.test(source) &&
    /advanceCampaignStep\(\{ confirmedTestCustomers: true \}\)/.test(source) &&
    /选择测试客户/.test(source) &&
    /模拟发送到测试客户/.test(source),
  'mail campaign simulation must select real customer assets, close after success, and show a success notice'
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
    /REQUIRED_UNSUBSCRIBE_LINK_PARAM = 'unsubscribeLink'/.test(source) &&
    /REQUIRED_TRACKING_LINK_MESSAGE = 'HTML 模板必须包含短链参数 \$\{trackingLink\}'/.test(source) &&
    /REQUIRED_UNSUBSCRIBE_LINK_MESSAGE = 'HTML 模板必须包含退订链接变量 \$\{unsubscribeLink\}'/.test(source) &&
    /function validateCampaignTemplateTrackingLink\(\)[\s\S]*templatePreviewError = message/.test(source) &&
    /<h3>短链与变量配置<\/h3>[\s\S]*tracking-link-dock[\s\S]*v-if="templateRequiredParamMessage"[\s\S]*templateRequiredParamMessage/.test(source) &&
    /syncTemplateVariables\([^)]*\)[\s\S]*scanTemplateVariableKeys\(`\$\{subject \|\| ''\}\\n\$\{htmlBody \|\| ''\}`\)\.map/.test(source) &&
    /key === REQUIRED_TRACKING_LINK_PARAM[\s\S]*TRACKING_LINK_VARIABLE/.test(source) &&
    /key === REQUIRED_UNSUBSCRIBE_LINK_PARAM[\s\S]*UNSUBSCRIBE_LINK_VARIABLE/.test(source) &&
    /template-variable-catalog/.test(source) &&
    /POST \/api\/subscriptions\/unsubscribe/.test(source) &&
    /POST \/api\/subscriptions\/subscribe/.test(source) &&
    /v-for="option in state\.templateVariableOptions"/.test(source) &&
    /@click="insertTemplateVariable\(option\)"/.test(source) &&
    !/<textarea[\s\S]*id="campaign-html-editor"[\s\S]*<\/textarea>\s*<div v-if="templateRequiredParamMessage"/.test(source),
  'mail campaign variable config panel must require trackingLink and unsubscribeLink and expose insertable template variables in the right panel'
)

assert(
  /segmentDropdownOpen/.test(source) &&
    /campaign-segment-dropdown/.test(source) &&
    /toggleCampaignSegment/.test(source) &&
    !/<select v-model="state\.campaignForm\.segmentIds" multiple>/.test(source),
  'mail campaign customer segments must use a searchable dropdown multi-select, not native select multiple'
)

assert(
  /function filteredCampaignSegments\(segments = .*segments\)/.test(source) &&
    /function selectedCampaignSegments\(segments = .*segments\)/.test(source),
  'campaign segment dropdown helpers must default to the loaded segment store when called from the view'
)
