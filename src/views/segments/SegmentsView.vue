<template>
  <section v-if="canAccessNav('segments') && state.activeNav === 'segments'" class="main-grid single-column">
    <article class="table-panel">
      <div class="panel-header">
        <div>
          <h3>客户群</h3>
          <p>客群规则由后端规则引擎执行，刷新后写入客户群成员关系表</p>
        </div>
        <button class="secondary-action compact" type="button" @click="openNewSegmentEditor">新建客群</button>
      </div>
      <div class="data-table">
        <table>
          <thead>
            <tr>
              <th>客群</th>
              <th>ID</th>
              <th>规则</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="segment in state.segments" :key="segment.id" :class="{ selected: state.selectedSegment?.id === segment.id }">
              <td><strong>{{ segment.name }}</strong><span>{{ segment.description || '-' }}</span></td>
              <td>{{ segment.id }}</td>
              <td>
                <span v-if="segment.rules?.conditions?.length">{{ segment.rules.conditions.length }} 条条件 (AND)</span>
                <span v-else class="muted">无规则</span>
              </td>
              <td><span class="status">{{ segment.status }}</span></td>
              <td>
                <button class="row-action" type="button" @click="openSegmentEditor(segment)">维护</button>
                <button class="row-action" type="button" @click="refreshSegment(segment.id)">
                  <RefreshCw :size="14" />
                  刷新成员
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="pagination-bar">
        <div class="pagination-meta">
          <span>共 {{ state.segmentPage.totalItems }} 条，当前第 {{ state.segmentPage.totalPages ? state.segmentPage.page + 1 : 0 }} / {{ state.segmentPage.totalPages }} 页</span>
          <label class="page-size-control">
            每页
            <select v-model.number="state.segmentPage.size" @change="changeSegmentPageSize(state.segmentPage.size)">
              <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
            </select>
            条
          </label>
        </div>
        <div class="pagination-actions">
          <form class="page-jump-control" @submit.prevent="jumpSegmentPage($event.target.elements.page.value)">
            <label>跳至<input name="page" type="number" min="1" :max="state.segmentPage.totalPages || 1" :value="state.segmentPage.page + 1" /></label>
            <button type="submit" :disabled="!state.segmentPage.totalPages">跳转</button>
          </form>
          <button type="button" :disabled="!state.segmentPage.hasPrevious" @click="changeSegmentPage(state.segmentPage.page - 1)">上一页</button>
          <button type="button" :disabled="!state.segmentPage.hasNext" @click="changeSegmentPage(state.segmentPage.page + 1)">下一页</button>
        </div>
      </div>

      <div class="panel-header secondary-header">
        <div>
          <h3>客群成员</h3>
          <p>展示最近一次规则刷新后写入关系表的客户</p>
        </div>
        <div v-if="state.segmentRefreshResult" class="segment-refresh-summary">
          <span>命中 {{ state.segmentRefreshResult.matchedCount }}</span>
          <span>排除 {{ state.segmentRefreshResult.excludedCount }}</span>
        </div>
      </div>
      <div class="data-table compact-table">
        <table>
          <thead>
            <tr>
              <th>成员 ID</th>
              <th>客户</th>
              <th>邮箱</th>
              <th>地区</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="member in state.segmentMembers" :key="member.memberId">
              <td>{{ member.memberId }}</td>
              <td>{{ member.customerName || member.customerId }}</td>
              <td>{{ member.email || '-' }}</td>
              <td>{{ member.country || '-' }} / {{ member.city || '-' }}</td>
              <td><span class="status">{{ member.contactStatus }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="pagination-bar compact-pagination">
        <div class="pagination-meta">
          <span>共 {{ state.segmentMemberPage.totalItems }} 条，当前第 {{ state.segmentMemberPage.totalPages ? state.segmentMemberPage.page + 1 : 0 }} / {{ state.segmentMemberPage.totalPages }} 页</span>
          <label class="page-size-control">
            每页
            <select v-model.number="state.segmentMemberPage.size" @change="changeSegmentMemberPageSize(state.segmentMemberPage.size)">
              <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
            </select>
            条
          </label>
        </div>
        <div class="pagination-actions">
          <form class="page-jump-control" @submit.prevent="jumpSegmentMemberPage($event.target.elements.page.value)">
            <label>跳至<input name="page" type="number" min="1" :max="state.segmentMemberPage.totalPages || 1" :value="state.segmentMemberPage.page + 1" /></label>
            <button type="submit" :disabled="!state.segmentMemberPage.totalPages">跳转</button>
          </form>
          <button type="button" :disabled="!state.segmentMemberPage.hasPrevious" @click="changeSegmentMemberPage(state.segmentMemberPage.page - 1)">上一页</button>
          <button type="button" :disabled="!state.segmentMemberPage.hasNext" @click="changeSegmentMemberPage(state.segmentMemberPage.page + 1)">下一页</button>
        </div>
      </div>
    </article>

    <div v-if="segmentEditorOpen" class="modal-backdrop" @click.self="closeSegmentEditor">
      <section class="modal-panel segment-modal" role="dialog" aria-modal="true" aria-labelledby="segment-modal-title">
        <div class="modal-header">
          <div>
            <h3 id="segment-modal-title">{{ state.segmentForm.id ? '维护客群' : '新建客群' }}</h3>
            <p>填写名称、说明和动态规则，保存后同步后端。</p>
          </div>
          <button class="secondary-action compact" type="button" @click="closeSegmentEditor">关闭</button>
        </div>
        <form class="ops-form segment-form" @submit.prevent="submitSegment">
          <label>客群名称<input v-model="state.segmentForm.name" required /></label>
          <label>说明<input v-model="state.segmentForm.description" /></label>
          <div class="rule-editor">
            <div class="rule-editor-header">
              <span>动态规则 <em class="rule-logic-badge">AND</em></span>
              <button type="button" class="rule-add-btn" @click="addRule">+ 添加条件</button>
            </div>
            <div v-if="state.segmentForm.rules.length === 0" class="rule-empty">暂无动态条件</div>
            <div v-for="(rule, idx) in state.segmentForm.rules" :key="idx" class="rule-row">
              <select v-model="rule.field" class="rule-select rule-field">
                <option v-for="f in ruleFields" :key="f.value" :value="f.value">{{ f.label }}</option>
              </select>
              <select v-model="rule.op" class="rule-select rule-op">
                <option v-for="o in ruleOps" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>

              <CountryMultiSelect
                v-if="rule.field === 'country' && ruleOpHasValue(rule.op)"
                v-model="rule._countryValues"
                :multiple="ruleOpIsMulti(rule.op)"
              />

              <input
                v-else-if="ruleOpHasValue(rule.op)"
                v-model="rule._valueText"
                class="rule-value"
                :placeholder="ruleOpIsMulti(rule.op) ? 'DE,FR,GB' : '值'"
              />
              <div v-else class="rule-value rule-empty-value">该条件不需要输入值</div>

              <button type="button" class="rule-remove-btn" @click="removeRule(idx)" title="删除条件">✕</button>
            </div>
            <div v-if="state.segmentForm.rules.length > 0" class="rule-json-preview">
              <span>预览 JSON：</span>
              <code>{{ JSON.stringify(buildRules(state.segmentForm.rules), null, 0) }}</code>
            </div>
          </div>

          <div class="modal-actions">
            <button class="secondary-action" type="button" :disabled="state.loading" @click="closeSegmentEditor">取消</button>
            <button class="primary-action" type="submit" :disabled="state.loading">保存客群</button>
          </div>
          <button
            class="secondary-action"
            type="button"
            :disabled="state.loading || !state.segmentForm.id"
            @click="refreshSegment()"
          >
            刷新成员关系
          </button>
        </form>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { RefreshCw } from 'lucide-vue-next'
import * as admin from '../../state/adminApp'
import CountryMultiSelect from '../../components/common/CountryMultiSelect.vue'

const {
  state,
  canAccessNav,
  PAGE_SIZE_OPTIONS: pageSizeOptions,
  resetSegmentForm,
  fillSegmentForm,
  refreshSegment,
  changeSegmentPageSize,
  jumpSegmentPage,
  changeSegmentPage,
  changeSegmentMemberPageSize,
  jumpSegmentMemberPage,
  changeSegmentMemberPage,
  saveSegment,
  RULE_FIELDS: ruleFields,
  RULE_OPS: ruleOps,
  ruleOpHasValue,
  ruleOpIsMulti,
  addRule,
  removeRule,
  buildRules
} = admin

const segmentEditorOpen = ref(false)

function openNewSegmentEditor() {
  resetSegmentForm()
  segmentEditorOpen.value = true
}

function closeSegmentEditor() {
  segmentEditorOpen.value = false
}

function openSegmentEditor(segment) {
  fillSegmentForm(segment)
  segmentEditorOpen.value = true
}

async function submitSegment() {
  await saveSegment()
  if (!state.error) {
    segmentEditorOpen.value = false
  }
}
</script>
