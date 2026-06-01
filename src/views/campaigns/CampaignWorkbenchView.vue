<template>

<section v-if="canAccessNav('campaigns') && state.activeNav === 'campaigns'" class="campaign-workbench">
          <article class="ops-panel campaign-basics">
            <div class="panel-title">
              <Send :size="19" />
              <h3>活动与投放</h3>
              <button class="row-action" type="button" @click="openCampaignList">
                <Layers :size="14" />
                返回列表
              </button>
            </div>
            <form class="ops-form" @submit.prevent="saveCampaignSetup">
              <label>活动名称<input v-model="state.campaignForm.name" /></label>
              <label>目标说明<input v-model="state.campaignForm.objective" /></label>
              <label>邮件主题<input v-model="state.campaignForm.subject" @input="syncCampaignTemplateVariables" /></label>
              <label>发件名称<input v-model="state.campaignForm.fromName" /></label>
              <label>
                推送通道
                <select v-model="state.campaignForm.channelId">
                  <option value="">请选择通道</option>
                  <option v-for="channel in state.channels" :key="channel.id" :value="channel.id">{{ channel.name }} / {{ channel.channelType }}</option>
                </select>
              </label>
              <div class="field-block">
                客群
                <div class="campaign-segment-dropdown">
                  <button class="dropdown-trigger" type="button" @click="state.segmentDropdownOpen = !state.segmentDropdownOpen">
                    <span>{{ state.campaignForm.segmentIds.length ? '已选择 ' + state.campaignForm.segmentIds.length + ' 个客群' : '请选择客群' }}</span>
                    <ChevronDown :size="16" />
                  </button>
                  <div v-if="state.campaignForm.segmentIds.length" class="selected-segment-tags">
                    <button v-for="segment in selectedCampaignSegments()" :key="segment.id" type="button" @click="removeCampaignSegment(segment.id)">
                      {{ segment.name }}
                      <X :size="13" />
                    </button>
                  </div>
                  <div v-if="state.segmentDropdownOpen" class="dropdown-panel">
                    <input v-model="state.segmentDropdownQuery" placeholder="搜索客群名称或 ID" />
                    <button
                      v-for="segment in filteredCampaignSegments()"
                      :key="segment.id"
                      class="dropdown-option"
                      :class="{selected: isCampaignSegmentSelected(segment.id)}"
                      type="button"
                      @click="toggleCampaignSegment(segment.id)"
                    >
                      <span>
                        <strong>{{ segment.name }}</strong>
                        <small>{{ segment.id }} / {{ segment.description || '暂无说明' }}</small>
                      </span>
                      <CheckCircle2 v-if="isCampaignSegmentSelected(segment.id)" :size="16" />
                    </button>
                    <div v-if="filteredCampaignSegments().length === 0" class="dropdown-empty">暂无匹配客群</div>
                  </div>
                </div>
              </div>
              <div class="stacked-actions">
                <button class="primary-action" :disabled="state.loading">
                  <CheckCircle2 :size="17" />
                  保存活动配置
                </button>
                <button class="secondary-action" type="button" :disabled="state.loading" @click="createCampaign">
                  <Plus :size="17" />
                  创建活动
                </button>
              </div>
            </form>
          </article>

          <article class="ops-panel template-editor-panel">
            <div class="panel-title">
              <Code2 :size="19" />
              <h3>HTML 模板编辑与预览</h3>
            </div>
            <div class="template-split">
              <section class="template-split-pane">
                <div class="split-pane-header">
                  <span>HTML</span>
                  <button class="row-action" type="button" :disabled="state.templatePreviewLoading" @click="previewCampaignTemplate">
                    <Eye :size="15" />
                    渲染预览
                  </button>
                </div>
                <textarea
                  id="campaign-html-editor"
                  v-model="state.campaignForm.htmlBody"
                  class="html-editor"
                  spellcheck="false"
                  @input="syncCampaignTemplateVariables"
                ></textarea>
              </section>
              <section class="template-split-pane">
                <div class="split-pane-header">
                  <span>邮件预览</span>
                  <strong>{{ state.templatePreviewSubject || '未渲染' }}</strong>
                </div>
                <div v-if="state.templatePreviewError" class="message error preview-error">{{ state.templatePreviewError }}</div>
                <iframe
                  v-else
                  class="template-preview-frame"
                  title="邮件 HTML 预览"
                  sandbox=""
                  :srcdoc="state.templatePreviewHtml || emptyTemplatePreviewHtml"
                ></iframe>
              </section>
            </div>
            <div class="campaign-lifecycle-flow" aria-label="邮件营销活动生命周期">
              <div class="lifecycle-summary">
                <span>当前状态</span>
                <strong>{{ campaignCurrentStatusLabel }}</strong>
              </div>
              <ol class="lifecycle-steps">
                <li
                  v-for="(step, index) in campaignLifecycleView"
                  :key="step.status"
                  :class="{active: step.active, done: step.done, rollback: step.rollback}"
                >
                  <button type="button" :disabled="isCampaignStepDisabled(step)" :title="campaignStepTitle(step)" @click="rollbackCampaignStep(step)">
                    <span class="step-index">{{ index + 1 }}</span>
                    <span class="step-copy">
                      <strong>{{ step.label }}</strong>
                      <small>{{ step.hint }}</small>
                    </span>
                  </button>
                </li>
              </ol>
            </div>
            <div class="lifecycle-actions">
              <button class="primary-action lifecycle-advance" type="button" :disabled="isCampaignAdvanceDisabled()" :title="campaignAdvanceTitle()" @click="advanceCampaignStep">
                <CheckCircle2 :size="17" />
                {{ campaignAdvanceButtonLabel }}
              </button>
            </div>
            <div v-if="state.selectedCampaign?.prePushRecords?.length" class="data-table compact-table prepush-table">
              <table>
                <thead>
                  <tr>
                    <th>客户</th>
                    <th>邮箱</th>
                    <th>短链</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="record in state.selectedCampaign.prePushRecords" :key="record.customerId">
                    <td><strong>{{ record.customerName || record.customerId }}</strong><span>{{ record.segmentNames?.join(', ') }}</span></td>
                    <td>{{ record.email || '-' }}</td>
                    <td>
                      <button v-if="record.trackingShortUrl" class="link-button" type="button" @click="copyShortLink(record.trackingShortUrl)">复制短链</button>
                      <span>{{ record.trackingShortUrl || '-' }}</span>
                    </td>
                    <td><span class="status">{{ record.status }}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>

          <aside class="ops-panel template-preview-panel">
            <div class="panel-title">
              <Code2 :size="19" />
              <h3>短链与变量配置</h3>
            </div>
            <div class="tracking-link-dock">
              <div>
                <strong>短链接配置</strong>
                <span>{{ state.selectedCampaign?.trackingLink ? state.selectedCampaign.trackingLink.shortCode : '未配置' }}</span>
              </div>
              <button class="secondary-action compact" type="button" :disabled="!state.selectedCampaign?.id" @click="openTrackingLinkDialog">
                <ExternalLink :size="16" />
                {{ state.selectedCampaign?.trackingLink ? '编辑短链接配置' : '配置短链接' }}
              </button>
              <div v-if="templateMissingTrackingLinkParam" class="message error template-param-error">{{ requiredTrackingLinkMessage }}</div>
              <dl class="tracking-link-summary">
                <div><dt>目标长链接</dt><dd>{{ state.selectedCampaign?.trackingLink?.targetUrl || '未配置' }}</dd></div>
                <div><dt>短链接码</dt><dd>{{ state.selectedCampaign?.trackingLink?.shortCode || '未配置' }}</dd></div>
                <div><dt>UTM Campaign</dt><dd>{{ state.selectedCampaign?.trackingLink?.utmCampaign || '未配置' }}</dd></div>
              </dl>
            </div>
            <div class="variable-list">
              <div class="variable-row variable-head">
                <span>Key</span>
                <span>标签</span>
                <span>示例值</span>
                <span>必填</span>
              </div>
              <div v-for="item in editableTemplateVariableRows" :key="item.index" class="variable-row">
                <input v-model="item.variable.key" placeholder="customerName" />
                <input v-model="item.variable.label" placeholder="客户名称" />
                <input v-model="item.variable.sampleValue" placeholder="Reisen Scala" />
                <label class="checkbox-label"><input v-model="item.variable.required" type="checkbox" /> 必填</label>
                <button class="icon-action" type="button" title="插入变量" @click="insertTemplateVariable(item.variable)">
                  <Code2 :size="15" />
                </button>
                <button class="icon-action danger" type="button" title="删除变量" @click="removeTemplateVariable(item.index)">
                  <Trash2 :size="15" />
                </button>
              </div>
              <button class="secondary-action compact" type="button" @click="addTemplateVariable">
                <Plus :size="16" />
                添加变量
              </button>
            </div>
          </aside>
        </section>
</template>
<script setup lang="ts">
import { CheckCircle2, ChevronDown, Code2, ExternalLink, Eye, Layers, Plus, Send, Trash2, X } from 'lucide-vue-next'
import { useAdminState } from '../../state/adminState'
import * as app from '../../state/useAppStore'
import * as customer from '../../state/useCustomerStore'
import * as channel from '../../state/useChannelStore'
import * as segment from '../../state/useSegmentStore'
import * as campaign from '../../state/useCampaignStore'
import * as tracking from '../../state/useTrackingStore'
import * as ui from '../../state/useUiStore'

const state = useAdminState()
const admin = { state, ...app, ...customer, ...channel, ...segment, ...campaign, ...tracking, ...ui }

const {
  canAccessNav,
  EMPTY_TEMPLATE_PREVIEW_HTML: emptyTemplatePreviewHtml,
  REQUIRED_TRACKING_LINK_MESSAGE: requiredTrackingLinkMessage,
  campaignCurrentStatusLabel,
  campaignLifecycleView,
  campaignAdvanceButtonLabel,
  templateMissingTrackingLinkParam,
  editableTemplateVariableRows,
  openCampaignList,
  saveCampaignSetup,
  syncCampaignTemplateVariables,
  selectedCampaignSegments,
  removeCampaignSegment,
  filteredCampaignSegments,
  isCampaignSegmentSelected,
  toggleCampaignSegment,
  createCampaign,
  previewCampaignTemplate,
  isCampaignStepDisabled,
  campaignStepTitle,
  rollbackCampaignStep,
  isCampaignAdvanceDisabled,
  campaignAdvanceTitle,
  advanceCampaignStep,
  copyShortLink,
  openTrackingLinkDialog,
  insertTemplateVariable,
  removeTemplateVariable,
  addTemplateVariable
} = admin
</script>
