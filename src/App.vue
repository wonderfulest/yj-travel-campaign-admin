<template>
    <RouterView v-if="!isLoggedIn" />

    <main v-else class="app-shell" :class="{'sidebar-collapsed': state.sidebarCollapsed}">
      <AppSidebar />

      <section class="workspace">
        <AppTopbar />

        <p v-if="state.notice" class="message success">{{ state.notice }}</p>
        <p v-if="state.error" class="message error">{{ state.error }}</p>

        <RouterView />

        <CustomerHelpPanel
          v-if="state.customerHelpVisible"
        />

        <CampaignDialogs />
      </section>
    </main>
</template>
<script setup lang="ts">
import AppSidebar from './layout/AppSidebar.vue'
import AppTopbar from './layout/AppTopbar.vue'
import CampaignDialogs from './views/campaigns/CampaignDialogs.vue'
import CustomerHelpPanel from './components/common/CustomerHelpPanel.vue'
import * as admin from './state/index'

const { state, isLoggedIn } = admin
</script>
