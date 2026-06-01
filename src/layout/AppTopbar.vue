<template>

    <header class="topbar">
      <div>
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
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { LogOut, ShieldCheck } from 'lucide-vue-next'
import { navItems, useAppStore } from '../state/useAppStore'

const appStore = useAppStore()
const { primaryRoleLabel, user } = storeToRefs(appStore)

const route = useRoute()
const { logout } = appStore

const pageMeta = computed(() => {
  const seg = route.path.replace(/^\//, '').split('/')[0]
  return navItems.find((item) => item.key === seg) || navItems[0]
})
</script>
