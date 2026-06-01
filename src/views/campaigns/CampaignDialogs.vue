<template>

<div v-if="state.trackingLinkDialogOpen" class="modal-backdrop" @click.self="closeTrackingLinkDialog">
          <section class="modal-panel tracking-link-modal" role="dialog" aria-modal="true" aria-labelledby="tracking-link-title">
            <div class="modal-header">
              <div>
                <h3 id="tracking-link-title">短链接配置</h3>
                <p>为当前邮件活动单独维护跳转目标、短链接码和 UTM 参数</p>
              </div>
              <button class="icon-action" type="button" title="关闭" @click="closeTrackingLinkDialog">
                <X :size="16" />
              </button>
            </div>
            <form class="ops-form" @submit.prevent="saveCampaignTrackingLink">
              <label>目标长链接<input v-model="state.campaignForm.trackingTargetUrl" /></label>
              <label>短链接码<input v-model="state.campaignForm.trackingShortCode" /></label>
              <div class="utm-grid">
                <label>UTM Source<input v-model="state.campaignForm.trackingUtmSource" /></label>
                <label>UTM Medium<input v-model="state.campaignForm.trackingUtmMedium" /></label>
                <label>UTM Campaign<input v-model="state.campaignForm.trackingUtmCampaign" /></label>
                <label>UTM Content<input v-model="state.campaignForm.trackingUtmContent" /></label>
                <label>UTM Term<input v-model="state.campaignForm.trackingUtmTerm" /></label>
              </div>
              <div class="modal-actions">
                <button class="secondary-action" type="button" :disabled="state.loading" @click="closeTrackingLinkDialog">取消</button>
                <button class="primary-action" :disabled="state.loading">保存短链接配置</button>
              </div>
            </form>
          </section>
        </div>

        <div v-if="state.testEmailDialogOpen" class="modal-backdrop" @click.self="closeTestEmailDialog">
          <section class="modal-panel test-email-modal" role="dialog" aria-modal="true" aria-labelledby="test-email-title">
            <div class="modal-header">
              <div>
                <h3 id="test-email-title">选择测试邮箱</h3>
                <p>模拟发送只发送到测试邮箱，历史测试邮箱会按租户保存，可复用或删除。</p>
              </div>
              <button class="icon-action" type="button" title="关闭" @click="closeTestEmailDialog">
                <X :size="16" />
              </button>
            </div>
            <form class="test-email-add-row" @submit.prevent="addTestEmail">
              <input v-model="state.newTestEmail" type="email" placeholder="qa@example.com" />
              <button class="secondary-action compact" type="submit" :disabled="state.loading">
                <Plus :size="16" />
                新增测试邮箱
              </button>
            </form>
            <div class="test-email-list">
              <div v-if="!state.testEmails.length" class="empty-state compact-empty">暂无历史测试邮箱，请先新增一个测试邮箱</div>
              <label v-for="item in state.testEmails" :key="item.id" class="test-email-row">
                <input
                  type="checkbox"
                  :checked="isTestEmailSelected(item.email)"
                  @change="toggleTestEmail(item.email)"
                />
                <span>{{ item.email }}</span>
                <button class="icon-action danger" type="button" title="删除测试邮箱" :disabled="state.loading" @click.prevent="deleteTestEmail(item)">
                  <Trash2 :size="15" />
                </button>
              </label>
            </div>
            <div v-if="state.selectedTestEmails.length" class="selected-test-email-tags">
              <button v-for="email in state.selectedTestEmails" :key="email" type="button" @click="toggleTestEmail(email)">
                {{ email }}
                <X :size="13" />
              </button>
            </div>
            <div class="modal-actions">
              <button class="secondary-action" type="button" :disabled="state.loading" @click="closeTestEmailDialog">取消</button>
              <button class="primary-action" type="button" :disabled="state.loading || !state.selectedTestEmails.length" @click="confirmTestSimulation">
                <Send :size="17" />
                模拟发送到测试邮箱
              </button>
            </div>
          </section>
        </div>

        <div v-if="state.finalConfirmDialogOpen" class="modal-backdrop" @click.self="closeFinalConfirmDialog">
          <section class="modal-panel final-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="final-confirm-title">
            <div class="modal-header">
              <div>
                <h3 id="final-confirm-title">确认推送</h3>
                <p>确认后将发送未推送完成的邮件记录，并按推送返回结果写入成功或失败状态。</p>
              </div>
              <button class="icon-action" type="button" title="关闭" @click="closeFinalConfirmDialog">
                <X :size="16" />
              </button>
            </div>
            <div class="modal-actions">
              <button class="secondary-action" type="button" :disabled="state.loading" @click="closeFinalConfirmDialog">取消</button>
              <button class="primary-action" type="button" :disabled="state.loading" @click="confirmFinalPush">
                <CheckCircle2 :size="17" />
                确认推送
              </button>
            </div>
          </section>
        </div>
</template>
<script setup lang="ts">
import { CheckCircle2, Plus, Send, Trash2, X } from 'lucide-vue-next'
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
  saveCampaignTrackingLink,
  closeTrackingLinkDialog,
  closeTestEmailDialog,
  addTestEmail,
  isTestEmailSelected,
  toggleTestEmail,
  deleteTestEmail,
  confirmTestSimulation,
  closeFinalConfirmDialog,
  confirmFinalPush
} = admin
</script>
