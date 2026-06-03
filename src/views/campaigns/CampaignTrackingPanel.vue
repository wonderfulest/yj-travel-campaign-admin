<template>
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
        v-if="templateRequiredParamMessage"
        class="message error template-param-error"
      >
        {{ templateRequiredParamMessage }}
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

      <div class="unsubscribe-link-section">
        <div class="field-header">
          <strong>退订链接配置</strong>
          <button
            class="icon-action xs"
            type="button"
            title="此链接在租户设置中配置"
          >
            <Info :size="12" />
          </button>
        </div>
        <div class="unsubscribe-link-display">
          <span class="link-value">{{ unsubscribePageUrl || '未配置' }}</span>
          <button
            v-if="unsubscribePageUrl"
            class="icon-action xs"
            type="button"
            title="复制退订链接"
            @click="copyShortLink(unsubscribePageUrl, '退订链接已复制')"
          >
            <Copy :size="12" />
          </button>
        </div>
      </div>
    </div>
    <div class="template-variable-catalog">
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
          <code>{{ "${" + option.key + "}" }}</code>
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, proxyRefs } from "vue";
import { storeToRefs } from "pinia";
import { Code2, Copy, ExternalLink, Info } from "lucide-vue-next";
import { useAppStore } from "../../state/useAppStore";
import {
  insertTemplateVariable,
  openTrackingLinkDialog,
  templateRequiredParamMessage,
  trackingShortUrl as buildTrackingShortUrl,
  trackingFinalUrl as buildTrackingFinalUrl,
  useCampaignStore,
} from "../../state/useCampaignStore";
import { copyShortLink } from "../../state/useUiStore";

const props = defineProps<{
  unsubscribePageUrl: string;
}>();

const appStore = useAppStore();
const campaignStore = useCampaignStore();
const state = proxyRefs({
  ...storeToRefs(appStore),
  ...storeToRefs(campaignStore),
});

const unsubscribePageUrl = computed(() => props.unsubscribePageUrl);

const trackingFinalUrl = computed(() =>
  buildTrackingFinalUrl(state.selectedCampaign?.trackingLink)
);

const trackingShortUrl = computed(() =>
  buildTrackingShortUrl(state.selectedCampaign?.trackingLink)
);
</script>
