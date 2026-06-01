<template>

    <section class="stats-grid">
      <button
        v-for="item in stats"
        :key="item.label"
        class="stat-card"
        type="button"
        :disabled="!canAccessNav(item.target, appStore)"
        @click="openStatTarget(item)"
      >
        <component :is="item.icon" :size="20" />
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </button>
    </section>
</template>
<script setup lang="ts">
import { canAccessNav, useAppStore } from '../../state/useAppStore'
import { openStatTarget, stats } from '../../state/useUiStore'

const appStore = useAppStore()
</script>
