<template>

<section v-if="canAccessNav('tracking') && state.activeNav === 'tracking'" class="tracking-page">
          <div class="toolbar compact-toolbar">
            <label>
              活动筛选
              <select v-model="state.trackingFilter.campaignId" @change="loadTrackingAnalytics(0, 0)">
                <option value="">全部活动</option>
                <option v-for="campaign in state.campaigns" :key="campaign.id" :value="campaign.id">{{ campaign.name }} / {{ campaign.id }}</option>
              </select>
            </label>
            <button class="secondary-action" type="button" :disabled="state.loading" @click="loadTrackingAnalytics(0, 0)">
              <RefreshCw :size="16" /> 刷新
            </button>
          </div>

          <section class="stats-grid tracking-stats">
            <button class="stat-card" type="button">
              <BarChart3 :size="22" />
              <span>总点击</span>
              <strong>{{ state.trackingSummary.totalClicks || 0 }}</strong>
            </button>
            <button class="stat-card" type="button">
              <Users :size="22" />
              <span>已点击客户</span>
              <strong>{{ state.trackingSummary.clickedCustomers || 0 }}</strong>
            </button>
            <button class="stat-card" type="button">
              <ExternalLink :size="22" />
              <span>短链数</span>
              <strong>{{ state.trackingSummary.shortLinks || 0 }}</strong>
            </button>
            <button class="stat-card" type="button">
              <CheckCircle2 :size="22" />
              <span>客户点击率</span>
              <strong>{{ percentValue(state.trackingSummary.clickRate) }}</strong>
            </button>
          </section>

          <article class="ops-panel tracking-trend">
            <div class="panel-title">
              <BarChart3 :size="19" />
              <h3>点击趋势</h3>
            </div>
            <div class="trend-row" v-if="state.trackingTimeseries.length">
              <div v-for="point in state.trackingTimeseries" :key="point.bucket" class="trend-point">
                <span>{{ point.bucket }}</span>
                <strong>{{ point.clicks }}</strong>
                <small>{{ point.customers }} 客户</small>
              </div>
            </div>
            <div v-else class="empty-state compact-empty">暂无点击趋势数据</div>
          </article>

          <section class="main-grid single-column">
            <article class="ops-panel">
              <div class="panel-title">
                <Layers :size="19" />
                <h3>UTM 维度</h3>
              </div>
              <div class="data-table compact-table">
                <table>
                  <thead>
                    <tr>
                      <th>维度</th>
                      <th>点击</th>
                      <th>客户</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in state.trackingUtmStats" :key="item.dimension">
                      <td>{{ item.dimension || '-' }}</td>
                      <td>{{ item.clicks }}</td>
                      <td>{{ item.customers }}</td>
                    </tr>
                    <tr v-if="!state.trackingUtmStats.length">
                      <td colspan="3">暂无 UTM 点击数据</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </article>
          </section>

          <article class="ops-panel tracking-rank">
            <div class="panel-title">
              <ExternalLink :size="19" />
              <h3>短链排行</h3>
            </div>
            <div class="data-table compact-table">
              <table>
                <thead>
                  <tr>
                    <th>短链</th>
                    <th>目标链接</th>
                    <th>点击</th>
                    <th>客户</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="link in state.trackingLinkStats" :key="link.shortLinkId">
                    <td>{{ link.shortUrl }}</td>
                    <td>{{ link.finalUrl }}</td>
                    <td>{{ link.clicks }}</td>
                    <td>{{ link.customers }}</td>
                  </tr>
                  <tr v-if="!state.trackingLinkStats.length">
                    <td colspan="4">暂无短链排行数据</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="pagination">
              <span>第 {{ state.trackingLinkPage.page + 1 }} 页 / 共 {{ state.trackingLinkPage.totalPages || 1 }} 页</span>
              <form class="page-jump-control" @submit.prevent="jumpTrackingLinkPage($event.target.elements.page.value)">
                <label>跳至<input name="page" type="number" min="1" :max="state.trackingLinkPage.totalPages || 1" :value="state.trackingLinkPage.page + 1" /></label>
                <button type="submit" :disabled="!state.trackingLinkPage.totalPages">跳转</button>
              </form>
              <button type="button" :disabled="!state.trackingLinkPage.hasPrevious" @click="changeTrackingLinkPage(state.trackingLinkPage.page - 1)">上一页</button>
              <button type="button" :disabled="!state.trackingLinkPage.hasNext" @click="changeTrackingLinkPage(state.trackingLinkPage.page + 1)">下一页</button>
            </div>
          </article>

          <article class="ops-panel tracking-detail-panel">
            <div class="panel-title">
              <Eye :size="19" />
              <h3>点击明细</h3>
            </div>
            <div class="data-table compact-table tracking-detail-table">
              <table>
                <colgroup>
                  <col class="tracking-col-time" />
                  <col class="tracking-col-campaign" />
                  <col class="tracking-col-utm" />
                  <col class="tracking-col-customer" />
                  <col class="tracking-col-contact" />
                  <col class="tracking-col-website" />
                  <col class="tracking-col-location" />
                  <col class="tracking-col-status" />
                  <col class="tracking-col-source" />
                  <col class="tracking-col-scope" />
                  <col class="tracking-col-referrer" />
                  <col class="tracking-col-device" />
                </colgroup>
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>活动</th>
                    <th>UTM</th>
                    <th>客户</th>
                    <th>联系方式</th>
                    <th>网站</th>
                    <th>地区</th>
                    <th>状态</th>
                    <th>来源</th>
                    <th>业务范围</th>
                    <th>访问来源</th>
                    <th>设备</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="event in state.trackingEvents" :key="event.id">
                    <td>
                      <span class="tracking-strong-text" :title="event.clickedAt">{{ compactDateTime(event.clickedAt) }}</span>
                    </td>
                    <td>
                      <span class="tracking-code-chip" :title="event.campaignId">{{ compactId(event.campaignId) }}</span>
                    </td>
                    <td>
                      <div class="tracking-tag-list utm-tag-cell">
                        <span v-for="tag in utmTags(event)" :key="tag.label" class="tracking-tag" :title="tag.full">
                          <b>{{ tag.label }}</b>{{ tag.value }}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div class="stacked-cell">
                        <strong :title="event.customer?.name || event.customerId || '-'">{{ compactText(event.customer?.name || event.customerId, 22) }}</strong>
                        <button
                          v-if="event.customer?.id || event.customerId"
                          class="link-button"
                          type="button"
                          @click="openTrackingCustomerDetail(event)"
                        >
                          {{ compactId(event.customer?.id || event.customerId) }}
                        </button>
                        <span v-else>-</span>
                      </div>
                    </td>
                    <td>
                      <div class="stacked-cell tracking-contact-cell">
                        <span :title="event.customer?.email || '-'">{{ compactText(event.customer?.email, 24) }}</span>
                        <span :title="event.customer?.phone || '-'">{{ compactText(event.customer?.phone, 18) }}</span>
                      </div>
                    </td>
                    <td>
                      <a
                        v-if="event.customer?.website"
                        class="tracking-url-link"
                        :href="normalizedWebsiteUrl(event.customer.website)"
                        target="_blank"
                        rel="noreferrer"
                        :title="event.customer.website"
                      >
                        {{ compactUrlLabel(event.customer.website, 30) }}
                      </a>
                      <span v-else>-</span>
                    </td>
                    <td>
                      <div class="tracking-tag-list">
                        <span v-for="tag in locationTags(event)" :key="tag" class="tracking-tag neutral" :title="customerLocation(event)">
                          {{ tag }}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div class="tracking-tag-list">
                        <span class="tracking-tag success" :title="event.customer?.emailQuality || '-'">{{ statusLabel(event.customer?.emailQuality || '-') }}</span>
                        <span class="tracking-tag neutral" :title="event.customer?.contactStatus || '-'">{{ statusLabel(event.customer?.contactStatus || '-') }}</span>
                      </div>
                    </td>
                    <td>
                      <div class="tracking-tag-list">
                        <span class="tracking-tag" :title="event.customer?.sourcePrimary || '-'">{{ compactText(event.customer?.sourcePrimary, 16) }}</span>
                        <span v-if="event.customer?.sourceObjectId" class="tracking-tag neutral" :title="event.customer.sourceObjectId">{{ compactId(event.customer.sourceObjectId) }}</span>
                      </div>
                    </td>
                    <td>
                      <div class="tracking-tag-list">
                        <span
                          v-for="scope in businessScopeTags(event.customer?.businessScope)"
                          :key="scope"
                          class="tracking-tag neutral"
                          :title="event.customer?.businessScope || '-'"
                        >
                          {{ scope }}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span class="tracking-ellipsis-text" :title="event.referrer || '-'">{{ referrerLabel(event.referrer) }}</span>
                    </td>
                    <td>
                      <div class="tracking-tag-list">
                        <span v-for="tag in deviceTags(event)" :key="tag" class="tracking-tag neutral" :title="event.userAgent || tag">{{ tag }}</span>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="!state.trackingEvents.length">
                    <td colspan="12">暂无点击明细</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="pagination">
              <span>第 {{ state.trackingEventPage.page + 1 }} 页 / 共 {{ state.trackingEventPage.totalPages || 1 }} 页</span>
              <form class="page-jump-control" @submit.prevent="jumpTrackingEventPage($event.target.elements.page.value)">
                <label>跳至<input name="page" type="number" min="1" :max="state.trackingEventPage.totalPages || 1" :value="state.trackingEventPage.page + 1" /></label>
                <button type="submit" :disabled="!state.trackingEventPage.totalPages">跳转</button>
              </form>
              <button type="button" :disabled="!state.trackingEventPage.hasPrevious" @click="changeTrackingEventPage(state.trackingEventPage.page - 1)">上一页</button>
              <button type="button" :disabled="!state.trackingEventPage.hasNext" @click="changeTrackingEventPage(state.trackingEventPage.page + 1)">下一页</button>
            </div>
          </article>
          <CustomerAssetDialog />
        </section>
</template>
<script setup lang="ts">
import { proxyRefs, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { BarChart3, CheckCircle2, ExternalLink, Eye, Layers, RefreshCw, Users } from 'lucide-vue-next'
import { canAccessNav as canAccessAppNav, useAppStore } from '../../state/useAppStore'
import { loadCampaigns, useCampaignStore } from '../../state/useCampaignStore'
import {
  changeTrackingEventPage,
  changeTrackingLinkPage,
  jumpTrackingEventPage,
  jumpTrackingLinkPage,
  loadTrackingAnalytics,
  useTrackingStore
} from '../../state/useTrackingStore'
import { openCustomerDetail } from '../../state/useCustomerStore'
import { formatWebsiteLabel, normalizedWebsiteUrl, percentValue, statusLabel } from '../../utils/format'
import CustomerAssetDialog from '../../components/customers/CustomerAssetDialog.vue'
import type { Customer, TrackingEvent } from '../../types'

const appStore = useAppStore()
const campaignStore = useCampaignStore()
const trackingStore = useTrackingStore()
const state = proxyRefs({
  ...storeToRefs(appStore),
  ...storeToRefs(campaignStore),
  ...storeToRefs(trackingStore)
})

function canAccessNav(nav: string): boolean {
  return canAccessAppNav(nav, appStore)
}

function customerLocation(event: { customer?: { country?: string; region?: string; city?: string; postcode?: string; street?: string; houseNumber?: string } | null }): string {
  const customer = event.customer
  if (!customer) return '-'
  return [
    customer.country,
    customer.region,
    customer.city,
    customer.postcode,
    customer.street,
    customer.houseNumber
  ].filter(Boolean).join(' / ') || '-'
}

function compactText(value: string | number | undefined | null, maxLength = 28): string {
  const text = String(value || '').trim()
  if (!text) return '-'
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text
}

function compactId(value: string | number | undefined | null): string {
  const text = String(value || '').trim()
  if (!text) return '-'
  if (text.length <= 14) return text
  return `${text.slice(0, 6)}…${text.slice(-4)}`
}

function compactDateTime(value: string | undefined): string {
  return String(value || '-').replace('T', ' ').replace(/\.\d+Z?$/, '').replace(/Z$/, '')
}

function compactUrlLabel(value: string | undefined, maxLength = 34): string {
  const label = formatWebsiteLabel(value)
  return compactText(label, maxLength)
}

function referrerLabel(value: string | undefined): string {
  const text = String(value || '').trim()
  if (!text) return '直接访问'
  try {
    const url = new URL(normalizedWebsiteUrl(text))
    return compactText(`${url.hostname}${url.pathname === '/' ? '' : url.pathname}`, 34)
  } catch {
    return compactText(text, 34)
  }
}

function utmTags(event: TrackingEvent): Array<{ label: string; value: string; full: string }> {
  const entries = [
    ['src', event.utmSource],
    ['med', event.utmMedium],
    ['cmp', event.utmCampaign],
    ['cnt', event.utmContent],
    ['term', event.utmTerm]
  ]
  const tags = entries
    .filter(([, value]) => String(value || '').trim())
    .map(([label, value]) => ({
      label: `${label}:`,
      value: compactText(value, 18),
      full: String(value)
    }))
  return tags.length ? tags : [{ label: '', value: '-', full: '-' }]
}

function locationTags(event: TrackingEvent): string[] {
  const customer = event.customer
  const tags = [customer?.country, customer?.region, customer?.city]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 3)
  return tags.length ? tags : ['-']
}

function businessScopeTags(value: string | undefined): string[] {
  const text = String(value || '').trim()
  if (!text) return ['-']
  const parts = text
    .split(/[、,，;；/|]/)
    .map((item) => compactText(item.trim(), 18))
    .filter((item) => item && item !== '-')
    .slice(0, 3)
  return parts.length ? parts : [compactText(text, 24)]
}

function deviceTags(event: TrackingEvent): string[] {
  const tags = [event.deviceType, event.browser, event.os]
    .map((item) => compactText(item, 16))
    .filter((item) => item !== '-')
  if (tags.length) return tags
  return [compactText(event.userAgent, 24)]
}

function trackingEventCustomer(event: TrackingEvent): Customer {
  const customer = event.customer
  return {
    id: String(customer?.id || event.customerId || ''),
    name: customer?.name || '',
    country: customer?.country || '',
    region: customer?.region || '',
    city: customer?.city || '',
    email: customer?.email || '',
    website: customer?.website || '',
    phone: customer?.phone || '',
    emailQuality: customer?.emailQuality || 'PENDING',
    contactStatus: customer?.contactStatus || 'NOT_CONTACTED',
    sourcePrimary: customer?.sourcePrimary || '',
    sourceObjectId: customer?.sourceObjectId || '',
    postcode: customer?.postcode || '',
    street: customer?.street || '',
    houseNumber: customer?.houseNumber || '',
    businessScope: customer?.businessScope || ''
  }
}

function openTrackingCustomerDetail(event: TrackingEvent): void {
  void openCustomerDetail(trackingEventCustomer(event))
}

onMounted(() => {
  void Promise.allSettled([loadCampaigns(), loadTrackingAnalytics()])
})
</script>
