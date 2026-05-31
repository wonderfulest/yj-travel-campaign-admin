<template>
  <section class="main-grid single-column">
    <article class="table-panel">
      <div class="panel-header">
        <div>
          <h3>客户资产库</h3>
          <p>
            当前列表展示主表；客户 JSON 导入先写来源表，再按合并规则补全主表
          </p>
        </div>
        <div class="panel-actions">
          <button
            class="primary-action compact"
            type="button"
            :disabled="state.loading"
            @click="openCustomerCreate"
          >
            <Plus :size="15" />
            手动录入
          </button>
          <label class="search-box">
            <Search :size="16" />
            <input v-model="state.filter" placeholder="搜索名称、邮箱、国家" />
          </label>
        </div>
      </div>
      <div class="data-table">
        <table>
          <thead>
            <tr>
              <th>旅行社</th>
              <th>邮箱</th>
              <th>地区</th>
              <th>状态</th>
              <th>来源</th>
              <th>坐标</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="customer in filteredCustomers"
              :key="customer.id"
              :class="{ selected: state.selectedCustomer?.id === customer.id }"
            >
              <td>
                <strong>{{ customer.name || "未命名客户" }}</strong>
                <a
                  v-if="customer.website"
                  class="customer-website"
                  :href="normalizedWebsiteUrl(customer.website)"
                  target="_blank"
                  rel="noopener noreferrer"
                  :title="customer.website"
                >
                  {{ formatWebsiteLabel(customer.website) }}
                </a>
                <span v-else>{{ customer.phone || "-" }}</span>
              </td>
              <td>{{ customer.email || "待补充" }}</td>
              <td>
                {{ customer.country || "-" }} / {{ customer.city || "-" }}
              </td>
              <td>
                <span class="status">{{
                  customer.emailQuality || "PENDING"
                }}</span>
              </td>
              <td>{{ customer.sourcePrimary || "OSM" }}</td>
              <td class="coord">
                <MapPin :size="14" />
                {{ customer.longitude || "-" }}, {{ customer.latitude || "-" }}
              </td>
              <td>
                <button
                  class="row-action"
                  type="button"
                  @click="openCustomerDetail(customer)"
                >
                  <Eye :size="14" />
                  详情
                </button>
                <button
                  class="row-action"
                  type="button"
                  @click="openCustomerEdit(customer)"
                >
                  <Pencil :size="14" />
                  编辑
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="pagination-bar">
        <div class="pagination-meta">
          <span>
            共 {{ state.customerPage.totalItems }} 条，当前第
            {{
              state.customerPage.totalPages ? state.customerPage.page + 1 : 0
            }}
            / {{ state.customerPage.totalPages }} 页
          </span>
          <label class="page-size-control">
            每页
            <select
              v-model.number="state.customerPage.size"
              @change="changeCustomerPageSize(state.customerPage.size)"
            >
              <option v-for="size in pageSizeOptions" :key="size" :value="size">
                {{ size }}
              </option>
            </select>
            条
          </label>
        </div>
        <div class="pagination-actions">
          <form
            class="page-jump-control"
            @submit.prevent="
              jumpCustomerPage($event.target.elements.page.value)
            "
          >
            <label
              >跳至<input
                name="page"
                type="number"
                min="1"
                :max="state.customerPage.totalPages || 1"
                :value="state.customerPage.page + 1"
            /></label>
            <button type="submit" :disabled="!state.customerPage.totalPages">
              跳转
            </button>
          </form>
          <button
            type="button"
            :disabled="!state.customerPage.hasPrevious"
            @click="changeCustomerPage(state.customerPage.page - 1)"
          >
            上一页
          </button>
          <button
            type="button"
            :disabled="!state.customerPage.hasNext"
            @click="changeCustomerPage(state.customerPage.page + 1)"
          >
            下一页
          </button>
        </div>
      </div>
    </article>

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
                  : "直接编辑客户主表字段，保存后会同步更新客户资产"
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
          @submit.prevent="saveCustomerEdit"
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
            <label>名称 <input v-model="state.customerEditForm.name" required /></label>
            <label>
              客户状态
              <select v-model="state.customerEditForm.contactStatus">
                <option value="NOT_CONTACTED">NOT_CONTACTED</option>
                <option value="READY_TO_VERIFY">READY_TO_VERIFY</option>
                <option value="VERIFIED">VERIFIED</option>
                <option value="UNSUBSCRIBED">UNSUBSCRIBED</option>
                <option value="BOUNCED">BOUNCED</option>
                <option value="INVALID">INVALID</option>
              </select>
            </label>
            <label>邮箱 <input v-model="state.customerEditForm.email" type="email" /></label>
            <label>
              邮箱状态
              <select v-model="state.customerEditForm.emailQuality">
                <option v-for="q in emailQualityOptions" :key="q" :value="q">
                  {{ q }}
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
      </section>
    </div>
  </section>
</template>
<script setup lang="ts">
import {
  Eye,
  MapPin,
  Pencil,
  Plus,
  Search,
  X,
} from "lucide-vue-next";
import * as admin from "../../state/index";
import LocationSelect from "../../components/common/LocationSelect.vue";
import { computed } from "vue";

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

const {
  state,
  filteredCustomers,
  PAGE_SIZE_OPTIONS: pageSizeOptions,
  changeCustomerPageSize,
  jumpCustomerPage,
  changeCustomerPage,
  normalizedWebsiteUrl,
  formatWebsiteLabel,
  openCustomerDetail,
  openCustomerCreate,
  openCustomerEdit,
  closeCustomerDialog,
  profileAsset,
  EMAIL_QUALITY_OPTIONS: emailQualityOptions,
  updateEmailQuality,
  saveCustomerEdit,
} = admin
</script>
