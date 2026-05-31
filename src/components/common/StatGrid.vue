<template>

    <section class="stats-grid">
      <button
        v-for="item in stats"
        :key="item.label"
        class="stat-card"
        type="button"
        :disabled="!canAccessNav(item.target)"
        @click="openStatTarget(item)"
      >
        <component :is="item.icon" :size="20" />
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </button>
    </section>
</template>
<script setup lang="ts">
import * as admin from '../../state/index'

const { stats, canAccessNav, openStatTarget } = admin
</script>
