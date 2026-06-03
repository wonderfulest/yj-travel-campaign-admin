<template>
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
          @input="emit('template-input')"
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
</template>

<script setup lang="ts">
import { proxyRefs } from "vue";
import { storeToRefs } from "pinia";
import {
  CheckCircle2,
  ChevronDown,
  Layers,
  Plus,
  Send,
  X,
} from "lucide-vue-next";
import { useAppStore } from "../../state/useAppStore";
import { useChannelStore } from "../../state/useChannelStore";
import {
  createCampaign,
  filteredCampaignSegments,
  isCampaignSegmentSelected,
  removeCampaignSegment,
  saveCampaignSetup,
  selectedCampaignSegments,
  toggleCampaignSegment,
  useCampaignStore,
} from "../../state/useCampaignStore";
import { useSegmentStore } from "../../state/useSegmentStore";
import { openCampaignList } from "../../state/useUiStore";

const emit = defineEmits<{
  (e: "template-input"): void;
}>();

const appStore = useAppStore();
const campaignStore = useCampaignStore();
const channelStore = useChannelStore();
const segmentStore = useSegmentStore();
const state = proxyRefs({
  ...storeToRefs(appStore),
  ...storeToRefs(campaignStore),
  ...storeToRefs(channelStore),
  ...storeToRefs(segmentStore),
});
</script>
