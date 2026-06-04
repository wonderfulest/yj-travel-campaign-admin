<template>
  <section class="utility-page import-page">
    <article class="ops-panel">
      <div class="panel-title">
        <FileUp :size="19" />
        <h3>客户数据导入</h3>
      </div>

      <div class="import-mode-tabs" role="tablist" aria-label="客户数据导入方式">
        <button
          type="button"
          :class="{ active: activeImportTab === 'api' }"
          role="tab"
          :aria-selected="activeImportTab === 'api'"
          @click="selectImportTab('api')"
        >
          <Plug :size="16" />
          API 导入
        </button>
        <button
          type="button"
          :class="{ active: activeImportTab === 'json' }"
          role="tab"
          :aria-selected="activeImportTab === 'json'"
          @click="selectImportTab('json')"
        >
          <Braces :size="16" />
          JSON 导入
        </button>
        <button
          type="button"
          :class="{ active: activeImportTab === 'excel' }"
          role="tab"
          :aria-selected="activeImportTab === 'excel'"
          @click="selectImportTab('excel')"
        >
          <FileSpreadsheet :size="16" />
          Excel 文件导入
        </button>
      </div>

      <section v-if="activeImportTab === 'api'" class="import-tab-panel" role="tabpanel">
        <div class="panel-header flush">
          <div>
            <h3>通过接口导入</h3>
            <p>外部系统可用租户 Secret Key 直接推送客户 JSON。</p>
          </div>
          <div class="panel-actions">
            <button
              class="secondary-action compact"
              type="button"
              :disabled="state.loading"
              @click="loadTenantApiSecretStatus"
            >
              刷新状态
            </button>
            <button
              class="primary-action compact"
              type="button"
              :disabled="state.loading"
              @click="rotateTenantApiSecret"
            >
              生成 / 重置 Secret Key
            </button>
          </div>
        </div>
        <dl class="settings-list api-import-meta">
          <div><dt>接口地址</dt><dd>{{ customerApiImportPath }}</dd></div>
          <div><dt>租户 ID</dt><dd>{{ state.user?.tenantId }}</dd></div>
          <div>
            <dt>Secret 状态</dt>
            <dd>
              {{ state.tenantApiSecretStatus?.configured ? "已配置" : "未配置" }}
              <span v-if="state.tenantApiSecretStatus?.lastRotatedAt">
                （{{ state.tenantApiSecretStatus.lastRotatedAt }}）
              </span>
            </dd>
          </div>
          <div v-if="state.tenantApiSecretKey"><dt>本次 Secret Key</dt><dd>{{ state.tenantApiSecretKey }}</dd></div>
        </dl>
        <section class="import-sample api-import-sample" aria-label="接口导入请求示例">
          <div class="import-sample-header">
            <strong>请求示例</strong>
            <span>Header 必填：X-Tenant-Id / X-Tenant-Secret</span>
          </div>
          <pre><code>POST {{ customerApiImportPath }}
Content-Type: application/json
X-Tenant-Id: {{ state.user?.tenantId || "your_tenant_id" }}
X-Tenant-Secret: {{ state.tenantApiSecretKey || "yj_live_xxx" }}

{
  "records": [
    {
      "externalId": "lead-001",
      "name": "Reisen Scala",
      "email": "info@scala-bts.de",
      "phone": "+49 30 89048330",
      "website": "https://www.scala-bts.de/"
    }
  ]
}</code></pre>
        </section>
      </section>

      <section v-else-if="activeImportTab === 'json'" class="import-tab-panel" role="tabpanel">
        <div class="upload-box">
          <Braces :size="24" />
          <input type="file" accept=".json,application/json" multiple @change="onFileChange" />
          <span>{{ selectedImportFileLabel('json') }}</span>
        </div>
        <section class="import-sample" aria-label="客户 JSON 示例结构">
          <div class="import-sample-header">
            <strong>客户 JSON 示例结构</strong>
            <span>顶层必须是对象，records 必须是数组</span>
          </div>
          <pre><code>{
  "records": [
    {
      "externalId": "lead-001",
      "name": "Reisen Scala",
      "email": "info@scala-bts.de",
      "phone": "+49 30 89048330",
      "website": "https://www.scala-bts.de/",
      "country": "DE",
      "city": "Berlin",
      "postcode": "10711",
      "street": "Kurfürstendamm",
      "houseNumber": "133",
      "businessScope": "Travel agency",
      "longitude": 13.2934005,
      "latitude": 52.497262
    }
  ]
}</code></pre>
          <p>每条记录至少要有 name / email / phone / website 之一；externalId 有值时优先作为幂等键。</p>
        </section>
        <button class="secondary-action" type="button" :disabled="state.loading" @click="importCustomerFile('json')">导入 JSON</button>
        <ImportProgress />
        <ImportResultSummary />
      </section>

      <section v-else class="import-tab-panel" role="tabpanel">
        <div class="upload-box">
          <FileSpreadsheet :size="24" />
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            @change="onFileChange"
          />
          <span>{{ selectedImportFileLabel('excel') }}</span>
        </div>
        <section class="import-sample" aria-label="客户 Excel 模板">
          <div class="import-sample-header">
            <strong>客户 Excel 模板</strong>
            <button class="row-action" type="button" :disabled="state.loading" @click="downloadCustomerExcelTemplate">
              <Download :size="15" />
              下载模板
            </button>
          </div>
          <p>Excel 首行字段：externalId、name、email、phone、website、country、city、postcode、street、houseNumber、businessScope、longitude、latitude。</p>
        </section>
        <button class="secondary-action" type="button" :disabled="state.loading" @click="importCustomerFile('excel')">导入 Excel</button>
        <ImportProgress />
        <ImportResultSummary />
      </section>
    </article>
  </section>
</template>

<script setup lang="ts">
import { Braces, Download, FileSpreadsheet, FileUp, Plug } from 'lucide-vue-next'
import { defineComponent, h, proxyRefs, ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../../state/useAppStore'
import {
  CUSTOMER_API_IMPORT_PATH as customerApiImportPath,
  downloadCustomerExcelTemplate,
  importCustomerFile,
  loadTenantApiSecretStatus,
  onFileChange,
  rotateTenantApiSecret,
  useCustomerStore
} from '../../state/useCustomerStore'

const appStore = useAppStore()
const customerStore = useCustomerStore()
const state = proxyRefs({
  ...storeToRefs(appStore),
  ...storeToRefs(customerStore)
})

onMounted(() => {
  void loadTenantApiSecretStatus()
})

type ImportTab = 'api' | 'json' | 'excel'

const activeImportTab = ref<ImportTab>('api')

function selectImportTab(tab: ImportTab): void {
  activeImportTab.value = tab
  state.importFile = null
  state.importFiles = []
  state.importProgress = {
    totalFiles: 0,
    completedFiles: 0,
    currentFileName: '',
    percent: 0
  }
  state.importResult = null
}

function selectedImportFileLabel(type: 'json' | 'excel'): string {
  const files = Array.isArray(state.importFiles) ? state.importFiles : []
  if (files.length === 0) return type === 'json' ? '选择客户 JSON 文件，可多选' : '选择客户 Excel 文件'
  if (files.length === 1) return files[0]?.name || ''
  return `已选择 ${files.length} 个 JSON 文件，将按顺序逐个导入`
}

const ImportProgress = defineComponent({
  name: 'ImportProgress',
  setup() {
    return () => {
      const progress = state.importProgress
      if (!state.loading || !progress?.totalFiles) return null
      const percent = Math.min(100, Math.max(0, Number(progress.percent || 0)))
      return h('div', { class: 'import-progress', role: 'status', 'aria-live': 'polite' }, [
        h('div', { class: 'import-progress-meta' }, [
          h('span', `导入进度 ${percent}%`),
          h('span', `第 ${progress.completedFiles + 1 > progress.totalFiles ? progress.totalFiles : progress.completedFiles + 1}/${progress.totalFiles} 个文件`)
        ]),
        h('div', { class: 'import-progress-track', 'aria-hidden': 'true' }, [
          h('div', { class: 'import-progress-fill', style: { width: `${percent}%` } })
        ]),
        progress.currentFileName
          ? h('small', `正在导入：${progress.currentFileName}`)
          : null
      ])
    }
  }
})

const ImportResultSummary = defineComponent({
  name: 'ImportResultSummary',
  setup() {
    const errorText = (error: string | { index?: number; externalId?: string; message?: string }): string => {
      if (typeof error === 'string') return error
      const prefix = error.index !== undefined
        ? `第 ${error.index} 条${error.externalId ? `（${error.externalId}）` : ''}：`
        : ''
      return `${prefix}${error.message || '导入失败'}`
    }

    return () => {
      const result = state.importResult
      if (!result) return null
      const errors = Array.isArray(result.errors) ? result.errors : []
      return h('div', [
        h('dl', { class: 'result-list' }, [
          h('div', [h('dt', '成功'), h('dd', String(result.successCount ?? result.importedCount ?? 0))]),
          h('div', [h('dt', '重复'), h('dd', String(result.duplicateCount ?? 0))]),
          h('div', [h('dt', '失败'), h('dd', String(result.failedCount ?? errors.length))])
        ]),
        errors.length
          ? h('div', { class: 'import-errors' }, [
            h('p', '失败明细'),
            h('ul', errors.map((error, index) => h('li', { key: `${index}:${errorText(error)}` }, errorText(error))))
          ])
          : null
      ])
    }
  }
})
</script>
