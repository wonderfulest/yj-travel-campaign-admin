<template>
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
            @click="() => previewCampaignTemplate()"
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
          @input="emit('template-input')"
        ></textarea>
      </section>
      <section class="template-split-pane">
        <div class="split-pane-header preview-pane-header">
          <div class="preview-title">
            <span>邮件预览</span>
            <strong>{{ state.templatePreviewSubject || "未渲染" }}</strong>
          </div>
          <input
            v-model="state.templatePreviewCustomerQuery"
            class="preview-customer-input"
            list="template-preview-customers"
            placeholder="搜索预览客户"
            @input="emit('sync-preview-customer')"
            @change="emit('select-preview-customer')"
            @keydown.enter.prevent="emit('search-preview-customer')"
          />
          <datalist id="template-preview-customers">
            <option
              v-for="customer in state.templatePreviewCustomers"
              :key="customer.id"
              :value="previewCustomerOptionLabel(customer)"
            ></option>
          </datalist>
        </div>
        <div class="preview-subject-mobile">
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
</template>

<script setup lang="ts">
import { proxyRefs } from "vue";
import { storeToRefs } from "pinia";
import { CheckCircle2, Code2, Eye } from "lucide-vue-next";
import { useAppStore } from "../../state/useAppStore";
import {
  advanceCampaignStep,
  campaignAdvanceButtonLabel,
  campaignAdvanceTitle,
  campaignCurrentStatusLabel,
  campaignLifecycleView,
  campaignStepTitle,
  EMPTY_TEMPLATE_PREVIEW_HTML as emptyTemplatePreviewHtml,
  isCampaignAdvanceDisabled,
  isCampaignStepDisabled,
  previewCampaignTemplate,
  rollbackCampaignStep,
  useCampaignStore,
} from "../../state/useCampaignStore";
import type { Customer } from "../../types";

const emit = defineEmits<{
  (e: "template-input"): void;
  (e: "sync-preview-customer"): void;
  (e: "select-preview-customer"): void;
  (e: "search-preview-customer"): void;
}>();

const appStore = useAppStore();
const campaignStore = useCampaignStore();
const state = proxyRefs({
  ...storeToRefs(appStore),
  ...storeToRefs(campaignStore),
});

function previewCustomerOptionLabel(customer: Customer): string {
  return `${customer.name || customer.email} / ${customer.email}`;
}
</script>
