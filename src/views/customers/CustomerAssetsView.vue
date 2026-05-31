<template>
  <section
    v-if="
      canAccessNav('customers') &&
      (state.activeNav === 'dashboard' ||
        (state.activeNav === 'customers' && state.customerTool === 'list'))
    "
    :class="[
      'main-grid',
      state.selectedCustomer ? 'with-detail' : 'single-column',
    ]"
  >
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

    <aside
      v-if="
        state.selectedCustomer &&
        !state.customerCreateMode &&
        !state.customerEditMode
      "
      class="ops-stack"
    >
      <article class="ops-panel customer-detail-panel">
        <div class="detail-header">
          <div>
            <span>客户详情</span>
            <h3>{{ state.selectedCustomer.name || "未命名客户" }}</h3>
          </div>
          <div class="detail-header-actions">
            <button
              class="row-action"
              type="button"
              @click="openCustomerEdit(state.selectedCustomer)"
            >
              <Pencil :size="13" />
              编辑
            </button>
            <button
              class="icon-button"
              type="button"
              title="关闭"
              @click="closeCustomerDetail"
            >
              <X :size="16" />
            </button>
          </div>
        </div>

        <div v-if="state.customerProfileLoading" class="inline-loading">
          正在加载客户全局画像...
        </div>
        <div class="detail-summary">
          <span class="status neutral">{{
            profileAsset().contactStatus || "NOT_CONTACTED"
          }}</span>
          <label class="detail-quality-label">
            邮箱状态
            <select
              class="email-quality-select"
              :value="profileAsset().emailQuality || 'PENDING'"
              :disabled="state.loading"
              @change="updateEmailQuality(profileAsset(), $event.target.value)"
            >
              <option v-for="q in emailQualityOptions" :key="q" :value="q">
                {{ q }}
              </option>
            </select>
          </label>
        </div>
        <dl class="detail-list">
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
                <ExternalLink :size="13" />
              </a>
              <span v-else>-</span>
            </dd>
          </div>
          <div>
            <dt>业务范围</dt>
            <dd>
              {{
                displayValue(
                  state.customerProfile?.businessScope ||
                    profileAsset().businessScope,
                )
              }}
            </dd>
          </div>
          <div>
            <dt>国家 / 地区 / 城市</dt>
            <dd>
              {{
                [
                  profileAsset().country,
                  profileAsset().region,
                  profileAsset().city,
                ]
                  .filter(Boolean)
                  .join(" / ") || "-"
              }}
            </dd>
          </div>
          <div>
            <dt>时区</dt>
            <dd>
              {{
                displayValue(
                  state.customerProfile?.timezone || profileAsset().timezone,
                )
              }}
            </dd>
          </div>
          <div>
            <dt>街道地址</dt>
            <dd>
              {{
                [
                  profileAsset().street,
                  profileAsset().houseNumber,
                  profileAsset().postcode,
                ]
                  .filter(Boolean)
                  .join(" ") || "-"
              }}
            </dd>
          </div>
          <div>
            <dt>客户类型</dt>
            <dd>{{ displayValue(profileAsset().assetType) }}</dd>
          </div>
          <div>
            <dt>来源</dt>
            <dd>{{ displayValue(profileAsset().sourcePrimary) }}</dd>
          </div>
          <div>
            <dt>来源对象 ID</dt>
            <dd>{{ displayValue(profileAsset().sourceObjectId) }}</dd>
          </div>
          <div>
            <dt>坐标</dt>
            <dd>
              {{ displayValue(profileAsset().longitude) }},
              {{ displayValue(profileAsset().latitude) }}
            </dd>
          </div>
          <div>
            <dt>创建时间</dt>
            <dd>{{ displayValue(profileAsset().createdAt) }}</dd>
          </div>
        </dl>
        <dl class="detail-list detail-section">
          <div>
            <dt>旅行方向</dt>
            <dd>
              {{
                displayValue(
                  state.customerProfile?.travelProfile?.travelDirection,
                )
              }}
            </dd>
          </div>
          <div>
            <dt>主国家 Basic</dt>
            <dd>
              {{
                state.customerProfile?.travelProfile?.primaryCountry
                  ? state.customerProfile.travelProfile.primaryCountry.id +
                    " / " +
                    localizedName(
                      state.customerProfile.travelProfile.primaryCountry.name,
                    )
                  : "-"
              }}
            </dd>
          </div>
          <div>
            <dt>主区域 Basic</dt>
            <dd>
              {{
                state.customerProfile?.travelProfile?.primaryWorldRegion
                  ? localizedName(
                      state.customerProfile.travelProfile.primaryWorldRegion
                        .name,
                    ) +
                    " / " +
                    state.customerProfile.travelProfile.primaryWorldRegion
                      .fullPath
                  : "-"
              }}
            </dd>
          </div>
          <div>
            <dt>语言</dt>
            <dd>{{ formatLanguages(state.customerProfile?.languages) }}</dd>
          </div>
        </dl>
        <dl class="detail-list detail-section">
          <div>
            <dt>旅行目的地</dt>
            <dd>
              <span v-if="!state.customerProfile?.destinations?.length">-</span>
              <span
                v-else
                v-for="destination in state.customerProfile.destinations"
                :key="
                  destination.destinationType + destinationLabel(destination)
                "
                class="inline-token"
              >
                {{ destination.primary ? "主" : "辅" }} ·
                {{ destination.destinationType }} ·
                {{ destinationLabel(destination) }}
              </span>
            </dd>
          </div>
          <div>
            <dt>来源证据</dt>
            <dd>
              <span v-if="!state.customerProfile?.sources?.length">-</span>
              <span
                v-else
                v-for="source in state.customerProfile.sources"
                :key="source.id"
                class="inline-token"
              >
                {{ source.sourceType }} ·
                {{ source.sourceObjectId || source.name || source.sourceUrl }}
              </span>
            </dd>
          </div>
        </dl>
      </article>
    </aside>

    <div
      v-if="state.customerCreateMode || state.customerEditMode"
      class="modal-backdrop"
      @click.self="closeCustomerEditor"
    >
      <section
        class="modal-panel customer-edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-edit-title"
      >
        <div class="modal-header">
          <div>
            <h3 id="customer-edit-title">
              {{ state.customerCreateMode ? "手动录入客户" : "编辑客户" }}
            </h3>
            <p>
              {{
                state.customerCreateMode
                  ? "新增客户资产后会直接调用后端接口写入主表"
                  : "修改客户资产后会调用后端接口更新主表"
              }}
            </p>
          </div>
          <button
            class="icon-action"
            type="button"
            title="关闭"
            @click="closeCustomerEditor"
          >
            <X :size="16" />
          </button>
        </div>
        <form
          class="ops-form customer-edit-form"
          @submit.prevent="saveCustomerEdit"
        >
          <div class="customer-edit-grid">
            <label
              >名称 <input v-model="state.customerEditForm.name" required
            /></label>
            <label
              >邮箱 <input v-model="state.customerEditForm.email" type="email"
            /></label>
            <label>电话 <input v-model="state.customerEditForm.phone" /></label>
            <label
              >官网 <input v-model="state.customerEditForm.website"
            /></label>
            <label
              >国家
              <input v-model="state.customerEditForm.country" placeholder="DE"
            /></label>
            <label>城市 <input v-model="state.customerEditForm.city" /></label>
            <label
              >邮编 <input v-model="state.customerEditForm.postcode"
            /></label>
            <label
              >街道 <input v-model="state.customerEditForm.street"
            /></label>
            <label
              >门牌号 <input v-model="state.customerEditForm.houseNumber"
            /></label>
            <label>
              邮箱状态
              <select v-model="state.customerEditForm.emailQuality">
                <option v-for="q in emailQualityOptions" :key="q" :value="q">
                  {{ q }}
                </option>
              </select>
            </label>
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
            <label class="span-2"
              >业务范围
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
              @click="closeCustomerEditor"
            >
              取消
            </button>
            <button
              class="primary-action"
              type="submit"
              :disabled="state.loading"
            >
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
  ExternalLink,
  MapPin,
  Pencil,
  Plus,
  Search,
  X,
} from "lucide-vue-next";
import * as admin from "../../state/adminApp";
import LocationSelect from "../../components/common/LocationSelect.vue";

const {
  state,
  canAccessNav,
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
  closeCustomerDetail,
  closeCustomerEditor,
  profileAsset,
  EMAIL_QUALITY_OPTIONS: emailQualityOptions,
  updateEmailQuality,
  displayValue,
  localizedName,
  formatLanguages,
  destinationLabel,
  saveCustomerEdit,
} = admin
</script>
