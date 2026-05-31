<template>
    <AuthView v-if="!isLoggedIn" />

    <main v-else class="app-shell" :class="{'sidebar-collapsed': state.sidebarCollapsed}">
      <AppSidebar />

      <section class="workspace">
        <AppTopbar />

        <p v-if="state.notice" class="message success">{{ state.notice }}</p>
        <p v-if="state.error" class="message error">{{ state.error }}</p>

        <StatGrid v-if="state.activeNav === 'dashboard'" />

        <DashboardView v-if="state.activeNav === 'dashboard'" />

        <CustomerToolTabs
          v-if="canAccessNav('customers') && state.activeNav === 'customers'"
        />

        <CustomerHelpPanel
          v-if="canAccessNav('customers') && state.activeNav === 'customers' && state.customerHelpVisible"
        />

        <CustomerMappingView
          v-if="canAccessNav('mapping') && state.activeNav === 'customers' && state.customerTool === 'mapping'"
        />

        <CustomerAssetsView
          v-if="canAccessNav('customers') && (state.activeNav === 'dashboard' || (state.activeNav === 'customers' && state.customerTool === 'list'))"
        />

        <ChannelsView
          v-if="canAccessNav('channels') && state.activeNav === 'channels'"
        />

        <CustomerImportView
          v-if="canAccessNav('imports') && state.activeNav === 'customers' && state.customerTool === 'imports'"
        />

        <SegmentsView
          v-if="canAccessNav('segments') && state.activeNav === 'segments'"
        />

        <CampaignListView
          v-if="canAccessNav('campaign-list') && state.activeNav === 'campaign-list'"
        />

        <CampaignWorkbenchView
          v-if="canAccessNav('campaigns') && state.activeNav === 'campaigns'"
        />

        <CampaignDialogs />

        <TrackingView
          v-if="canAccessNav('tracking') && state.activeNav === 'tracking'"
        />

        <SettingsView
          v-if="canAccessNav('settings') && state.activeNav === 'settings'"
        />
      </section>
    </main>
</template>
<script setup lang="ts">
import { nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppSidebar from './layout/AppSidebar.vue'
import AppTopbar from './layout/AppTopbar.vue'
import AuthView from './views/auth/AuthView.vue'
import CampaignDialogs from './views/campaigns/CampaignDialogs.vue'
import CampaignListView from './views/campaigns/CampaignListView.vue'
import CampaignWorkbenchView from './views/campaigns/CampaignWorkbenchView.vue'
import ChannelsView from './views/channels/ChannelsView.vue'
import CustomerAssetsView from './views/customers/CustomerAssetsView.vue'
import CustomerHelpPanel from './components/common/CustomerHelpPanel.vue'
import CustomerImportView from './views/customers/CustomerImportView.vue'
import CustomerMappingView from './views/customers/CustomerMappingView.vue'
import CustomerToolTabs from './views/customers/CustomerToolTabs.vue'
import DashboardView from './views/dashboard/DashboardView.vue'
import SegmentsView from './views/segments/SegmentsView.vue'
import SettingsView from './views/settings/SettingsView.vue'
import StatGrid from './components/common/StatGrid.vue'
import TrackingView from './views/tracking/TrackingView.vue'
import * as admin from './state/index'
import { navToPath } from './navigation'

const route = useRoute()
const router = useRouter()
watch(
  () => [route.path, route.query.nav],
  ([path, nav]) => {
    admin.syncNavigationFromRoute(path, typeof nav === 'string' ? nav : '')
    admin.normalizeActiveNavAccess()
    const targetPath = navToPath(admin.state.activeNav, admin.state.customerTool)
    if (admin.isLoggedIn.value && route.path !== targetPath) {
      void nextTick(() => router.replace(targetPath).catch(() => {}))
    }
  },
  { immediate: true }
)

const {
  state,
  isLoggedIn,
  stats,
  pageMeta,
  availablePrimaryNavItems,
  navChildItems,
  isNavItemActive,
  toggleSidebar,
  primaryRoleLabel,
  customerCountryStats,
  customerQualityStats,
  customerContactStats,
  customerReachabilityStats,
  segmentReadinessStats,
  qualityDonut,
  reachabilityDonut,
  segmentReadinessBars,
  statusLabel,
  formatCountryShare,
  canAccessNav,
  login,
  logout,
  setActiveNav,
  openStatTarget
} = admin
</script>
