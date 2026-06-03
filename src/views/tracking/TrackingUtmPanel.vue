<template>
  <article class="ops-panel tracking-utm">
    <div class="panel-title">
      <Layers :size="19" />
      <h3>UTM 维度</h3>
    </div>
    <div class="data-table compact-table">
      <table>
        <thead>
          <tr>
            <th>维度</th>
            <th>点击</th>
            <th>客户</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in utmStats" :key="item.dimension">
            <td>{{ item.dimension || '-' }}</td>
            <td>{{ item.clicks }}</td>
            <td>{{ item.customers }}</td>
          </tr>
          <tr v-if="!utmStats.length">
            <td colspan="3">暂无 UTM 点击数据</td>
          </tr>
        </tbody>
      </table>
    </div>
  </article>
</template>
<script setup lang="ts">
import { Layers } from 'lucide-vue-next'
import type { TrackingUtmStat } from '../../types'

defineProps<{
  utmStats: TrackingUtmStat[]
}>()
</script>
