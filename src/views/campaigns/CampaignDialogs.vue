<template>

<div v-if="state.trackingLinkDialogOpen" class="modal-backdrop" @click.self="closeTrackingLinkDialog">
          <section class="modal-panel tracking-link-modal" role="dialog" aria-modal="true" aria-labelledby="tracking-link-title">
            <div class="modal-header">
              <div>
                <h3 id="tracking-link-title">短链接配置</h3>
                <p>上方配置短链，前缀由 shortLinkBaseUrl 决定；下方配置目标长链和 UTM 参数。</p>
              </div>
              <button class="icon-action" type="button" title="关闭" @click="closeTrackingLinkDialog">
                <X :size="16" />
              </button>
            </div>
            <form class="ops-form" @submit.prevent="saveCampaignTrackingLink">
              <div class="tracking-link-fieldset">
                <span class="fieldset-label">短链</span>
                <div class="short-link-compose">
                  <label>
                    shortLinkBaseUrl
                    <input :value="shortLinkBaseUrlText" readonly aria-readonly="true" />
                  </label>
                  <span class="short-link-separator">/</span>
                  <label>
                    shortCode
                    <input v-model="state.campaignForm.trackingShortCode" />
                  </label>
                </div>
              </div>
              <div class="tracking-link-fieldset">
                <span class="fieldset-label">目标长链</span>
                <label>targetUrl<input v-model="state.campaignForm.trackingTargetUrl" /></label>
                <div class="utm-grid">
                  <label>utm_source<input id="tracking-utm-source" v-model="state.campaignForm.trackingUtmSource" @focus="focusUtmField('trackingUtmSource', 'tracking-utm-source')" /></label>
                  <label>utm_medium<input id="tracking-utm-medium" v-model="state.campaignForm.trackingUtmMedium" @focus="focusUtmField('trackingUtmMedium', 'tracking-utm-medium')" /></label>
                  <label>utm_campaign<input id="tracking-utm-campaign" v-model="state.campaignForm.trackingUtmCampaign" @focus="focusUtmField('trackingUtmCampaign', 'tracking-utm-campaign')" /></label>
                  <label>utm_content<input id="tracking-utm-content" v-model="state.campaignForm.trackingUtmContent" @focus="focusUtmField('trackingUtmContent', 'tracking-utm-content')" /></label>
                  <label>utm_term<input id="tracking-utm-term" v-model="state.campaignForm.trackingUtmTerm" @focus="focusUtmField('trackingUtmTerm', 'tracking-utm-term')" /></label>
                </div>
                <div class="utm-variable-insert">
                  <span>插入变量到 UTM</span>
                  <div class="utm-variable-grid">
                    <button
                      v-for="option in state.templateVariableOptions"
                      :key="option.key"
                      class="variable-chip"
                      type="button"
                      :title="option.description || option.label"
                      @click="insertUtmVariable(option)"
                    >
                      <span>{{ option.label || option.key }}</span>
                      <code>{{ '${' + option.key + '}' }}</code>
                    </button>
                  </div>
                </div>
                <dl class="tracking-link-summary">
                  <div class="tracking-link-field">
                    <div class="tracking-link-field-header">
                      <dt>带 UTM 目标长链接</dt>
                      <button
                        class="icon-action"
                        type="button"
                        title="复制带 UTM 目标长链接"
                        :disabled="!trackingFinalUrlText"
                        @click="copyShortLink(trackingFinalUrlText, '目标长链接已复制')"
                      >
                        <Copy :size="14" />
                      </button>
                    </div>
                    <dd>{{ trackingFinalUrlText || '请先填写 targetUrl' }}</dd>
                  </div>
                </dl>
              </div>
              <div class="modal-actions">
                <button class="secondary-action" type="button" :disabled="state.loading" @click="closeTrackingLinkDialog">取消</button>
                <button class="primary-action" :disabled="state.loading">保存短链接配置</button>
              </div>
            </form>
          </section>
        </div>

        <div v-if="state.testCustomerDialogOpen" class="modal-backdrop" @click.self="closeTestCustomerDialog">
          <section class="modal-panel test-email-modal" role="dialog" aria-modal="true" aria-labelledby="test-email-title">
            <div class="modal-header">
              <div>
                <h3 id="test-email-title">选择测试客户</h3>
                <p>模拟发送只发送到客户资产库里的真实客户，模板变量会使用该客户的名称、ID 和邮箱。</p>
              </div>
              <button class="icon-action" type="button" title="关闭" @click="closeTestCustomerDialog">
                <X :size="16" />
              </button>
            </div>
            <form class="test-email-add-row" @submit.prevent="loadTestCustomers">
              <input v-model="state.testCustomerQuery" placeholder="搜索客户名称、邮箱、网站" />
              <button class="secondary-action compact" type="submit" :disabled="state.loading">
                <Search :size="16" />
                搜索客户
              </button>
            </form>
            <div class="test-email-list">
              <div v-if="!state.testCustomers.length" class="empty-state compact-empty">暂无可测试客户，请先在客户资产库导入或创建带邮箱的客户</div>
              <label v-for="item in state.testCustomers" :key="item.id" class="test-email-row">
                <input
                  type="checkbox"
                  :checked="isTestCustomerSelected(item.id)"
                  @change="toggleTestCustomer(item)"
                />
                <span>
                  <strong>{{ item.name || item.email }}</strong>
                  <small>{{ item.email }}<template v-if="item.country || item.city"> · {{ [item.country, item.city].filter(Boolean).join(' / ') }}</template></small>
                </span>
              </label>
            </div>
            <div v-if="selectedTestCustomers.length" class="selected-test-email-tags">
              <button v-for="customer in selectedTestCustomers" :key="customer.id" type="button" @click="toggleTestCustomer(customer)">
                {{ customer.name || customer.email }}
                <X :size="13" />
              </button>
            </div>
            <div class="modal-actions">
              <button class="secondary-action" type="button" :disabled="state.loading" @click="closeTestCustomerDialog">取消</button>
              <button class="primary-action" type="button" :disabled="state.loading || !state.selectedTestCustomerIds.length" @click="confirmTestSimulation">
                <Send :size="17" />
                模拟发送到测试客户
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
import { computed, proxyRefs, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { CheckCircle2, Copy, Search, Send, X } from 'lucide-vue-next'
import { useAppStore } from '../../state/useAppStore'
import {
  closeFinalConfirmDialog,
  closeTestCustomerDialog,
  closeTrackingLinkDialog,
  confirmFinalPush,
  confirmTestSimulation,
  insertCampaignFormVariable,
  isTestCustomerSelected,
  loadTestCustomers,
  saveCampaignTrackingLink,
  toggleTestCustomer,
  trackingFinalUrl,
  useCampaignStore
} from '../../state/useCampaignStore'
import { copyShortLink } from '../../state/useUiStore'
import type { Customer } from '../../types'

const appStore = useAppStore()
const campaignStore = useCampaignStore()
const state = proxyRefs({
  ...storeToRefs(appStore),
  ...storeToRefs(campaignStore)
})
const selectedTestCustomers = computed<Customer[]>(() =>
  state.selectedTestCustomerIds
    .map((id) => state.testCustomers.find((customer) => String(customer.id) === String(id)))
    .filter((customer): customer is Customer => Boolean(customer))
)
type UmtFormField = 'trackingUtmSource' | 'trackingUtmMedium' | 'trackingUtmCampaign' | 'trackingUtmContent' | 'trackingUtmTerm'
const focusedUtmField = ref<{ field: UmtFormField; elementId: string }>({
  field: 'trackingUtmContent',
  elementId: 'tracking-utm-content'
})
const shortLinkBaseUrlText = computed(() => state.selectedCampaign?.trackingLink?.shortLinkBaseUrl || '保存后由后端返回')
const trackingFinalUrlText = computed(() => trackingFinalUrl({
  targetUrl: state.campaignForm.trackingTargetUrl,
  utmSource: state.campaignForm.trackingUtmSource,
  utmMedium: state.campaignForm.trackingUtmMedium,
  utmCampaign: state.campaignForm.trackingUtmCampaign,
  utmContent: state.campaignForm.trackingUtmContent,
  utmTerm: state.campaignForm.trackingUtmTerm
}))

function focusUtmField(field: UmtFormField, elementId: string): void {
  focusedUtmField.value = { field, elementId }
}

function insertUtmVariable(option: { key?: string }): void {
  void insertCampaignFormVariable(focusedUtmField.value.field, option, focusedUtmField.value.elementId)
}
</script>
