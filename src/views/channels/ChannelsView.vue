<template>

<section v-if="canAccessNav('channels') && state.activeNav === 'channels'" class="channel-page">
          <article class="table-panel">
            <div class="panel-header">
              <div>
                <h3>已配置通道</h3>
                <p>这里只展示当前租户可用的推送通道；点击左侧菜单或仪表盘统计卡进入本页配置</p>
              </div>
            </div>
            <div class="channel-table">
              <div v-if="!state.channels.length" class="empty-state">
                <PlugZap :size="24" />
                <strong>暂无推送通道</strong>
                <span>保存右侧 AWS SES 配置后会显示在这里</span>
              </div>
              <ul v-else class="channel-list expanded">
                <li v-for="channel in state.channels" :key="channel.id">
                  <div>
                    <span>{{ channel.name }}</span>
                    <small v-if="channel.channelType === 'EMAIL_SMTP'">
                      SMTP / {{ channel.smtpHost }}:{{ channel.smtpPort }} / {{ channel.smtpEncryption }}
                    </small>
                    <small v-else>
                      AWS SES / {{ channel.awsRegion }} / Identity: {{ channel.sesIdentityStatus || 'NOT_CHECKED' }}
                    </small>
                    <small>{{ channel.fromEmail }} / {{ channel.replyTo || '无回复邮箱' }}</small>
                  </div>
                  <strong>{{ channel.status }}</strong>
                </li>
              </ul>
            </div>
            <div class="pagination-bar">
              <div class="pagination-meta">
                <span>
                  共 {{ state.channelPage.totalItems }} 条，当前第 {{ state.channelPage.totalPages ? state.channelPage.page + 1 : 0 }} / {{ state.channelPage.totalPages }} 页
                </span>
                <label class="page-size-control">
                  每页
                  <select v-model.number="state.channelPage.size" @change="changeChannelPageSize(state.channelPage.size)">
                    <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
                  </select>
                  条
                </label>
              </div>
              <div class="pagination-actions">
                <form class="page-jump-control" @submit.prevent="jumpChannelPage($event.target.elements.page.value)">
                  <label>跳至<input name="page" type="number" min="1" :max="state.channelPage.totalPages || 1" :value="state.channelPage.page + 1" /></label>
                  <button type="submit" :disabled="!state.channelPage.totalPages">跳转</button>
                </form>
                <button type="button" :disabled="!state.channelPage.hasPrevious" @click="changeChannelPage(state.channelPage.page - 1)">上一页</button>
                <button type="button" :disabled="!state.channelPage.hasNext" @click="changeChannelPage(state.channelPage.page + 1)">下一页</button>
              </div>
            </div>
          </article>

          <aside class="ops-stack">
            <article class="ops-panel">
              <div class="panel-title">
                <PlugZap :size="19" />
                <h3>邮件发送通道</h3>
              </div>
              <div class="channel-tabs" role="tablist" aria-label="邮件发送通道类型">
                <button type="button" :class="{active: state.channelType === 'smtp'}" @click="state.channelType = 'smtp'">
                  SMTP 通道
                </button>
                <button type="button" :class="{active: state.channelType === 'aws-ses'}" @click="state.channelType = 'aws-ses'">
                  AWS SES 通道
                </button>
              </div>
              <form class="ops-form" @submit.prevent="createChannel">
                <template v-if="state.channelType === 'smtp'">
                  <label>通道名称<input v-model="state.smtpForm.name" /></label>
                  <label>SMTP Host<input v-model="state.smtpForm.smtpHost" /></label>
                  <label>SMTP Port<input v-model.number="state.smtpForm.smtpPort" type="number" min="1" max="65535" /></label>
                  <label>
                    加密方式
                    <select v-model="state.smtpForm.smtpEncryption">
                      <option>None</option>
                      <option>STARTTLS</option>
                      <option>SSL</option>
                    </select>
                  </label>
                  <label>Username<input v-model="state.smtpForm.smtpUsername" autocomplete="off" /></label>
                  <label>Password<input v-model="state.smtpForm.smtpPassword" type="password" autocomplete="new-password" /></label>
                  <label>发件邮箱<input v-model="state.smtpForm.fromEmail" type="email" /></label>
                  <label>发件名称<input v-model="state.smtpForm.fromName" /></label>
                  <label>回复邮箱<input v-model="state.smtpForm.replyTo" type="email" /></label>
                </template>
                <template v-else>
                  <label>通道名称<input v-model="state.awsSesForm.name" /></label>
                  <label>Region<input v-model="state.awsSesForm.awsRegion" /></label>
                  <label>Access Key<input v-model="state.awsSesForm.awsAccessKeyId" autocomplete="off" /></label>
                  <label>Secret Key<input v-model="state.awsSesForm.awsSecretAccessKey" type="password" autocomplete="new-password" /></label>
                  <label>发件邮箱<input v-model="state.awsSesForm.fromEmail" type="email" /></label>
                  <label>发件名称<input v-model="state.awsSesForm.fromName" /></label>
                  <label>回复邮箱<input v-model="state.awsSesForm.replyTo" type="email" /></label>
                  <div class="readonly-field">
                    <span>SES Identity 状态</span>
                    <strong>NOT_CHECKED</strong>
                  </div>
                </template>
                <button class="primary-action" :disabled="state.loading">保存通道</button>
              </form>
            </article>
          </aside>
        </section>
</template>
<script setup lang="ts">
import { PlugZap } from 'lucide-vue-next'
import * as admin from '../../state/adminApp'

const {
  state,
  canAccessNav,
  PAGE_SIZE_OPTIONS: pageSizeOptions,
  changeChannelPageSize,
  jumpChannelPage,
  changeChannelPage,
  createChannel
} = admin
</script>
