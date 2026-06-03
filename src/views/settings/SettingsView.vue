<template>
  <section v-if="canAccessNav('settings', appStore) && activeNav === 'settings'" class="utility-page">
    <article class="ops-panel">
      <div class="panel-title">
        <Settings :size="19" />
        <h3>租户账号</h3>
      </div>
      <dl class="settings-list">
        <div><dt>登录邮箱</dt><dd>{{ user?.email }}</dd></div>
        <div><dt>租户 ID</dt><dd>{{ user?.tenantId }}</dd></div>
        <div><dt>用户 ID</dt><dd>{{ user?.userId }}</dd></div>
        <div><dt>主角色</dt><dd>{{ primaryRoleLabel }}（{{ primaryRole }}）</dd></div>
        <div><dt>全部角色</dt><dd>{{ user?.roles?.join(', ') || 'TENANT_OWNER' }}</dd></div>
        <div><dt>可访问页面</dt><dd>{{ accessibleNavLabels }}</dd></div>
      </dl>
    </article>

    <article class="ops-panel">
      <div class="panel-title">
        <Settings :size="19" />
        <h3>邮件退订配置</h3>
      </div>
      <form class="ops-form" @submit.prevent="saveTenantSettings">
        <label>
          退订页面 URL
          <input
            v-model="unsubscribePageUrl"
            placeholder="https://tengxuan.com/unsubscribe"
            autocomplete="url"
          />
        </label>
        <p class="panel-note">
          HTML 模板必须包含 ${unsubscribeLink}。后端会把它渲染为退订页面 URL，并追加 token 参数。退订页面调用 POST /api/subscriptions/unsubscribe，恢复订阅调用 POST /api/subscriptions/subscribe。
        </p>
        <button class="primary-action" type="submit" :disabled="appStore.loading">
          保存退订配置
        </button>
      </form>
    </article>
  </section>
</template>
<script setup lang="ts">
import { Settings } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { customersApi } from '../../api/customers'
import { canAccessNav, useAppStore } from '../../state/useAppStore'

const appStore = useAppStore()
const { activeNav, primaryRoleLabel, primaryRole, availableNavItems, user } = storeToRefs(appStore)
const unsubscribePageUrl = ref('')

const accessibleNavLabels = computed(() => availableNavItems.value.map((item) => item.label).join('、'))

onMounted(() => {
  void loadTenantSettings()
})

async function loadTenantSettings(): Promise<void> {
  if (!appStore.token) return
  try {
    const settings = await customersApi.getTenantSettings()
    unsubscribePageUrl.value = settings.unsubscribePageUrl || ''
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
    appStore.notice = '退订配置已保存'
  } catch (error) {
    const err = error as { message?: string }
    appStore.error = `退订配置保存失败：${err.message}`
  } finally {
    appStore.loading = false
  }
}
</script>
