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

          <section class="main-grid with-detail">
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

            <article class="ops-panel">
              <div class="panel-title">
                <Eye :size="19" />
                <h3>点击明细</h3>
              </div>
              <div class="data-table compact-table">
                <table>
                  <thead>
                    <tr>
                      <th>时间</th>
                      <th>活动</th>
                      <th>客户</th>
                      <th>来源</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="event in state.trackingEvents" :key="event.id">
                      <td>{{ event.clickedAt }}</td>
                      <td>{{ event.campaignId }}</td>
                      <td>{{ event.customerId || '-' }}</td>
                      <td>{{ event.referrer || '-' }}</td>
                    </tr>
                    <tr v-if="!state.trackingEvents.length">
                      <td colspan="4">暂无点击明细</td>
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
        </section>
</template>
<script setup lang="ts">
import { BarChart3, CheckCircle2, ExternalLink, Eye, Layers, RefreshCw, Users } from 'lucide-vue-next'
import * as admin from '../../state/index'

const {
  state,
  canAccessNav,
  loadTrackingAnalytics,
  percentValue,
  jumpTrackingEventPage,
  changeTrackingEventPage,
  jumpTrackingLinkPage,
  changeTrackingLinkPage
} = admin
</script>
