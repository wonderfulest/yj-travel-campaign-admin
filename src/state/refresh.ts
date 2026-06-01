import { useAppStore } from './useAppStore'
import { loadCustomerSummary, loadCustomers, loadMappingPreview, loadTenantApiSecretStatus, useCustomerStore } from './useCustomerStore'
import { loadChannels } from './useChannelStore'
import { loadCampaigns } from './useCampaignStore'
import { loadSegmentMembers, loadSegments, loadSegmentSummary, useSegmentStore } from './useSegmentStore'
import { loadTrackingAnalytics } from './useTrackingStore'

const appState = () => useAppStore()
const customerState = () => useCustomerStore()
const segmentState = () => useSegmentStore()

export async function refreshAll(): Promise<void> {
  switch (appState().activeNav) {
    case 'dashboard':
      await Promise.allSettled([loadCustomerSummary(), loadSegmentSummary()])
      return
    case 'customers':
      if (appState().customerTool === 'imports') {
        await loadTenantApiSecretStatus()
        return
      }
      if (appState().customerTool === 'mapping') {
        await loadMappingPreview()
        return
      }
      await loadCustomers(customerState().customerPage.page)
      return
    case 'channels':
      await loadChannels()
      return
    case 'segments':
      await loadSegments()
      if (segmentState().selectedSegment?.id) {
        await loadSegmentMembers()
      }
      return
    case 'campaign-list':
    case 'campaigns':
      await loadCampaigns()
      return
    case 'tracking':
      await loadTrackingAnalytics()
      return
    default:
      return
  }
}
