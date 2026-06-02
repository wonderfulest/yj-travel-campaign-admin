<template>
  <section
    v-if="canAccessNav('campaigns') && state.activeNav === 'campaigns'"
    class="campaign-workbench"
  >
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
        <label
          >邮件主题<input
            v-model="state.campaignForm.subject"
            @input="syncCampaignTemplateVariables"
        /></label>
        <label>发件名称<input v-model="state.campaignForm.fromName" /></label>
        <label>
          推送通道
          <select v-model="state.campaignForm.channelId">
            <option value="">请选择通道</option>
            <option
              v-for="channel in state.channels"
              :key="channel.id"
              :value="channel.id"
            >
              {{ channel.name }} / {{ channel.channelType }}
            </option>
          </select>
        </label>
        <div class="field-block">
          客群
          <div class="campaign-segment-dropdown">
            <button
              class="dropdown-trigger"
              type="button"
              @click="state.segmentDropdownOpen = !state.segmentDropdownOpen"
            >
              <span>{{
                state.campaignForm.segmentIds.length
                  ? "已选择 " + state.campaignForm.segmentIds.length + " 个客群"
                  : "请选择客群"
              }}</span>
              <ChevronDown :size="16" />
            </button>
            <div
              v-if="state.campaignForm.segmentIds.length"
              class="selected-segment-tags"
            >
              <button
                v-for="segment in selectedCampaignSegments()"
                :key="segment.id"
                type="button"
                @click="removeCampaignSegment(segment.id)"
              >
                {{ segment.name }}
                <X :size="13" />
              </button>
            </div>
            <div v-if="state.segmentDropdownOpen" class="dropdown-panel">
              <input
                v-model="state.segmentDropdownQuery"
                placeholder="搜索客群名称或 ID"
              />
              <button
                v-for="segment in filteredCampaignSegments()"
                :key="segment.id"
                class="dropdown-option"
                :class="{ selected: isCampaignSegmentSelected(segment.id) }"
                type="button"
                @click="toggleCampaignSegment(segment.id)"
              >
                <span>
                  <strong>{{ segment.name }}</strong>
                  <small
                    >{{ segment.id }} /
                    {{ segment.description || "暂无说明" }}</small
                  >
                </span>
                <CheckCircle2
                  v-if="isCampaignSegmentSelected(segment.id)"
                  :size="16"
                />
              </button>
              <div
                v-if="filteredCampaignSegments().length === 0"
                class="dropdown-empty"
              >
                暂无匹配客群
              </div>
            </div>
          </div>
        </div>
        <div class="stacked-actions">
          <button class="primary-action" :disabled="state.loading">
            <CheckCircle2 :size="17" />
            保存活动配置
          </button>
          <button
            class="secondary-action"
            type="button"
            :disabled="state.loading"
            @click="createCampaign"
          >
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
            <button
              class="row-action"
              type="button"
              :disabled="state.templatePreviewLoading"
              @click="previewCampaignTemplate"
            >
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
            <strong>{{ state.templatePreviewSubject || "未渲染" }}</strong>
          </div>
          <div
            v-if="state.templatePreviewError"
            class="message error preview-error"
          >
            {{ state.templatePreviewError }}
          </div>
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
            :class="{
              active: step.active,
              done: step.done,
              rollback: step.rollback,
            }"
          >
            <button
              type="button"
              :disabled="isCampaignStepDisabled(step)"
              :title="campaignStepTitle(step)"
              @click="rollbackCampaignStep(step)"
            >
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
        <button
          class="primary-action lifecycle-advance"
          type="button"
          :disabled="isCampaignAdvanceDisabled()"
          :title="campaignAdvanceTitle()"
          @click="() => advanceCampaignStep()"
        >
          <CheckCircle2 :size="17" />
          {{ campaignAdvanceButtonLabel }}
        </button>
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
          <span>{{
            state.selectedCampaign?.trackingLink
              ? state.selectedCampaign.trackingLink.shortCode
              : "未配置"
          }}</span>
        </div>
        <button
          class="secondary-action compact"
          type="button"
          :disabled="!state.selectedCampaign?.id"
          @click="openTrackingLinkDialog"
        >
          <ExternalLink :size="16" />
          {{
            state.selectedCampaign?.trackingLink
              ? "编辑短链接配置"
              : "配置短链接"
          }}
        </button>
        <div
          v-if="templateMissingTrackingLinkParam"
          class="message error template-param-error"
        >
          {{ requiredTrackingLinkMessage }}
        </div>
        <dl class="tracking-link-summary">
          <div class="tracking-link-field">
            <div class="tracking-link-field-header">
              <dt>目标长链接</dt>
              <button
                class="icon-action"
                type="button"
                title="复制目标长链接"
                :disabled="!trackingFinalUrl"
                @click="copyShortLink(trackingFinalUrl, '目标长链接已复制')"
              >
                <Copy :size="14" />
              </button>
            </div>
            <dd>{{ trackingFinalUrl || "未配置" }}</dd>
          </div>
          <div class="tracking-link-field">
            <div class="tracking-link-field-header">
              <dt>短链</dt>
              <button
                class="icon-action"
                type="button"
                title="复制完整短链"
                :disabled="!trackingShortUrl"
                @click="copyShortLink(trackingShortUrl, '完整短链已复制')"
              >
                <Copy :size="14" />
              </button>
            </div>
            <dd>{{ trackingShortUrl || "未配置" }}</dd>
          </div>
          <div class="tracking-link-field">
            <dt>UTM Campaign</dt>
            <dd>
              {{
                state.selectedCampaign?.trackingLink?.utmCampaign || "未配置"
              }}
            </dd>
          </div>
        </dl>
      </div>
      <div class="template-variable-catalog">
        <div class="template-side-section-header">
          <div>
            <strong>可插入变量</strong>
            <span>点击插入到 HTML 光标位置</span>
          </div>
        </div>
        <div class="variable-chip-list">
          <button
            v-for="option in state.templateVariableOptions"
            :key="option.key"
            class="variable-chip"
            type="button"
            :title="option.description || option.label"
            @click="insertTemplateVariable(option)"
          >
            <span>{{ option.label || option.key }}</span>
            <code>{{ '${' + option.key + '}' }}</code>
          </button>
        </div>
      </div>
    </aside>
  </section>
</template>
<script setup lang="ts">
import { computed, proxyRefs, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { storeToRefs } from "pinia";
import {
  CheckCircle2,
  ChevronDown,
  Code2,
  Copy,
  ExternalLink,
  Eye,
  Layers,
  Plus,
  Send,
  X,
} from "lucide-vue-next";
import {
  canAccessNav as canAccessAppNav,
  useAppStore,
} from "../../state/useAppStore";
import { loadChannels, useChannelStore } from "../../state/useChannelStore";
import { loadSegments } from "../../state/useSegmentStore";
import {
  advanceCampaignStep,
  campaignAdvanceButtonLabel,
  campaignAdvanceTitle,
  campaignCurrentStatusLabel,
  campaignLifecycleView,
  campaignStepTitle,
  createCampaign,
  EMPTY_TEMPLATE_PREVIEW_HTML as emptyTemplatePreviewHtml,
  filteredCampaignSegments,
  insertTemplateVariable,
  isCampaignSegmentSelected,
  isCampaignAdvanceDisabled,
  isCampaignStepDisabled,
  loadCampaignDetail,
  loadTemplateVariableOptions,
  openTrackingLinkDialog,
  previewCampaignTemplate,
  removeCampaignSegment,
  REQUIRED_TRACKING_LINK_MESSAGE as requiredTrackingLinkMessage,
  rollbackCampaignStep,
  saveCampaignSetup,
  selectedCampaignSegments,
  syncCampaignTemplateVariables,
  templateMissingTrackingLinkParam,
  trackingShortUrl as buildTrackingShortUrl,
  trackingFinalUrl as buildTrackingFinalUrl,
  toggleCampaignSegment,
  useCampaignStore,
} from "../../state/useCampaignStore";
import { useSegmentStore } from "../../state/useSegmentStore";
import { copyShortLink, openCampaignList } from "../../state/useUiStore";

const appStore = useAppStore();
const campaignStore = useCampaignStore();
const channelStore = useChannelStore();
const segmentStore = useSegmentStore();
const route = useRoute();
const state = proxyRefs({
  ...storeToRefs(appStore),
  ...storeToRefs(campaignStore),
  ...storeToRefs(channelStore),
  ...storeToRefs(segmentStore),
});

function canAccessNav(nav: string): boolean {
  return canAccessAppNav(nav, appStore);
}

const trackingFinalUrl = computed(() => {
  return buildTrackingFinalUrl(state.selectedCampaign?.trackingLink);
});

const trackingShortUrl = computed(() => {
  return buildTrackingShortUrl(state.selectedCampaign?.trackingLink);
});

function campaignIdFromRoute(): string {
  return typeof route.query.campaignId === "string" ? route.query.campaignId : "";
}

function syncCampaignFromRoute(): void {
  const campaignId = campaignIdFromRoute();
  if (!campaignId) return;
  void loadCampaignDetail(campaignId);
}

onMounted(() => {
  void Promise.allSettled([loadChannels(), loadSegments(), loadTemplateVariableOptions()]);
  syncCampaignFromRoute();
});

watch(
  () => route.query.campaignId,
  () => syncCampaignFromRoute()
);
</script>
