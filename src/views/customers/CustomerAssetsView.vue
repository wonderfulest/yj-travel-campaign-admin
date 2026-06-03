<template>
  <section class="main-grid single-column">
    <article class="table-panel">
      <div class="panel-header">
        <div>
          <h3>客户资产库</h3>
          <p>
            当前列表展示主表；客户 JSON 导入先写来源表，再按合并规则补全主表
          </p>
        </div>
        <div class="panel-actions">
          <button
            class="primary-action compact"
            type="button"
            :disabled="state.loading"
            @click="openCustomerCreate"
          >
            <Plus :size="15" />
            手动录入
          </button>
          <button
            class="secondary-action compact"
            type="button"
            :disabled="state.loading || state.customerSearchIndexSyncing"
            @click="syncCustomerSearchIndex"
          >
            <RefreshCw :size="15" :class="{ spinning: state.customerSearchIndexSyncing }" />
            {{ state.customerSearchIndexSyncing ? "同步中" : "同步搜索索引" }}
          </button>
          <label class="search-box">
            <Search :size="16" />
            <input v-model="state.filter" placeholder="搜索名称、邮箱、国家" @input="searchCustomers" />
          </label>
        </div>
      </div>
      <div class="data-table">
        <table>
          <thead>
            <tr>
              <th>旅行社</th>
              <th>邮箱</th>
              <th>地区</th>
              <th>状态</th>
              <th>来源</th>
              <th>坐标</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="customer in filteredCustomers"
              :key="customer.id"
              :class="{ selected: state.selectedCustomer?.id === customer.id }"
            >
              <td>
                <strong>{{ customer.name || "未命名客户" }}</strong>
                <a
                  v-if="customer.website"
                  class="customer-website"
                  :href="normalizedWebsiteUrl(customer.website)"
                  target="_blank"
                  rel="noopener noreferrer"
                  :title="customer.website"
                >
                  {{ formatWebsiteLabel(customer.website) }}
                </a>
                <span v-else>{{ customer.phone || "-" }}</span>
              </td>
              <td>{{ customer.email || "待补充" }}</td>
              <td>
                {{ customer.country || "-" }} / {{ customer.city || "-" }}
              </td>
              <td>
                <div class="status-stack" aria-label="客户状态">
                  <span :class="['status', statusTone(customer.contactStatus)]">
                    {{ statusLabel(customer.contactStatus || "NOT_CONTACTED") }}
                  </span>
                  <span :class="['status', statusTone(customer.emailQuality)]">
                    {{ statusLabel(customer.emailQuality || "PENDING") }}
                  </span>
                </div>
              </td>
              <td>
                <span :class="['status', sourceTone(customer.sourcePrimary)]">
                  {{ sourceLabel(customer.sourcePrimary) }}
                </span>
              </td>
              <td class="coord">
                <MapPin :size="14" />
                {{ customer.longitude || "-" }}, {{ customer.latitude || "-" }}
              </td>
              <td>
                <button
                  class="row-action"
                  type="button"
                  :disabled="state.loading"
                  @click="openCustomerDetail(customer)"
                >
                  <Eye :size="14" />
                  详情
                </button>
                <button
                  class="row-action"
                  type="button"
                  :disabled="state.loading"
                  @click="openCustomerEdit(customer)"
                >
                  <Pencil :size="14" />
                  编辑
                </button>
                <button
                  class="row-action danger"
                  type="button"
                  :disabled="state.loading"
                  @click="deleteCustomer(customer)"
                >
                  <Trash2 :size="14" />
                  删除
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="pagination-bar">
        <div class="pagination-meta">
          <span>
            共 {{ state.customerPage.totalItems }} 条，当前第
            {{
              state.customerPage.totalPages ? state.customerPage.page + 1 : 0
            }}
            / {{ state.customerPage.totalPages }} 页
          </span>
          <label class="page-size-control">
            每页
            <select
              v-model.number="state.customerPage.size"
              @change="changeCustomerPageSize(state.customerPage.size)"
            >
              <option v-for="size in pageSizeOptions" :key="size" :value="size">
                {{ size }}
              </option>
            </select>
            条
          </label>
        </div>
        <div class="pagination-actions">
          <form
            class="page-jump-control"
            @submit.prevent="
              jumpCustomerPage($event.target.elements.page.value)
            "
          >
            <label
              >跳至<input
                name="page"
                type="number"
                min="1"
                :max="state.customerPage.totalPages || 1"
                :value="state.customerPage.page + 1"
            /></label>
            <button type="submit" :disabled="!state.customerPage.totalPages">
              跳转
            </button>
          </form>
          <button
            type="button"
            :disabled="!state.customerPage.hasPrevious"
            @click="changeCustomerPage(state.customerPage.page - 1)"
          >
            上一页
          </button>
          <button
            type="button"
            :disabled="!state.customerPage.hasNext"
            @click="changeCustomerPage(state.customerPage.page + 1)"
          >
            下一页
          </button>
        </div>
      </div>
    </article>

    <CustomerAssetDialog />
  </section>
</template>
<script setup lang="ts">
import { proxyRefs, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import {
  Eye,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-vue-next";
import { useAppStore } from '../../state/useAppStore'
import {
  changeCustomerPage,
  changeCustomerPageSize,
  deleteCustomer,
  filteredCustomers,
  jumpCustomerPage,
  loadCustomers,
  openCustomerCreate,
  openCustomerDetail,
  openCustomerEdit,
  searchCustomers,
  syncCustomerSearchIndex,
  useCustomerStore
} from '../../state/useCustomerStore'
import { formatWebsiteLabel, normalizedWebsiteUrl, statusLabel } from '../../utils/format'
import { PAGE_SIZE_OPTIONS as pageSizeOptions } from '../../utils/pagination'
import CustomerAssetDialog from "../../components/customers/CustomerAssetDialog.vue";

const appStore = useAppStore()
const customerStore = useCustomerStore()
const state = proxyRefs({
  ...storeToRefs(appStore),
  ...storeToRefs(customerStore)
})

onMounted(() => {
  void loadCustomers()
})

function statusTone(status: string | undefined): string {
  const value = String(status || '').toUpperCase()
  if (['VERIFIED', 'CONTACTED'].includes(value)) return 'success'
  if (['READY_TO_VERIFY', 'PENDING', 'NOT_CONTACTED'].includes(value)) return 'warning'
  if (['BOUNCED', 'INVALID', 'UNSUBSCRIBED', 'MISSING'].includes(value)) return 'danger'
  return 'neutral'
}

function sourceTone(source: string | undefined): string {
  const value = String(source || '').toUpperCase()
  if (value === 'MANUAL') return 'success'
  if (['JSON', 'EXCEL', 'API', 'CUSTOMER_JSON', 'CUSTOMER_EXCEL', 'CUSTOMER_API'].includes(value)) return 'info'
  return 'neutral'
}

function sourceLabel(source: string | undefined): string {
  const labels: Record<string, string> = {
    OSM: '地图来源',
    MANUAL: '手动录入',
    JSON: 'JSON 导入',
    EXCEL: 'Excel 导入',
    API: '接口导入',
    CUSTOMER_JSON: 'JSON 导入',
    CUSTOMER_EXCEL: 'Excel 导入',
    CUSTOMER_API: '接口导入'
  }
  const value = String(source || 'OSM').toUpperCase()
  return labels[value] || value
}
</script>
