<template>
  <section
    v-if="canAccessNav('campaigns') && state.activeNav === 'campaigns'"
    class="campaign-workbench"
  >
    <CampaignBasicsPanel @template-input="handleCampaignTemplateInput" />
    <CampaignTemplateEditor
      @template-input="handleCampaignTemplateInput"
      @sync-preview-customer="syncTemplatePreviewCustomerSelection"
      @select-preview-customer="selectTemplatePreviewCustomer"
      @search-preview-customer="searchTemplatePreviewCustomer"
    />
    <CampaignTrackingPanel :unsubscribe-page-url="unsubscribePageUrl" />
  </section>
</template>
<script setup lang="ts">
import { proxyRefs, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { storeToRefs } from "pinia";
import {
  canAccessNav as canAccessAppNav,
  useAppStore,
} from "../../state/useAppStore";
import { customersApi } from "../../api/customers";
import { loadChannels, useChannelStore } from "../../state/useChannelStore";
import { loadSegments, useSegmentStore } from "../../state/useSegmentStore";
import {
  loadCampaignDetail,
  loadTemplatePreviewCustomers,
  loadTemplateVariableOptions,
  refreshTemplatePreviewIfReady,
  syncCampaignTemplateVariables,
  useCampaignStore,
} from "../../state/useCampaignStore";
import type { Customer } from "../../types";
import CampaignBasicsPanel from "./CampaignBasicsPanel.vue";
import CampaignTemplateEditor from "./CampaignTemplateEditor.vue";
import CampaignTrackingPanel from "./CampaignTrackingPanel.vue";

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

const unsubscribePageUrl = ref('');

async function loadUnsubscribeLink(): Promise<void> {
  if (!appStore.token) return;
  try {
    const settings = await customersApi.getTenantSettings();
    unsubscribePageUrl.value = settings.unsubscribePageUrl || '';
  } catch (error) {
    // 静默失败，不阻塞主流程
  }
}

function canAccessNav(nav: string): boolean {
  return canAccessAppNav(nav, appStore);
}

let templatePreviewTimer: ReturnType<typeof setTimeout> | undefined;

function campaignIdFromRoute(): string {
  return typeof route.query.campaignId === "string"
    ? route.query.campaignId
    : "";
}

function syncCampaignFromRoute(): void {
  const campaignId = campaignIdFromRoute();
  if (!campaignId) return;
  void loadCampaignDetail(campaignId);
}

function handleCampaignTemplateInput(): void {
  syncCampaignTemplateVariables();
  if (!state.templatePreviewCustomerId) return;
  if (templatePreviewTimer) {
    clearTimeout(templatePreviewTimer);
  }
  templatePreviewTimer = setTimeout(() => {
    void refreshTemplatePreviewIfReady();
  }, 500);
}

function previewCustomerOptionLabel(customer: Customer): string {
  return `${customer.name || customer.email} / ${customer.email}`;
}

function syncTemplatePreviewCustomerSelection(): boolean {
  const query = state.templatePreviewCustomerQuery.trim();
  const matchedCustomer = state.templatePreviewCustomers.find((customer) => {
    const label = previewCustomerOptionLabel(customer);
    return (
      label === query ||
      customer.email === query ||
      customer.name === query ||
      String(customer.id) === query
    );
  });
  state.templatePreviewCustomerId = matchedCustomer?.id || "";
  return Boolean(matchedCustomer);
}

async function selectTemplatePreviewCustomer(): Promise<void> {
  if (syncTemplatePreviewCustomerSelection()) {
    await refreshTemplatePreviewIfReady();
  }
}

async function searchTemplatePreviewCustomer(): Promise<void> {
  if (syncTemplatePreviewCustomerSelection()) {
    await refreshTemplatePreviewIfReady();
    return;
  }
  await loadTemplatePreviewCustomers();
  if (
    !state.templatePreviewCustomerId &&
    state.templatePreviewCustomers.length === 1
  ) {
    const [customer] = state.templatePreviewCustomers;
    state.templatePreviewCustomerId = customer.id;
    state.templatePreviewCustomerQuery = previewCustomerOptionLabel(customer);
    await refreshTemplatePreviewIfReady();
  } else {
    await selectTemplatePreviewCustomer();
  }
}

onMounted(() => {
  void Promise.allSettled([
    loadChannels(),
    loadSegments(),
    loadTemplateVariableOptions(),
    loadTemplatePreviewCustomers(),
    loadUnsubscribeLink(),
  ]);
  syncCampaignFromRoute();
});

onUnmounted(() => {
  if (templatePreviewTimer) {
    clearTimeout(templatePreviewTimer);
  }
});

watch(
  () => route.query.campaignId,
  () => syncCampaignFromRoute(),
);
</script>
