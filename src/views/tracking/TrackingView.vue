<template>

<section v-if="canAccessNav('tracking') && state.activeNav === 'tracking'" class="tracking-page">
  <div class="toolbar compact-toolbar">
    <label>
      活动筛选
      <select v-model="state.trackingFilter.campaignId" @change="loadTrackingAnalytics(0, 0)">
        <option value="">全部活动</option>
        <option v-for="campaign in state.campaigns" :key="campaign.id" :value="campaign.id">{{ campaign.name }} / {{ campaign.id }}</option>
      </select>
    </label>
    <button class="secondary-action" type="button" :disabled="state.loading" @click="loadTrackingAnalytics(0, 0)">
      <RefreshCw :size="16" /> 刷新
    </button>
  </div>

  <TrackingStatsPanel :summary="state.trackingSummary" />

  <TrackingTrendPanel :timeseries="state.trackingTimeseries" />

  <TrackingUtmPanel :utm-stats="state.trackingUtmStats" />

  <TrackingLinkPanel
    :link-stats="state.trackingLinkStats"
    :link-page="state.trackingLinkPage"
  />

  <TrackingEventPanel
    :events="state.trackingEvents"
    :campaigns="state.campaigns"
    :event-page="state.trackingEventPage"
  />

  <CustomerAssetDialog />
</section>
</template>
<script setup lang="ts">
import { proxyRefs, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { RefreshCw } from 'lucide-vue-next'
import { canAccessNav as canAccessAppNav, useAppStore } from '../../state/useAppStore'
import { loadCampaigns, useCampaignStore } from '../../state/useCampaignStore'
import { loadTrackingAnalytics, useTrackingStore } from '../../state/useTrackingStore'
import CustomerAssetDialog from '../../components/customers/CustomerAssetDialog.vue'
import TrackingStatsPanel from './TrackingStatsPanel.vue'
import TrackingTrendPanel from './TrackingTrendPanel.vue'
import TrackingUtmPanel from './TrackingUtmPanel.vue'
import TrackingLinkPanel from './TrackingLinkPanel.vue'
import TrackingEventPanel from './TrackingEventPanel.vue'

const appStore = useAppStore()
const campaignStore = useCampaignStore()
const trackingStore = useTrackingStore()
const state = proxyRefs({
  ...storeToRefs(appStore),
  ...storeToRefs(campaignStore),
  ...storeToRefs(trackingStore)
})

function canAccessNav(nav: string): boolean {
  return canAccessAppNav(nav, appStore)
}

onMounted(() => {
  void Promise.allSettled([loadCampaigns(), loadTrackingAnalytics()])
})
</script>
