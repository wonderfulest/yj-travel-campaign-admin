<template>

<section v-if="canAccessNav('imports') && state.activeNav === 'customers' && state.customerTool === 'imports'" class="utility-page">
            <article class="ops-panel">
              <div class="panel-title">
                <FileUp :size="19" />
                <h3>客户 JSON 导入</h3>
              </div>
              <div class="upload-box">
                <Globe2 :size="24" />
                <input type="file" accept=".json,application/json" @change="onFileChange" />
                <span>{{ state.importFile?.name || '选择客户 JSON 文件' }}</span>
              </div>
              <button class="secondary-action" :disabled="state.loading" @click="importCustomerJson">开始导入</button>
              <dl v-if="state.importResult" class="result-list">
                <div><dt>成功</dt><dd>{{ state.importResult.successCount }}</dd></div>
                <div><dt>重复</dt><dd>{{ state.importResult.duplicateCount }}</dd></div>
                <div><dt>失败</dt><dd>{{ state.importResult.failedCount }}</dd></div>
              </dl>
              <div v-if="state.importResult?.errors?.length" class="import-errors">
                <p>失败明细</p>
                <ul>
                  <li v-for="error in state.importResult.errors" :key="error.index + ':' + (error.externalId || error.message)">
                    第 {{ error.index }} 条{{ error.externalId ? '（' + error.externalId + '）' : '' }}：{{ error.message }}
                  </li>
                </ul>
              </div>
            </article>
        </section>
</template>
<script setup lang="ts">
import { FileUp, Globe2 } from 'lucide-vue-next'
import * as admin from '../../state/adminApp'

const {
  state,
  canAccessNav,
  onFileChange,
  importCustomerJson
} = admin
</script>
