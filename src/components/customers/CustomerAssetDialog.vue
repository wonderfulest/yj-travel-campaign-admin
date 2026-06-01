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
      <form
        class="ops-form customer-edit-form customer-modal-form"
        @submit.prevent="submitCustomerEdit"
      >
        <div class="customer-modal-summary" v-if="state.selectedCustomer">
          <div>
            <span>客户信息</span>
            <h4>{{ profileAsset().name || "未命名客户" }}</h4>
          </div>
          <div class="detail-summary">
            <span class="status neutral">{{
              profileAsset().contactStatus || "NOT_CONTACTED"
            }}</span>
            <span class="status">{{
              profileAsset().emailQuality || "PENDING"
            }}</span>
            <label
              v-if="!state.customerCreateMode && !state.customerEditMode"
              class="detail-quality-label"
            >
              邮箱状态
              <select
                class="email-quality-select"
                :value="profileAsset().emailQuality || 'PENDING'"
                :disabled="state.loading"
                @change="
                  updateEmailQuality(profileAsset(), $event.target.value)
                "
              >
                <option v-for="q in emailQualityOptions" :key="q" :value="q">
                  {{ q }}
                </option>
              </select>
            </label>
          </div>
        </div>

        <div class="customer-edit-grid">
          <label>名称 <input v-model="state.customerEditForm.name" :disabled="customerReadOnly" required /></label>
          <label>
            客户状态
            <select v-model="state.customerEditForm.contactStatus" :disabled="customerReadOnly">
              <option value="NOT_CONTACTED">NOT_CONTACTED</option>
              <option value="READY_TO_VERIFY">READY_TO_VERIFY</option>
              <option value="VERIFIED">VERIFIED</option>
              <option value="UNSUBSCRIBED">UNSUBSCRIBED</option>
              <option value="BOUNCED">BOUNCED</option>
              <option value="INVALID">INVALID</option>
            </select>
          </label>
          <label>邮箱 <input v-model="state.customerEditForm.email" :disabled="customerReadOnly" type="email" /></label>
          <label>
            邮箱状态
            <select v-model="state.customerEditForm.emailQuality" :disabled="customerReadOnly">
              <option v-for="q in emailQualityOptions" :key="q" :value="q">
                {{ q }}
              </option>
            </select>
          </label>
          <label>电话 <input v-model="state.customerEditForm.phone" :disabled="customerReadOnly" /></label>
          <label>官网 <input v-model="state.customerEditForm.website" :disabled="customerReadOnly" /></label>
          <LocationSelect
            v-model="locationValue"
            :disabled="state.loading || customerReadOnly"
          />
          <label>邮编 <input v-model="state.customerEditForm.postcode" :disabled="customerReadOnly" /></label>
          <label>街道 <input v-model="state.customerEditForm.street" :disabled="customerReadOnly" /></label>
          <label>门牌号 <input v-model="state.customerEditForm.houseNumber" :disabled="customerReadOnly" /></label>
          <label class="span-2">
            业务范围
            <textarea
              v-model="state.customerEditForm.businessScope"
              :disabled="customerReadOnly"
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
          <button v-if="!customerReadOnly" class="primary-action" type="submit" :disabled="state.loading">
            {{ state.customerCreateMode ? "创建客户" : "保存客户" }}
          </button>
        </div>
      </form>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, proxyRefs } from "vue";
import { storeToRefs } from 'pinia'
import { X } from "lucide-vue-next";
import { useAppStore } from '../../state/useAppStore'
import {
  closeCustomerDialog,
  EMAIL_QUALITY_OPTIONS as emailQualityOptions,
  profileAsset,
  saveCustomerEdit,
  updateEmailQuality,
  useCustomerStore
} from '../../state/useCustomerStore'
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
</script>
