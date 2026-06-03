<template>
  <div
    v-if="
      state.selectedCustomer ||
      state.customerCreateMode ||
      state.customerEditMode
    "
    class="modal-backdrop"
    @click.self="closeCustomerDialog"
  >
    <section
      class="modal-panel customer-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-modal-title"
    >
      <div class="modal-header">
        <div>
          <h3 id="customer-modal-title">
            {{
              state.customerCreateMode
                ? "手动录入客户"
                : "客户信息"
            }}
          </h3>
          <p>
            {{
              state.customerCreateMode
                ? "新增客户资产时会尽量补齐基础信息并直接写入主表"
                : state.customerEditMode
                  ? "直接编辑客户主表字段，保存后会同步更新客户资产"
                  : "查看客户主表字段和客户资产画像"
            }}
          </p>
        </div>
        <div class="modal-header-actions">
          <button
            class="icon-action"
            type="button"
            title="关闭"
            @click="closeCustomerDialog"
          >
            <X :size="16" />
          </button>
        </div>
      </div>
      <div class="customer-modal-form">
        <div class="customer-modal-summary" v-if="state.selectedCustomer">
          <div>
            <span>客户信息</span>
            <h4>{{ profileAsset().name || "未命名客户" }}</h4>
          </div>
          <div class="detail-summary">
            <span :class="['status', statusTone(profileAsset().contactStatus)]">
              {{ statusLabel(profileAsset().contactStatus || "NOT_CONTACTED") }}
            </span>
            <span :class="['status', statusTone(profileAsset().emailQuality)]">
              {{ statusLabel(profileAsset().emailQuality || "PENDING") }}
            </span>
            <span :class="['status', sourceTone(profileAsset().sourcePrimary)]">
              {{ sourceLabel(profileAsset().sourcePrimary) }}
            </span>
            <label
              v-if="!state.customerCreateMode && !state.customerEditMode"
              class="detail-quality-label"
            >
              邮箱状态
              <select
                class="email-quality-select"
                :value="profileAsset().emailQuality || 'PENDING'"
                :disabled="state.loading"
                @change="onEmailQualityChange"
              >
                <option v-for="q in emailQualityOptions" :key="q" :value="q">
                  {{ statusLabel(q) }}
                </option>
              </select>
            </label>
          </div>
        </div>

        <div v-if="customerReadOnly" class="customer-profile-layout">
          <section class="customer-info-section">
            <div class="customer-info-heading">
              <strong>主表字段</strong>
              <span>客户资产主表当前值</span>
            </div>
            <dl class="customer-field-grid">
              <div>
                <dt>名称</dt>
                <dd>{{ displayValue(profileAsset().name) }}</dd>
              </div>
              <div>
                <dt>邮箱</dt>
                <dd>{{ displayValue(profileAsset().email) }}</dd>
              </div>
              <div>
                <dt>电话</dt>
                <dd>{{ displayValue(profileAsset().phone) }}</dd>
              </div>
              <div>
                <dt>官网</dt>
                <dd>
                  <a
                    v-if="profileAsset().website"
                    :href="normalizedWebsiteUrl(profileAsset().website)"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {{ formatWebsiteLabel(profileAsset().website) }}
                  </a>
                  <template v-else>-</template>
                </dd>
              </div>
              <div>
                <dt>国家 / 城市</dt>
                <dd>{{ displayValue(profileAsset().country) }} / {{ displayValue(profileAsset().city) }}</dd>
              </div>
              <div>
                <dt>地址</dt>
                <dd>{{ addressLabel(profileAsset()) }}</dd>
              </div>
              <div>
                <dt>坐标</dt>
                <dd>{{ coordinateLabel(profileAsset()) }}</dd>
              </div>
              <div>
                <dt>时区</dt>
                <dd>{{ displayValue(profileValue('timezone') || profileAsset().timezone) }}</dd>
              </div>
            </dl>
          </section>

          <section class="customer-info-section">
            <div class="customer-info-heading">
              <strong>客户资产画像</strong>
              <span>{{ state.customerProfileLoading ? "画像加载中" : "画像聚合结果" }}</span>
            </div>
            <div v-if="state.customerProfileLoading" class="inline-loading">正在加载客户资产画像...</div>
            <div v-else class="profile-summary-grid">
              <div class="profile-summary-card">
                <span>旅行方向</span>
                <strong>{{ travelDirectionLabel(travelProfileValue('travelDirection')) }}</strong>
                <small>{{ confidenceLabel(travelProfileValue('confidence')) }}</small>
              </div>
              <div class="profile-summary-card">
                <span>主要国家</span>
                <strong>{{ countryLabel(recordValue(travelProfile(), 'primaryCountry')) }}</strong>
                <small>{{ displayValue(recordValue(travelProfile(), 'evidenceSource')) }}</small>
              </div>
              <div class="profile-summary-card wide">
                <span>业务范围</span>
                <div v-if="businessScopeTags.length" class="tag-cloud">
                  <span v-for="scope in businessScopeTags" :key="scope" class="status info">
                    {{ scope }}
                  </span>
                </div>
                <strong v-else>-</strong>
              </div>
              <div class="profile-summary-card wide">
                <span>语言</span>
                <div v-if="languageTags.length" class="tag-cloud">
                  <span v-for="language in languageTags" :key="language" class="status neutral">
                    {{ language }}
                  </span>
                </div>
                <strong v-else>-</strong>
              </div>
            </div>
          </section>

          <section class="customer-info-section">
            <div class="customer-info-heading">
              <strong>目的地与来源证据</strong>
              <span>用于判断客户偏好和数据可信度</span>
            </div>
            <div class="profile-evidence-grid">
              <div class="profile-evidence-list">
                <strong>目的地</strong>
                <div v-if="destinationTags.length" class="tag-cloud">
                  <span v-for="destination in destinationTags" :key="destination" class="status neutral">
                    {{ destination }}
                  </span>
                </div>
                <span v-else class="profile-empty">暂无目的地画像</span>
              </div>
              <div class="profile-evidence-list">
                <strong>来源证据</strong>
                <ul v-if="sourceItems.length" class="source-evidence-list">
                  <li v-for="source in sourceItems" :key="source.key">
                    <span :class="['status', sourceTone(source.sourceType)]">
                      {{ sourceLabel(source.sourceType) }}
                    </span>
                    <a
                      v-if="source.sourceUrl"
                      :href="source.sourceUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {{ source.title }}
                    </a>
                    <strong v-else>{{ source.title }}</strong>
                    <small>{{ source.meta }}</small>
                  </li>
                </ul>
                <span v-else class="profile-empty">暂无来源证据</span>
              </div>
            </div>
          </section>
        </div>

        <form
          v-else
          class="ops-form customer-edit-form"
          @submit.prevent="submitCustomerEdit"
        >
          <div class="customer-edit-grid">
            <label>名称 <input v-model="state.customerEditForm.name" required /></label>
            <label>
              客户状态
              <select v-model="state.customerEditForm.contactStatus">
                <option v-for="status in contactStatusOptions" :key="status" :value="status">
                  {{ statusLabel(status) }}
                </option>
              </select>
            </label>
            <label>邮箱 <input v-model="state.customerEditForm.email" type="email" /></label>
            <label>
              邮箱状态
              <select v-model="state.customerEditForm.emailQuality">
                <option v-for="q in emailQualityOptions" :key="q" :value="q">
                  {{ statusLabel(q) }}
                </option>
              </select>
            </label>
            <label>电话 <input v-model="state.customerEditForm.phone" /></label>
            <label>官网 <input v-model="state.customerEditForm.website" /></label>
            <LocationSelect
              v-model="locationValue"
              :disabled="state.loading"
            />
            <label>邮编 <input v-model="state.customerEditForm.postcode" /></label>
            <label>街道 <input v-model="state.customerEditForm.street" /></label>
            <label>门牌号 <input v-model="state.customerEditForm.houseNumber" /></label>
            <label class="span-2">
              业务范围
              <textarea
                v-model="state.customerEditForm.businessScope"
                rows="4"
              ></textarea>
            </label>
          </div>

          <div class="modal-actions customer-edit-actions">
            <button
              class="secondary-action"
              type="button"
              :disabled="state.loading"
              @click="closeCustomerDialog"
            >
              取消
            </button>
            <button class="primary-action" type="submit" :disabled="state.loading">
              {{ state.customerCreateMode ? "创建客户" : "保存客户" }}
            </button>
          </div>
        </form>

        <div v-if="customerReadOnly" class="modal-actions customer-edit-actions">
          <button
            class="secondary-action"
            type="button"
            :disabled="state.loading"
            @click="closeCustomerDialog"
          >
            取消
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, proxyRefs } from "vue";
import { storeToRefs } from 'pinia'
import { X } from "lucide-vue-next";
import type { ContactStatus, Customer, EmailQuality } from '../../types'
import { useAppStore } from '../../state/useAppStore'
import {
  closeCustomerDialog,
  EMAIL_QUALITY_OPTIONS as emailQualityOptions,
  profileAsset,
  saveCustomerEdit,
  updateEmailQuality,
  useCustomerStore
} from '../../state/useCustomerStore'
import {
  destinationLabel,
  displayValue,
  formatLanguages,
  formatWebsiteLabel,
  normalizedWebsiteUrl,
  statusLabel
} from '../../utils/format'
import LocationSelect from "../common/LocationSelect.vue";

const appStore = useAppStore()
const customerStore = useCustomerStore()
const state = proxyRefs({
  ...storeToRefs(appStore),
  ...storeToRefs(customerStore)
})

const emit = defineEmits<{
  saved: []
}>()

const customerReadOnly = computed(() => !state.customerCreateMode && !state.customerEditMode)

const contactStatusOptions: ContactStatus[] = [
  'NOT_CONTACTED',
  'READY_TO_VERIFY',
  'CONTACTED',
  'UNSUBSCRIBED',
  'BOUNCED',
  'INVALID'
]

type ProfileRecord = Record<string, unknown>

const businessScopeTags = computed(() => {
  return splitTags(String(profileValue('businessScope') || profileAsset().businessScope || '')).map(readableTagLabel)
})

const languageTags = computed(() => {
  return formatLanguages(Array.isArray(state.customerProfile?.languages) ? state.customerProfile.languages : [])
    .split('、')
    .map((item) => item.trim())
    .filter((item) => item && item !== '-')
})

const destinationTags = computed(() => {
  const destinations = Array.isArray(state.customerProfile?.destinations) ? state.customerProfile.destinations : []
  return destinations
    .map((destination) => destinationLabel(destination as Parameters<typeof destinationLabel>[0]))
    .filter((item) => item && item !== '-')
})

const sourceItems = computed(() => {
  const sources = Array.isArray(state.customerProfile?.sources) ? state.customerProfile.sources : []
  return sources.map((source, index) => {
    const record = asRecord(source)
    const sourceType = textValue(record.sourceType) || textValue(record.sourcePrimary) || 'OSM'
    const sourceObjectId = textValue(record.sourceObjectId)
    const title = textValue(record.name) || textValue(record.sourceObjectType) || sourceObjectId || `来源 ${index + 1}`
    const address = [record.addrCountry, record.addrCity, record.addrStreet, record.addrHouseNumber]
      .map(textValue)
      .filter(Boolean)
      .join(' / ')
    return {
      key: textValue(record.id) || `${sourceType}-${sourceObjectId || index}`,
      sourceType,
      sourceUrl: textValue(record.sourceUrl),
      title,
      meta: address || textValue(record.license) || sourceObjectId || '已关联客户主表'
    }
  })
})

const locationValue = computed({
  get: () => ({
    country: state.customerEditForm.country || "",
    city: state.customerEditForm.city || "",
  }),
  set: (val) => {
    state.customerEditForm.country = val.country;
    state.customerEditForm.city = val.city;
  },
});

async function submitCustomerEdit() {
  await saveCustomerEdit()
  if (!state.error) {
    emit('saved')
  }
}

function onEmailQualityChange(event: Event): void {
  const target = event.target as HTMLSelectElement | null
  if (!target) return
  void updateEmailQuality(profileAsset(), target.value as EmailQuality)
}

function statusTone(status: string | undefined): string {
  const value = String(status || '').toUpperCase()
  if (['VERIFIED', 'CONTACTED'].includes(value)) return 'success'
  if (['READY_TO_VERIFY', 'PENDING', 'NOT_CONTACTED'].includes(value)) return 'warning'
  if (['BOUNCED', 'INVALID', 'UNSUBSCRIBED', 'MISSING'].includes(value)) return 'danger'
  return 'neutral'
}

function sourceTone(source: string | undefined): string {
  const value = String(source || '').toUpperCase()
  if (value === 'MANUAL') return 'success'
  if (['JSON', 'EXCEL', 'API', 'CUSTOMER_JSON', 'CUSTOMER_EXCEL', 'CUSTOMER_API'].includes(value)) return 'info'
  return 'neutral'
}

function sourceLabel(source: string | undefined): string {
  const labels: Record<string, string> = {
    OSM: '地图来源',
    MANUAL: '手动录入',
    JSON: 'JSON 导入',
    EXCEL: 'Excel 导入',
    API: '接口导入',
    CUSTOMER_JSON: 'JSON 导入',
    CUSTOMER_EXCEL: 'Excel 导入',
    CUSTOMER_API: '接口导入'
  }
  const value = String(source || 'OSM').toUpperCase()
  return labels[value] || value
}

function travelDirectionLabel(value: unknown): string {
  const labels: Record<string, string> = {
    INBOUND_CHINA: '入境中国',
    OUTBOUND_CHINA: '中国出境',
    DOMESTIC: '本地/国内',
    GLOBAL: '全球业务',
    UNKNOWN: '待识别'
  }
  const key = textValue(value).toUpperCase()
  return labels[key] || displayValue(key)
}

function confidenceLabel(value: unknown): string {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return '置信度待补充'
  return `置信度 ${Math.round(numeric * 100)}%`
}

function coordinateLabel(customer: Customer): string {
  if (customer.longitude === undefined || customer.latitude === undefined) return '-'
  return `${customer.longitude}, ${customer.latitude}`
}

function addressLabel(customer: Customer): string {
  const value = [customer.street, customer.houseNumber, customer.postcode]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .join(' / ')
  return value || '-'
}

function profileValue(key: string): unknown {
  return asRecord(state.customerProfile)[key]
}

function travelProfile(): ProfileRecord {
  return asRecord(state.customerProfile?.travelProfile)
}

function travelProfileValue(key: string): unknown {
  return travelProfile()[key]
}

function recordValue(value: unknown, key: string): unknown {
  return asRecord(value)[key]
}

function countryLabel(value: unknown): string {
  const country = asRecord(value)
  const id = textValue(country.id || country.alpha3)
  const name = textValue(country.name)
  if (!id && !name) return '-'
  return [id, name].filter(Boolean).join(' ')
}

function splitTags(value: string): string[] {
  return value
    .split(/[,，;；、\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8)
}

function readableTagLabel(value: string): string {
  const labels: Record<string, string> = {
    travel_agency: '旅行社',
    tour_operator: '地接/组团社',
    hotel: '酒店',
    ticketing: '票务',
    inbound_china: '入境中国',
    outbound_china: '中国出境',
    mice: '会奖旅游',
    leisure: '休闲度假'
  }
  const key = value.trim().toLowerCase()
  return labels[key] || value.replace(/[_-]+/g, ' ')
}

function asRecord(value: unknown): ProfileRecord {
  return value && typeof value === 'object' ? value as ProfileRecord : {}
}

function textValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}
</script>
