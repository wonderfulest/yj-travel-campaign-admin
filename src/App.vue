<template>
    <AppMessageBox />

    <RouterView v-if="!isLoggedIn" />

    <main v-else class="app-shell" :class="{'sidebar-collapsed': sidebarCollapsed}">
      <AppSidebar />

      <section class="workspace">
        <AppTopbar />

        <RouterView />

        <CustomerHelpPanel
          v-if="customerHelpVisible"
        />

        <CampaignDialogs />
      </section>
    </main>
</template>
<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import AppSidebar from './layout/AppSidebar.vue'
import AppTopbar from './layout/AppTopbar.vue'
import AppMessageBox from './components/common/AppMessageBox.vue'
import CampaignDialogs from './views/campaigns/CampaignDialogs.vue'
import CustomerHelpPanel from './components/common/CustomerHelpPanel.vue'
import { useAppStore } from './state/useAppStore'
import { useCustomerStore } from './state/useCustomerStore'

const appStore = useAppStore()
const customerStore = useCustomerStore()
const { sidebarCollapsed } = storeToRefs(appStore)
const { customerHelpVisible } = storeToRefs(customerStore)
const isLoggedIn = computed(() => appStore.isLoggedIn)

const route = useRoute()

watch(
  () => route.fullPath,
  () => {
    if (!isLoggedIn.value) return
    const queryNav = typeof route.query.nav === 'string' ? route.query.nav : ''
    appStore.syncNavigationFromRoute(route.path, queryNav)
    appStore.rememberRoute(route.path, route.fullPath, queryNav)
  },
  { immediate: true }
)
</script>
