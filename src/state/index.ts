import { computed } from 'vue'
import {
  useAppStore,
  normalizeActiveNavAccess as _normalizeActiveNavAccess,
  persistNavigationState as _persistNavigationState,
  activateNav as _activateNav,
  setCustomerToolState as _setCustomerToolState,
  setActiveNav as _setActiveNav,
  navChildItems as _navChildItems,
  isNavItemActive as _isNavItemActive,
  toggleSidebar as _toggleSidebar,
  syncNavigationFromRoute as _syncNavigationFromRoute,
  persistSession as _persistSession,
  login as _login,
  logout as _logout,
  currentRoles as _currentRoles,
  canAccessNav as _canAccessNav,
  navItems, ROLE_PAGE_ACCESS, ROLE_LABELS, initialAdminNav
} from './useAppStore'
import type { UserRole } from '../types'
import { updateLocalTemplatePreview } from './useCampaignStore'
import { customerStore } from './useCustomerStore'
import { channelStore } from './useChannelStore'
import { segmentStore } from './useSegmentStore'
import { campaignStore } from './useCampaignStore'
import { trackingStore } from './useTrackingStore'
import { refreshAll } from './useUiStore'
import { appStore, request } from './appContext'

export { appStore, request }

const stateSources = [appStore, customerStore, channelStore, segmentStore, campaignStore, trackingStore] as const

export const state = new Proxy({} as Record<string, unknown>, {
  get(_target, key: string) {
    if (key === Symbol.toStringTag) return 'AdminState'
    for (const source of stateSources) {
      if (key in source) return (source as Record<string, unknown>)[key]
    }
    return undefined
  },
  set(_target, key: string, value: unknown) {
    for (const source of stateSources) {
      if (key in source) {
        ;(source as Record<string, unknown>)[key] = value
        return true
      }
    }
    return false
  },
  has(_target, key: string) {
    return stateSources.some((source) => key in source)
  }
})

// ─── computed values ──────────────────────────────────────────────────────────
export const isLoggedIn = computed(() => Boolean(appStore.token))
export const availableNavItems = computed(() => navItems.filter((item) => _canAccessNav(item.key, appStore)))
export const availablePrimaryNavItems = computed(() => availableNavItems.value.filter((item) => !item.parentKey))
export const primaryRole = computed(() => _currentRoles(appStore)[0])
export const primaryRoleLabel = computed(() => ROLE_LABELS[primaryRole.value] || primaryRole.value)
export const pageMeta = computed(() => {
  const fallback = availableNavItems.value[0] || navItems[0]
  if (!_canAccessNav(appStore.activeNav, appStore)) return fallback
  return navItems.find((item) => item.key === appStore.activeNav) || fallback
})

// ─── bound wrapper functions ──────────────────────────────────────────────────
export function normalizeActiveNavAccess() {
  return _normalizeActiveNavAccess(appStore)
}

export function persistNavigationState() {
  return _persistNavigationState(appStore)
}

export function activateNav(nav: string): void {
  return _activateNav(nav, appStore)
}

export function setCustomerToolState(tool: string): void {
  return _setCustomerToolState(tool, appStore)
}

export function setActiveNav(nav: string, onNavSideEffect?: (nav: string) => void): void {
  return _setActiveNav(nav, appStore, onNavSideEffect)
}

export function navChildItems(parentKey: string) {
  return _navChildItems(parentKey, appStore)
}

export function isNavItemActive(item: { key: string }): boolean {
  return _isNavItemActive(item, appStore)
}

export function toggleSidebar(): void {
  return _toggleSidebar(appStore)
}

export function syncNavigationFromRoute(pathname: string, queryNav = ''): void {
  return _syncNavigationFromRoute(pathname, queryNav, appStore)
}

export function persistSession(result: { accessToken: string; email: string; tenantId: string | number; userId: string | number; roles?: UserRole[] }): void {
  return _persistSession(result, appStore)
}

export async function login(onSuccess?: () => Promise<void>): Promise<void> {
  return _login(onSuccess, appStore, request)
}

export function logout(): void {
  return _logout(appStore)
}

export function currentRoles(): UserRole[] {
  return _currentRoles(appStore)
}

export function canAccessNav(nav: string): boolean {
  return _canAccessNav(nav, appStore)
}

// ─── re-exports from domain stores ───────────────────────────────────────────
export {
  useAppStore,
  navItems, ROLE_PAGE_ACCESS, ROLE_LABELS,
  initialAdminNav
} from './useAppStore'

export { useCustomerStore, customerStore,
  filteredCustomers,
  summarizeCustomers, statusStats, isReachableCustomer, formatCountryShare,
  replaceCustomer, addCustomer, profileAsset,
  openCustomerDetail, closeCustomerDetail, closeCustomerDialog, closeCustomerEditor, resetCustomerEditorState,
  defaultCustomerForm, openCustomerCreate, openCustomerEdit, buildCustomerEditForm,
  loadCustomerProfile, loadCustomerSummary, loadCustomers,
  saveCustomerEdit, updateEmailQuality,
  EMAIL_QUALITY_OPTIONS,
  changeCustomerPage, jumpCustomerPage, changeCustomerPageSize,
  importCustomerJson, loadMappingPreview, runOsmMapping, onFileChange,
  loadDictionaryCountries, loadDictionaryCities, getCitiesByCountryId, clearDictionaryCache,
  PAGE_SIZE_OPTIONS, pageQuery, boundedPage, emptyPageResult, normalizePageResult, localPageResult
} from './useCustomerStore'

export { useChannelStore, channelStore,
  loadChannels, createChannel,
  changeChannelPage, jumpChannelPage, changeChannelPageSize
} from './useChannelStore'

export { useSegmentStore, segmentStore,
  segmentReadinessStats, segmentReadinessBars, summarizeSegments,
  loadSegmentSummary, loadSegments, loadSegmentMembers,
  saveSegment, deleteSegment, refreshSegment,
  fillSegmentForm, resetSegmentForm, segmentPayload,
  RULE_FIELDS, RULE_OPS, ruleOpIsMulti, ruleOpHasValue, addRule, removeRule, buildRules,
  changeSegmentPage, jumpSegmentPage, changeSegmentPageSize,
  changeSegmentMemberPage, changeSegmentMemberPageSize, jumpSegmentMemberPage
} from './useSegmentStore'

export { useCampaignStore, campaignStore,
  REQUIRED_TRACKING_LINK_PARAM, REQUIRED_TRACKING_LINK_MESSAGE,
  DEFAULT_TEMPLATE_VARIABLES, EMPTY_TEMPLATE_PREVIEW_HTML,
  CAMPAIGN_LIFECYCLE_STEPS, CAMPAIGN_STATUS_LABELS, CAMPAIGN_NEXT_ACTION_BY_STATUS, CAMPAIGN_ACTION_LABELS,
  defaultCampaignForm,
  campaignCurrentStatus, campaignCurrentStatusLabel, campaignNextAction, campaignNextActionLabel,
  campaignAdvanceButtonLabel, templateMissingTrackingLinkParam, editableTemplateVariableRows,
  campaignSetupDirty, campaignTrackingLinkDirty, campaignLifecycleView,
  campaignLifecycleIndex, campaignActionLabel,
  normalizedIdList, normalizedTemplateVariables,
  campaignPrePushBlockReason, isCampaignActionDisabled, isCampaignAdvanceDisabled, isCampaignStepDisabled,
  campaignActionTitle, campaignAdvanceTitle, campaignStepTitle,
  fillCampaignForm, clearCampaignSelection, syncCampaignTemplateVariables, updateLocalTemplatePreview,
  templateVariablesJson, addTemplateVariable, removeTemplateVariable, insertTemplateVariable,
  campaignTemplatePayload, campaignHtmlHasTrackingLinkParam, validateCampaignTemplateTrackingLink,
  campaignTrackingLinkPayload,
  openTrackingLinkDialog, closeTrackingLinkDialog,
  openFinalConfirmDialog, closeFinalConfirmDialog,
  filteredCampaignSegments, selectedCampaignSegments,
  isCampaignSegmentSelected, toggleCampaignSegment, removeCampaignSegment,
  normalizeEmailInput, isTestEmailSelected, toggleTestEmail,
  loadTestEmails, openTestEmailDialog, closeTestEmailDialog, addTestEmail, deleteTestEmail,
  loadCampaigns, saveCampaignSetup, saveCampaignTrackingLink, previewCampaignTemplate,
  runCampaignAction, advanceCampaignStep, confirmTestSimulation, confirmFinalPush, rollbackCampaignStep,
  changeCampaignPage, jumpCampaignPage, changeCampaignPageSize,
  type CampaignTemplatePayload, type CampaignTrackingLinkPayload
} from './useCampaignStore'

export {
  stats, qualityDonut, reachabilityDonut,
  customerCountryStats, customerQualityStats, customerContactStats, customerReachabilityStats,
  CHART_PALETTE, buildDonut, statusLabel,
  displayValue, percentValue, normalizedWebsiteUrl, formatWebsiteLabel,
  jsonObject, localizedName, formatLanguages, destinationLabel, csvToList, copyShortLink,
  setCustomerTool, openStatTarget, uiSetActiveNav, openCampaignList,
  startNewCampaign, openCampaignDetail,
  refreshAll,
  type DonutItem, type DonutSegment, type DonutChart
} from './useUiStore'

export { useTrackingStore, trackingStore,
  loadTrackingAnalytics,
  changeTrackingEventPage, jumpTrackingEventPage,
  changeTrackingLinkPage, jumpTrackingLinkPage
} from './useTrackingStore'

// ─── initialisation ───────────────────────────────────────────────────────────
updateLocalTemplatePreview()

if (appStore.token) {
  normalizeActiveNavAccess()
  refreshAll()
}
