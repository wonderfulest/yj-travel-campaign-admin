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
import { LogOut, ShieldCheck } from 'lucide-vue-next'
import * as admin from '../state/index'

const {
  state,
  pageMeta,
  primaryRoleLabel,
  logout
} = admin
</script>
