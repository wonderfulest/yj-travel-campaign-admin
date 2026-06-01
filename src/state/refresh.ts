import { appStore } from './useAppStore.ts'
import { customerStore, loadCustomerSummary, loadCustomers, loadMappingPreview, loadTenantApiSecretStatus } from './useCustomerStore.ts'
import { loadChannels } from './useChannelStore.ts'
import { loadCampaigns } from './useCampaignStore.ts'
import { loadSegmentMembers, loadSegments, loadSegmentSummary, segmentStore } from './useSegmentStore.ts'
import { loadTrackingAnalytics } from './useTrackingStore.ts'

export async function refreshAll(): Promise<void> {
  switch (appStore.activeNav) {
    case 'dashboard':
      await Promise.allSettled([loadCustomerSummary(), loadSegmentSummary()])
      return
    case 'customers':
      if (appStore.customerTool === 'imports') {
        await loadTenantApiSecretStatus()
        return
      }
      if (appStore.customerTool === 'mapping') {
        await loadMappingPreview()
        return
      }
      await loadCustomers(customerStore.customerPage.page)
      return
    case 'channels':
      await loadChannels()
      return
    case 'segments':
      await loadSegments()
      if (segmentStore.selectedSegment?.id) {
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
