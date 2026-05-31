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
        :aria-label="state.sidebarCollapsed ? '展开菜单栏' : '收起菜单栏'"
        :title="state.sidebarCollapsed ? '展开菜单栏' : '收起菜单栏'"
        @click="toggleSidebar"
      >
        <PanelLeftOpen v-if="state.sidebarCollapsed" :size="18" />
        <PanelLeftClose v-else :size="18" />
      </button>
    </div>
    <nav>
      <div v-for="item in availablePrimaryNavItems" :key="item.key" class="nav-group">
        <RouterLink
          class="sidebar-link"
          :class="{active: state.activeNav === item.key, 'child-active': isNavItemActive(item) && state.activeNav !== item.key}"
          :to="navToPath(item.key)"
          :title="state.sidebarCollapsed ? item.label : ''"
        >
          <component :is="item.icon" :size="18" />{{ item.label }}
        </RouterLink>
        <div v-if="navChildItems(item.key).length" class="sub-nav">
          <RouterLink
            v-for="child in navChildItems(item.key)"
            :key="child.key"
            class="sidebar-link sub-nav-button"
            :class="{active: state.activeNav === child.key}"
            :to="navToPath(item.key, child.key)"
            :title="state.sidebarCollapsed ? child.label : ''"
          >
            <span>{{ child.label }}</span>
          </RouterLink>
        </div>
      </div>
    </nav>
  </aside>
</template>
<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Mail, PanelLeftClose, PanelLeftOpen } from 'lucide-vue-next'
import { navToPath } from '../navigation'
import * as admin from '../state/index'

const {
  state,
  availablePrimaryNavItems,
  navChildItems,
  isNavItemActive,
  toggleSidebar
} = admin
</script>
