<template>

    <header class="topbar">
      <div>
        <h2>{{ pageMeta.title }}</h2>
        <p>{{ pageMeta.description }}</p>
      </div>
      <div class="tenant-chip">
        <ShieldCheck :size="17" />
        <span>{{ primaryRoleLabel }}</span>
        <strong>{{ state.user?.email }}</strong>
        <button class="icon-button" @click="logout" title="退出登录"><LogOut :size="17" /></button>
      </div>
    </header>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { LogOut, ShieldCheck } from 'lucide-vue-next'
import { navItems } from '../state/useAppStore'
import * as admin from '../state/index'

const route = useRoute()
const { state, primaryRoleLabel, logout } = admin

const pageMeta = computed(() => {
  const seg = route.path.replace(/^\//, '').split('/')[0]
  return navItems.find((item) => item.key === seg) || navItems[0]
})
</script>
