<template>

<section class="mapping-page">
          <article class="table-panel">
            <div class="panel-header">
              <div>
                <h3>OSM 来源 Mapping 预览</h3>
                <p>只处理当前租户未绑定客户资产的 OSM 来源记录；确认后写入客户资产主表</p>
              </div>
              <div class="panel-actions">
                <button class="secondary-action compact" :disabled="state.loading" @click="loadMappingPreview">刷新预览</button>
                <button class="primary-action compact" :disabled="state.loading || !state.mappingPreview?.unmappedCount" @click="runOsmMapping">
                  确认写入主表
                </button>
              </div>
            </div>
            <div class="mapping-summary">
              <div><span>待处理来源</span><strong>{{ state.mappingPreview?.unmappedCount || 0 }}</strong></div>
              <div><span>预计新增</span><strong>{{ state.mappingPreview?.newCount || 0 }}</strong></div>
              <div><span>预计更新</span><strong>{{ state.mappingPreview?.updateCount || 0 }}</strong></div>
              <div><span>预计跳过</span><strong>{{ state.mappingPreview?.skippedCount || 0 }}</strong></div>
            </div>
            <div v-if="!state.mappingPreview?.items?.length" class="empty-state">
              <GitMerge :size="24" />
              <strong>暂无待 Mapping 的 OSM 来源</strong>
              <span>先导入 OSM JSON/GeoJSON，或刷新预览确认当前来源状态</span>
            </div>
            <div v-else class="data-table">
              <table>
                <thead>
                  <tr>
                    <th>来源对象</th>
                    <th>名称</th>
                    <th>邮箱</th>
                    <th>地区</th>
                    <th>动作</th>
                    <th>原因</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in state.mappingPreview.items" :key="item.sourceId">
                    <td>
                      <strong>{{ item.sourceObjectId }}</strong>
                      <span>{{ item.sourceId }}</span>
                    </td>
                    <td>{{ item.name || '未命名客户' }}</td>
                    <td>{{ item.email || '待补充' }}</td>
                    <td>{{ item.country || '-' }} / {{ item.city || '-' }}</td>
                    <td><span class="status">{{ item.action }}</span></td>
                    <td>{{ item.reason }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>

          <aside class="ops-stack">
            <article class="ops-panel">
              <div class="panel-title">
                <GitMerge :size="19" />
                <h3>执行结果</h3>
              </div>
              <dl class="result-list expanded" v-if="state.mappingResult">
                <div><dt>处理来源</dt><dd>{{ state.mappingResult.totalCount }}</dd></div>
                <div><dt>新增客户</dt><dd>{{ state.mappingResult.createdCount }}</dd></div>
                <div><dt>更新客户</dt><dd>{{ state.mappingResult.updatedCount }}</dd></div>
                <div><dt>跳过</dt><dd>{{ state.mappingResult.skippedCount }}</dd></div>
              </dl>
              <div v-else class="mapping-note">
                <strong>默认策略</strong>
                <span>来源对象或标准化邮箱命中已有客户时补全空字段；未命中时新建客户资产。</span>
              </div>
            </article>
          </aside>
        </section>
</template>
<script setup lang="ts">
import { onMounted, proxyRefs } from 'vue'
import { storeToRefs } from 'pinia'
import { GitMerge } from 'lucide-vue-next'
import { useAppStore } from '../../state/useAppStore'
import { loadMappingPreview, runOsmMapping, useCustomerStore } from '../../state/useCustomerStore'

const appStore = useAppStore()
const customerStore = useCustomerStore()
const state = proxyRefs({
  ...storeToRefs(appStore),
  ...storeToRefs(customerStore)
})

onMounted(() => {
  void loadMappingPreview()
})
</script>
