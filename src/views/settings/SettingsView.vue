<template>
  <section v-if="canAccessNav('settings', appStore) && activeNav === 'settings'" class="settings-page">
    <aside class="settings-nav-panel" aria-label="租户设置分组">
      <div class="settings-nav-heading">
        <Settings :size="18" />
        <div>
          <strong>设置中心</strong>
          <span>{{ settingsStatusText }}</span>
        </div>
      </div>
      <nav class="settings-nav-list">
        <a href="#tenant-account" class="active">
          <UserRound :size="16" />
          <span>租户账号</span>
        </a>
        <a href="#unsubscribe-settings">
          <Link2 :size="16" />
          <span>退订配置</span>
        </a>
        <a href="#email-blacklist">
          <ShieldMinus :size="16" />
          <span>邮件黑名单</span>
          <strong>{{ emailBlacklist.length }}</strong>
        </a>
      </nav>
    </aside>

    <div class="settings-main">
      <section class="settings-hero ops-panel">
        <div>
          <span class="section-kicker">Tenant settings</span>
          <h3>租户设置</h3>
          <p>集中管理账号上下文、退订入口和发送排除规则。后续新增配置可以继续按分组接入，不需要把所有字段堆在同一个表单里。</p>
        </div>
        <div class="settings-summary-grid" aria-label="租户设置摘要">
          <div>
            <span>当前租户</span>
            <strong>{{ user?.tenantId || '-' }}</strong>
          </div>
          <div>
            <span>可访问页面</span>
            <strong>{{ accessiblePageCount }}</strong>
          </div>
          <div>
            <span>黑名单规则</span>
            <strong>{{ emailBlacklist.length }}</strong>
          </div>
        </div>
      </section>

      <article id="tenant-account" class="ops-panel settings-section-panel">
        <div class="settings-section-header">
          <div class="panel-title">
            <UserRound :size="19" />
            <h3>租户账号</h3>
          </div>
          <span class="status neutral">{{ primaryRoleLabel }}</span>
        </div>
        <dl class="settings-list account-settings-list">
          <div><dt>登录邮箱</dt><dd>{{ user?.email }}</dd></div>
          <div><dt>租户 ID</dt><dd>{{ user?.tenantId }}</dd></div>
          <div><dt>用户 ID</dt><dd>{{ user?.userId }}</dd></div>
          <div><dt>主角色</dt><dd>{{ primaryRoleLabel }}（{{ primaryRole }}）</dd></div>
          <div><dt>全部角色</dt><dd>{{ user?.roles?.join(', ') || 'TENANT_OWNER' }}</dd></div>
          <div><dt>可访问页面</dt><dd>{{ accessibleNavLabels }}</dd></div>
        </dl>
      </article>

      <article id="unsubscribe-settings" class="ops-panel settings-section-panel">
        <div class="settings-section-header">
          <div>
            <div class="panel-title">
              <Link2 :size="19" />
              <h3>邮件退订配置</h3>
            </div>
            <p>用于模板变量 ${unsubscribeLink} 的落地页入口，保存后会影响后续邮件渲染。</p>
          </div>
          <span class="status" :class="unsubscribePageUrl ? 'success' : 'warning'">
            {{ unsubscribePageUrl ? '已配置' : '待配置' }}
          </span>
        </div>
        <form class="ops-form settings-form" @submit.prevent="saveTenantSettings">
          <label>
            退订页面 URL
            <input
              v-model="unsubscribePageUrl"
              placeholder="https://tengxuan.com/unsubscribe"
              autocomplete="url"
            />
          </label>
          <div class="settings-helper">
            <Info :size="15" />
            <p>
              HTML 模板必须包含 ${unsubscribeLink}。后端会渲染退订页面 URL 并追加 token 参数；退订和恢复订阅分别调用订阅接口完成状态更新。
            </p>
          </div>
          <div class="settings-form-actions">
            <button class="primary-action" type="submit" :disabled="appStore.loading">
              保存退订配置
            </button>
          </div>
        </form>
      </article>

      <article id="email-blacklist" class="ops-panel settings-section-panel">
        <div class="settings-section-header">
          <div>
            <div class="panel-title">
              <ShieldMinus :size="19" />
              <h3>租户邮件黑名单</h3>
            </div>
            <p>发送前按当前租户规则复查，适合维护投诉邮箱、合作终止域名和长期退信来源。</p>
          </div>
          <span class="status info">{{ emailBlacklist.length }} 条规则</span>
        </div>
        <form class="ops-form blacklist-form settings-form" @submit.prevent="addEmailBlacklistEntry">
          <label>
            过滤类型
            <select v-model="blacklistForm.type">
              <option value="EMAIL">具体邮箱</option>
              <option value="DOMAIN">邮箱后缀</option>
            </select>
          </label>
          <label>
            匹配内容
            <input
              v-model="blacklistForm.pattern"
              :placeholder="blacklistForm.type === 'EMAIL' ? 'info@example.com' : 'example.com'"
              autocomplete="off"
            />
          </label>
          <label>
            备注
            <input v-model="blacklistForm.note" placeholder="例如：投诉、合作终止、域名退信" />
          </label>
          <button class="primary-action" type="submit" :disabled="appStore.loading">
            <Plus :size="15" />
            加入黑名单
          </button>
        </form>
        <div class="settings-helper">
          <Info :size="15" />
          <p>预推送和正式确认推送都会复查；具体邮箱完全匹配，邮箱后缀匹配该域名下所有邮箱。</p>
        </div>
        <div class="data-table blacklist-table">
          <table>
            <thead>
              <tr>
                <th>类型</th>
                <th>匹配内容</th>
                <th>备注</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!emailBlacklist.length">
                <td colspan="5" class="compact-empty">暂无黑名单规则</td>
              </tr>
              <tr v-for="entry in emailBlacklist" :key="entry.id">
                <td><span class="status">{{ blacklistTypeLabel(entry.type) }}</span></td>
                <td><strong>{{ entry.pattern }}</strong></td>
                <td>{{ entry.note || '-' }}</td>
                <td>{{ formatDateTime(entry.createdAt) }}</td>
                <td>
                  <button class="row-action danger" type="button" :disabled="appStore.loading" @click="deleteEmailBlacklistEntry(entry.id)">
                    <Trash2 :size="14" />
                    删除
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </div>
  </section>
</template>
<script setup lang="ts">
import { Info, Link2, Plus, Settings, ShieldMinus, Trash2, UserRound } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { customersApi } from '../../api/customers'
import { canAccessNav, useAppStore } from '../../state/useAppStore'
import type { TenantEmailBlacklistEntry, TenantEmailBlacklistForm, TenantEmailBlacklistType } from '../../types'
import { formatDateTime } from '../../utils/format'

const appStore = useAppStore()
const { activeNav, primaryRoleLabel, primaryRole, availableNavItems, user } = storeToRefs(appStore)
const unsubscribePageUrl = ref('')
const emailBlacklist = ref<TenantEmailBlacklistEntry[]>([])
const blacklistForm = ref<TenantEmailBlacklistForm>({
  type: 'EMAIL',
  pattern: '',
  note: ''
})

const accessibleNavLabels = computed(() => availableNavItems.value.map((item) => item.label).join('、'))
const accessiblePageCount = computed(() => `${availableNavItems.value.length} 个`)
const settingsStatusText = computed(() => (unsubscribePageUrl.value ? '关键配置已就绪' : '退订入口待配置'))

onMounted(() => {
  void loadTenantSettings()
})

async function loadTenantSettings(): Promise<void> {
  if (!appStore.token) return
  try {
    const settings = await customersApi.getTenantSettings()
    unsubscribePageUrl.value = settings.unsubscribePageUrl || ''
    emailBlacklist.value = settings.emailBlacklist || []
  } catch (error) {
    const err = error as { message?: string }
    appStore.error = `租户配置加载失败：${err.message}`
  }
}

async function saveTenantSettings(): Promise<void> {
  appStore.loading = true
  appStore.error = ''
  appStore.notice = ''
  try {
    const settings = await customersApi.updateTenantSettings({
      unsubscribePageUrl: unsubscribePageUrl.value.trim()
    })
    unsubscribePageUrl.value = settings.unsubscribePageUrl || ''
    emailBlacklist.value = settings.emailBlacklist || emailBlacklist.value
    appStore.notice = '退订配置已保存'
  } catch (error) {
    const err = error as { message?: string }
    appStore.error = `退订配置保存失败：${err.message}`
  } finally {
    appStore.loading = false
  }
}

async function addEmailBlacklistEntry(): Promise<void> {
  appStore.loading = true
  appStore.error = ''
  appStore.notice = ''
  try {
    await customersApi.addEmailBlacklistEntry({
      type: blacklistForm.value.type,
      pattern: blacklistForm.value.pattern.trim(),
      note: blacklistForm.value.note.trim()
    })
    blacklistForm.value.pattern = ''
    blacklistForm.value.note = ''
    emailBlacklist.value = await customersApi.listEmailBlacklist()
    appStore.notice = '邮件黑名单已更新'
  } catch (error) {
    const err = error as { message?: string }
    appStore.error = `邮件黑名单保存失败：${err.message}`
  } finally {
    appStore.loading = false
  }
}

async function deleteEmailBlacklistEntry(id: string): Promise<void> {
  if (!window.confirm('确认删除这条邮件黑名单规则？')) return
  appStore.loading = true
  appStore.error = ''
  appStore.notice = ''
  try {
    await customersApi.deleteEmailBlacklistEntry(id)
    emailBlacklist.value = emailBlacklist.value.filter((entry) => entry.id !== id)
    appStore.notice = '邮件黑名单规则已删除'
  } catch (error) {
    const err = error as { message?: string }
    appStore.error = `邮件黑名单删除失败：${err.message}`
  } finally {
    appStore.loading = false
  }
}

function blacklistTypeLabel(type: TenantEmailBlacklistType): string {
  return type === 'DOMAIN' ? '邮箱后缀' : '具体邮箱'
}
</script>
