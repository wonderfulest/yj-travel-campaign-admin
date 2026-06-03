<template>
  <section class="stats-grid tracking-stats">
    <button class="stat-card" type="button">
      <BarChart3 :size="22" />
      <span>总点击</span>
      <strong>{{ summary.totalClicks || 0 }}</strong>
    </button>
    <button class="stat-card" type="button">
      <Users :size="22" />
      <span>已点击客户</span>
      <strong>{{ summary.clickedCustomers || 0 }}</strong>
    </button>
    <button class="stat-card" type="button">
      <ExternalLink :size="22" />
      <span>短链数</span>
      <strong>{{ summary.shortLinks || 0 }}</strong>
    </button>
    <button class="stat-card" type="button">
      <CheckCircle2 :size="22" />
      <span>客户点击率</span>
      <strong>{{ percentValue(summary.clickRate) }}</strong>
    </button>
  </section>
</template>
<script setup lang="ts">
import { BarChart3, CheckCircle2, ExternalLink, Users } from 'lucide-vue-next'
import { percentValue } from '../../utils/format'
import type { TrackingSummary } from '../../types'

defineProps<{
  summary: TrackingSummary
}>()
</script>
