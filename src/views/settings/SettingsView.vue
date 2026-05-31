<template>

<section v-if="canAccessNav('settings') && state.activeNav === 'settings'" class="utility-page">
          <article class="ops-panel">
            <div class="panel-title">
              <Settings :size="19" />
              <h3>租户账号</h3>
            </div>
            <dl class="settings-list">
              <div><dt>登录邮箱</dt><dd>{{ state.user?.email }}</dd></div>
              <div><dt>租户 ID</dt><dd>{{ state.user?.tenantId }}</dd></div>
              <div><dt>用户 ID</dt><dd>{{ state.user?.userId }}</dd></div>
              <div><dt>主角色</dt><dd>{{ primaryRoleLabel }}（{{ primaryRole }}）</dd></div>
              <div><dt>全部角色</dt><dd>{{ state.user?.roles?.join(', ') || 'TENANT_OWNER' }}</dd></div>
              <div><dt>可访问页面</dt><dd>{{ availableNavItems.map((item) => item.label).join('、') }}</dd></div>
            </dl>
          </article>
        </section>
</template>
<script setup lang="ts">
import { Settings } from 'lucide-vue-next'
import * as admin from '../../state/index'

const {
  state,
  canAccessNav,
  primaryRoleLabel,
  primaryRole,
  availableNavItems
} = admin
</script>
