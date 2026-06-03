<template>
  <article class="ops-panel tracking-rank">
    <div class="panel-title">
      <ExternalLink :size="19" />
      <h3>短链排行</h3>
    </div>
    <div class="data-table compact-table">
      <table>
        <thead>
          <tr>
            <th>短链</th>
            <th>目标链接</th>
            <th>点击</th>
            <th>客户</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="link in linkStats" :key="link.shortLinkId">
            <td>{{ link.shortUrl }}</td>
            <td>{{ link.finalUrl }}</td>
            <td>{{ link.clicks }}</td>
            <td>{{ link.customers }}</td>
          </tr>
          <tr v-if="!linkStats.length">
            <td colspan="4">暂无短链排行数据</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="pagination-bar">
      <div class="pagination-meta">
        <span>共 {{ linkPage.totalItems }} 条，当前第 {{ linkPage.totalPages ? linkPage.page + 1 : 0 }} / {{ linkPage.totalPages }} 页</span>
        <label class="page-size-control">
          每页
          <select v-model.number="linkPage.size" @change="changeTrackingLinkPageSize(linkPage.size)">
            <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
          </select>
          条
        </label>
      </div>
      <div class="pagination-actions">
        <form class="page-jump-control" @submit.prevent="jumpTrackingLinkPage($event.target.elements.page.value)">
          <label>跳至<input name="page" type="number" min="1" :max="linkPage.totalPages || 1" :value="linkPage.page + 1" /></label>
          <button type="submit" :disabled="!linkPage.totalPages">跳转</button>
        </form>
        <button type="button" :disabled="!linkPage.hasPrevious" @click="changeTrackingLinkPage(linkPage.page - 1)">上一页</button>
        <button type="button" :disabled="!linkPage.hasNext" @click="changeTrackingLinkPage(linkPage.page + 1)">下一页</button>
      </div>
    </div>
  </article>
</template>
<script setup lang="ts">
import { ExternalLink } from 'lucide-vue-next'
import {
  changeTrackingLinkPage,
  changeTrackingLinkPageSize,
  jumpTrackingLinkPage
} from '../../state/useTrackingStore'
import { PAGE_SIZE_OPTIONS as pageSizeOptions } from '../../utils/pagination'
import type { TrackingLinkStat } from '../../types'

defineProps<{
  linkStats: TrackingLinkStat[]
  linkPage: {
    page: number
    size: number
    totalItems: number
    totalPages: number
    hasNext: boolean
    hasPrevious: boolean
  }
}>()
</script>
