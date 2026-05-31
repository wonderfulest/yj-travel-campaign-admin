<template>

    <section class="dashboard-analysis-grid">
      <article class="ops-panel">
        <div class="panel-title">
          <CheckCircle2 :size="19" />
          <h3>数据质量</h3>
        </div>
        <div v-if="qualityDonut?.segments?.length" class="donut-chart">
          <svg viewBox="0 0 140 140" class="donut-svg" role="img" aria-label="邮箱质量占比">
            <g transform="rotate(-90 70 70)">
              <circle class="donut-track" cx="70" cy="70" :r="qualityDonut?.radius" />
              <circle
                v-for="(seg, idx) in qualityDonut?.segments"
                :key="idx"
                class="donut-arc"
                cx="70"
                cy="70"
                :r="qualityDonut?.radius"
                :stroke="seg.color"
                :stroke-dasharray="seg.dashArray"
                :stroke-dashoffset="seg.dashOffset"
              />
            </g>
            <text x="70" y="66" class="donut-total">{{ qualityDonut?.total }}</text>
            <text x="70" y="86" class="donut-total-label">邮箱总量</text>
          </svg>
          <ul class="donut-legend">
            <li v-for="(seg, idx) in qualityDonut?.segments" :key="idx">
              <i :style="{ background: seg.color }"></i>
              <span>{{ seg.label }}</span>
              <strong>{{ seg.percent }}%</strong>
            </li>
          </ul>
        </div>
        <dl class="result-list expanded">
          <div v-for="item in customerQualityStats" :key="item.status">
            <dt>{{ statusLabel(item.status) }}</dt>
            <dd>{{ item.customers }}</dd>
          </div>
          <div v-if="!customerQualityStats?.length">
            <dt>暂无邮箱质量数据</dt>
            <dd>0</dd>
          </div>
        </dl>
        <div class="status-breakdown">
          <span v-for="item in customerContactStats" :key="item.status">
            {{ statusLabel(item.status) }} {{ item.customers }}
          </span>
        </div>
      </article>

      <article class="ops-panel">
        <div class="panel-title">
          <Send :size="19" />
          <h3>触达准备度</h3>
        </div>
        <div v-if="reachabilityDonut?.segments?.length" class="donut-chart">
          <svg viewBox="0 0 140 140" class="donut-svg" role="img" aria-label="可触达占比">
            <g transform="rotate(-90 70 70)">
              <circle class="donut-track" cx="70" cy="70" :r="reachabilityDonut?.radius" />
              <circle
                v-for="(seg, idx) in reachabilityDonut?.segments"
                :key="idx"
                class="donut-arc"
                cx="70"
                cy="70"
                :r="reachabilityDonut?.radius"
                :stroke="seg.color"
                :stroke-dasharray="seg.dashArray"
                :stroke-dashoffset="seg.dashOffset"
              />
            </g>
            <text x="70" y="66" class="donut-total">{{ reachabilityDonut?.total }}</text>
            <text x="70" y="86" class="donut-total-label">客户总量</text>
          </svg>
          <ul class="donut-legend">
            <li v-for="(seg, idx) in reachabilityDonut?.segments" :key="idx">
              <i :style="{ background: seg.color }"></i>
              <span>{{ seg.label }}</span>
              <strong>{{ seg.percent }}%</strong>
            </li>
          </ul>
        </div>
        <dl class="result-list expanded">
          <div v-for="item in customerReachabilityStats" :key="item.label">
            <dt>{{ item.label }}</dt>
            <dd>{{ item.value }}</dd>
          </div>
        </dl>
        <p class="panel-note">可触达口径：有标准化邮箱，且未退订、未退信、未标记无效，邮箱质量不是缺失。</p>
      </article>

      <article class="ops-panel">
        <div class="panel-title">
          <Layers :size="19" />
          <h3>客群准备度</h3>
        </div>
        <dl class="result-list expanded">
          <div><dt>客群总数</dt><dd>{{ segmentReadinessStats?.segmentCount || 0 }}</dd></div>
          <div><dt>成员记录</dt><dd>{{ segmentReadinessStats?.memberCount || 0 }}</dd></div>
          <div><dt>去重客户</dt><dd>{{ segmentReadinessStats?.uniqueCustomerCount || 0 }}</dd></div>
          <div><dt>可触达成员</dt><dd>{{ segmentReadinessStats?.reachableMemberCount || 0 }}</dd></div>
        </dl>
        <div v-if="segmentReadinessBars?.length" class="segment-bar-chart">
          <button
            v-for="segment in segmentReadinessBars"
            :key="segment.segmentId"
            type="button"
            class="segment-bar-row"
            @click="setActiveNav('segments')"
          >
            <span class="segment-bar-name">{{ segment.segmentName }}</span>
            <span class="segment-bar-track">
              <i class="segment-bar-total" :style="{ width: segment.totalShare }">
                <em class="segment-bar-reachable" :style="{ width: segment.reachableShare }"></em>
              </i>
            </span>
            <strong>{{ segment.reachableMemberCount }} / {{ segment.memberCount }}</strong>
          </button>
        </div>
      </article>

      <article class="ops-panel dashboard-country-panel">
        <div class="panel-title">
          <Globe2 :size="19" />
          <h3>客户资产国家分布</h3>
        </div>
        <div v-if="customerCountryStats?.length" class="country-stat-list">
          <button
            v-for="item in customerCountryStats"
            :key="item.country"
            class="country-stat-row"
            type="button"
            @click="setActiveNav('customers')"
          >
            <span class="country-stat-name">{{ item.country || '未填写' }}</span>
            <span class="country-stat-bar">
              <i :style="{ width: formatCountryShare(item.customers) }"></i>
            </span>
            <strong>{{ item.customers }}</strong>
            <small>{{ formatCountryShare(item.customers) }}</small>
          </button>
        </div>
        <div v-else class="empty-state compact-empty">暂无客户资产国家数据</div>
      </article>
    </section>
</template>
<script setup lang="ts">
import { CheckCircle2, Globe2, Layers, Send } from 'lucide-vue-next'
import * as admin from '../../state/adminApp'

const {
  customerQualityStats,
  customerContactStats,
  customerReachabilityStats,
  customerCountryStats,
  qualityDonut,
  reachabilityDonut,
  segmentReadinessStats,
  segmentReadinessBars,
  statusLabel,
  formatCountryShare,
  setActiveNav
} = admin
</script>
