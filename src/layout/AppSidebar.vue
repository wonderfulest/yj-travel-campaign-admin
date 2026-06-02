<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="brand-lockup compact">
        <div class="brand-mark"><Mail :size="20" /></div>
        <div>
          <h1>有解获客</h1>
          <p>yj-travel-admin</p>
        </div>
      </div>
      <button
        class="sidebar-toggle"
        type="button"
        :aria-label="sidebarCollapsed ? '展开菜单栏' : '收起菜单栏'"
        :title="sidebarCollapsed ? '展开菜单栏' : '收起菜单栏'"
        @click="toggleSidebar"
      >
        <PanelLeftOpen v-if="sidebarCollapsed" :size="18" />
        <PanelLeftClose v-else :size="18" />
      </button>
    </div>
    <nav>
      <div v-for="item in availablePrimaryNavItems" :key="item.key" class="nav-group">
        <RouterLink
          class="sidebar-link"
          :class="{active: isActive(item.key), 'child-active': route.path.startsWith('/campaigns') && item.key === 'campaign-list' && route.path !== '/campaign-list'}"
          :to="navToPath(item.key)"
          :title="sidebarCollapsed ? item.label : ''"
        >
          <component :is="item.icon" :size="18" />{{ item.label }}
        </RouterLink>
        <div v-if="navChildItems(item.key).length" class="sub-nav">
          <RouterLink
            v-for="child in navChildItems(item.key)"
            :key="child.key"
            class="sidebar-link sub-nav-button"
            :class="{active: isActive(child.key)}"
            :to="navToPath(child.key)"
            :title="sidebarCollapsed ? child.label : ''"
            >
            <span>{{ child.label }}</span>
          </RouterLink>
        </div>
      </div>
    </nav>
  </aside>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Mail, PanelLeftClose, PanelLeftOpen } from 'lucide-vue-next'
import { navToPath } from '../navigation'
import { useAppStore } from '../state/useAppStore'

const appStore = useAppStore()
const { sidebarCollapsed } = storeToRefs(appStore)

const route = useRoute()

const availablePrimaryNavItems = computed(() => appStore.availablePrimaryNavItems)

function navChildItems(parentKey: string) {
  return appStore.navChildItems(parentKey)
}

function toggleSidebar(): void {
  appStore.toggleSidebar()
}

function isActive(key: string): boolean {
  return route.path === navToPath(key) || route.path.startsWith(`/${key}/`)
}


</script>
