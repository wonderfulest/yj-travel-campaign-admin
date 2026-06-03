<template>

    <header class="topbar">
      <div>
        <nav v-if="routeHistory.length > 1" class="breadcrumb-trail" aria-label="历史页面">
          <template v-for="(item, index) in routeHistory" :key="item.fullPath">
            <button
              type="button"
              :class="{current: item.fullPath === route.fullPath}"
              :disabled="item.fullPath === route.fullPath"
              @click="openHistoryPage(item.fullPath)"
            >
              {{ item.label }}
            </button>
            <ChevronRight v-if="index < routeHistory.length - 1" :size="14" />
          </template>
        </nav>
        <h2>{{ pageMeta.title }}</h2>
        <p>{{ pageMeta.description }}</p>
      </div>
      <div class="tenant-chip">
        <ShieldCheck :size="17" />
        <span>{{ primaryRoleLabel }}</span>
        <strong>{{ user?.email }}</strong>
        <button class="icon-button" @click="logout" title="退出登录"><LogOut :size="17" /></button>
      </div>
    </header>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ChevronRight, LogOut, ShieldCheck } from 'lucide-vue-next'
import { navItems, useAppStore } from '../state/useAppStore'
import { replaceWithLogin } from '../navigationActions'

const appStore = useAppStore()
const { primaryRoleLabel, routeHistory, user } = storeToRefs(appStore)

const route = useRoute()
const router = useRouter()

function logout(): void {
  appStore.logout()
  replaceWithLogin()
}

function openHistoryPage(fullPath: string): void {
  void router.push(fullPath).catch(() => {})
}

const pageMeta = computed(() => {
  const seg = route.path.replace(/^\//, '').split('/')[0]
  return navItems.find((item) => item.key === seg) || navItems[0]
})
</script>
