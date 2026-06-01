<template>

    <main class="auth-shell">
      <section class="auth-panel">
        <div class="brand-lockup">
          <div class="brand-mark"><Mail :size="22" /></div>
          <div>
            <h1>有解获客</h1>
            <p>邮箱获客系统后台</p>
          </div>
        </div>
        <div class="auth-tabs" role="tablist">
          <button :class="{active: authMode === 'login'}" @click="authMode = 'login'">登录</button>
          <button :class="{active: authMode === 'register'}" @click="authMode = 'register'">注册租户</button>
        </div>
        <form class="auth-form" @submit.prevent="login">
          <label v-if="authMode === 'register'">
            租户名称
            <input v-model="authForm.tenantName" autocomplete="organization" />
          </label>
          <label v-if="authMode === 'register'">
            用户名称
            <input v-model="authForm.displayName" autocomplete="name" />
          </label>
          <label>
            登录邮箱
            <input v-model="authForm.email" type="email" autocomplete="email" />
          </label>
          <label>
            密码
            <input v-model="authForm.password" type="password" autocomplete="current-password" />
          </label>
          <button class="primary-action" :disabled="loading">
            <KeyRound :size="17" />
            {{ authMode === 'register' ? '注册并登录' : '登录后台' }}
          </button>
        </form>
        <p v-if="error" class="message error">{{ error }}</p>
      </section>
    </main>
</template>
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { KeyRound, Mail } from 'lucide-vue-next'
import { useAppStore } from '../../state/useAppStore'

const appStore = useAppStore()
const { authMode, authForm, loading, error } = storeToRefs(appStore)

async function login(): Promise<void> {
  await appStore.login()
}
</script>
