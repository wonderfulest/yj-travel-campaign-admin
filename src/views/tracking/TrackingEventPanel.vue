<template>
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
          <tr v-for="event in events" :key="event.id">
            <td>
              <span class="tracking-strong-text" :title="event.clickedAt">{{ compactDateTime(event.clickedAt) }}</span>
            </td>
            <td>
              <button
                v-if="event.campaignId"
                class="tracking-campaign-link"
                type="button"
                :title="trackingCampaignName(event)"
                @click="openTrackingCampaignDetail(event)"
              >
                <span>{{ trackingCampaignName(event) }}</span>
              </button>
              <span v-else>-</span>
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
                <button
                  v-if="event.customer?.id || event.customerId"
                  class="tracking-campaign-link"
                  type="button"
                  :title="trackingCustomerName(event)"
                  @click="openTrackingCustomerDetail(event)"
                >
                  <span>{{ compactText(trackingCustomerName(event), 22) }}</span>
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
          <tr v-if="!events.length">
            <td colspan="12">暂无点击明细</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="pagination-bar">
      <div class="pagination-meta">
        <span>共 {{ eventPage.totalItems }} 条，当前第 {{ eventPage.totalPages ? eventPage.page + 1 : 0 }} / {{ eventPage.totalPages }} 页</span>
        <label class="page-size-control">
          每页
          <select v-model.number="eventPage.size" @change="changeTrackingEventPageSize(eventPage.size)">
            <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
          </select>
          条
        </label>
      </div>
      <div class="pagination-actions">
        <form class="page-jump-control" @submit.prevent="jumpTrackingEventPage($event.target.elements.page.value)">
          <label>跳至<input name="page" type="number" min="1" :max="eventPage.totalPages || 1" :value="eventPage.page + 1" /></label>
          <button type="submit" :disabled="!eventPage.totalPages">跳转</button>
        </form>
        <button type="button" :disabled="!eventPage.hasPrevious" @click="changeTrackingEventPage(eventPage.page - 1)">上一页</button>
        <button type="button" :disabled="!eventPage.hasNext" @click="changeTrackingEventPage(eventPage.page + 1)">下一页</button>
      </div>
    </div>
  </article>
</template>
<script setup lang="ts">
import { Eye } from 'lucide-vue-next'
import {
  changeTrackingEventPage,
  changeTrackingEventPageSize,
  jumpTrackingEventPage
} from '../../state/useTrackingStore'
import { openCustomerDetail } from '../../state/useCustomerStore'
import { openCampaignDetail } from '../../state/useUiStore'
import { formatWebsiteLabel, normalizedWebsiteUrl, statusLabel } from '../../utils/format'
import { PAGE_SIZE_OPTIONS as pageSizeOptions } from '../../utils/pagination'
import type { Campaign, Customer, TrackingEvent } from '../../types'

const props = defineProps<{
  events: TrackingEvent[]
  campaigns: Campaign[]
  eventPage: {
    page: number
    size: number
    totalItems: number
    totalPages: number
    hasNext: boolean
    hasPrevious: boolean
  }
}>()

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

function campaignForEvent(event: TrackingEvent): Campaign | null {
  const campaignId = String(event.campaignId || '')
  if (!campaignId) return null
  return props.campaigns.find((c) => String(c.id) === campaignId) || null
}

function trackingCampaignName(event: TrackingEvent): string {
  return campaignForEvent(event)?.name || '未命名活动'
}

function trackingCustomerName(event: TrackingEvent): string {
  return String(event.customer?.name || '').trim() || '未命名客户'
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

function customerLocation(event: TrackingEvent): string {
  const customer = event.customer
  if (!customer) return '-'
  return [customer.country, customer.region, customer.city, customer.postcode, customer.street, customer.houseNumber]
    .filter(Boolean)
    .join(' / ') || '-'
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

function openTrackingCampaignDetail(event: TrackingEvent): void {
  const campaignId = String(event.campaignId || '')
  if (!campaignId) return
  openCampaignDetail(campaignForEvent(event) || {
    id: campaignId,
    name: trackingCampaignName(event),
    objective: '',
    status: 'DRAFT'
  })
}
</script>
