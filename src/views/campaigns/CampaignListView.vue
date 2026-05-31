<template>

<section v-if="canAccessNav('campaign-list') && state.activeNav === 'campaign-list'" class="campaign-list-page">
          <article class="table-panel">
            <div class="panel-header">
              <div>
                <h3>邮件活动列表</h3>
                <p>从列表进入某个活动的详情编辑页面；详情页负责模板、短链、客群和生命周期维护</p>
              </div>
              <div class="panel-actions">
                <button class="secondary-action compact" type="button" :disabled="state.loading" @click="loadCampaigns(0)">
                  <RefreshCw :size="16" />
                  刷新
                </button>
                <button class="primary-action compact" type="button" @click="startNewCampaign">
                  <Plus :size="16" />
                  新建活动
                </button>
              </div>
            </div>
            <div v-if="!state.campaigns.length" class="empty-state">
              <Layers :size="24" />
              <strong>暂无邮件活动</strong>
              <span>点击“新建活动”进入详情编辑页后创建第一条活动</span>
            </div>
            <div v-else class="data-table">
              <table>
                <thead>
                  <tr>
                    <th>活动</th>
                    <th>状态</th>
                    <th>推送通道</th>
                    <th>客群</th>
                    <th>待审</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="campaign in state.campaigns" :key="campaign.id" :class="{selected: state.selectedCampaign?.id === campaign.id}">
                    <td>
                      <strong>{{ campaign.name }}</strong>
                      <span>{{ campaign.id }} / {{ campaign.objective || '暂无目标说明' }}</span>
                    </td>
                    <td><span class="status">{{ campaign.status }}</span></td>
                    <td>{{ campaign.channelId || '未绑定' }}</td>
                    <td>{{ campaign.segmentIds?.length || 0 }} 个</td>
                    <td>{{ campaign.prePushRecords?.filter((item) => item.status === 'PENDING_REVIEW').length || 0 }}</td>
                    <td>
                      <button class="row-action" type="button" @click="openCampaignDetail(campaign)">
                        <Pencil :size="14" />
                        进入详情
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="pagination-bar">
              <div class="pagination-meta">
                <span>
                  共 {{ state.campaignPage.totalItems }} 条，当前第 {{ state.campaignPage.totalPages ? state.campaignPage.page + 1 : 0 }} / {{ state.campaignPage.totalPages }} 页
                </span>
                <label class="page-size-control">
                  每页
                  <select v-model.number="state.campaignPage.size" @change="changeCampaignPageSize(state.campaignPage.size)">
                    <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
                  </select>
                  条
                </label>
              </div>
              <div class="pagination-actions">
                <form class="page-jump-control" @submit.prevent="jumpCampaignPage($event.target.elements.page.value)">
                  <label>跳至<input name="page" type="number" min="1" :max="state.campaignPage.totalPages || 1" :value="state.campaignPage.page + 1" /></label>
                  <button type="submit" :disabled="!state.campaignPage.totalPages">跳转</button>
                </form>
                <button type="button" :disabled="!state.campaignPage.hasPrevious" @click="changeCampaignPage(state.campaignPage.page - 1)">上一页</button>
                <button type="button" :disabled="!state.campaignPage.hasNext" @click="changeCampaignPage(state.campaignPage.page + 1)">下一页</button>
              </div>
            </div>
          </article>
        </section>
</template>
<script setup lang="ts">
import { Layers, Pencil, Plus, RefreshCw } from 'lucide-vue-next'
import * as admin from '../../state/adminApp'

const {
  state,
  canAccessNav,
  PAGE_SIZE_OPTIONS: pageSizeOptions,
  loadCampaigns,
  startNewCampaign,
  openCampaignDetail,
  changeCampaignPageSize,
  jumpCampaignPage,
  changeCampaignPage
} = admin
</script>
