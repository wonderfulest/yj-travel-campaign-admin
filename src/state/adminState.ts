import { appStore } from './useAppStore.ts'
import { customerStore } from './useCustomerStore.ts'
import { channelStore } from './useChannelStore.ts'
import { segmentStore } from './useSegmentStore.ts'
import { campaignStore } from './useCampaignStore.ts'
import { trackingStore } from './useTrackingStore.ts'
import { mergeStoreRefs } from './mergeStoreRefs.ts'

export function useAdminState() {
  return mergeStoreRefs(appStore, customerStore, channelStore, segmentStore, campaignStore, trackingStore)
}
