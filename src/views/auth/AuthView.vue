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
          <button :class="{active: state.authMode === 'login'}" @click="state.authMode = 'login'">登录</button>
          <button :class="{active: state.authMode === 'register'}" @click="state.authMode = 'register'">注册租户</button>
        </div>
        <form class="auth-form" @submit.prevent="login">
          <label v-if="state.authMode === 'register'">
            租户名称
            <input v-model="state.authForm.tenantName" autocomplete="organization" />
          </label>
          <label v-if="state.authMode === 'register'">
            用户名称
            <input v-model="state.authForm.displayName" autocomplete="name" />
          </label>
          <label>
            登录邮箱
            <input v-model="state.authForm.email" type="email" autocomplete="email" />
          </label>
          <label>
            密码
            <input v-model="state.authForm.password" type="password" autocomplete="current-password" />
          </label>
          <button class="primary-action" :disabled="state.loading">
            <KeyRound :size="17" />
            {{ state.authMode === 'register' ? '注册并登录' : '登录后台' }}
          </button>
        </form>
        <p v-if="state.error" class="message error">{{ state.error }}</p>
      </section>
    </main>
</template>
<script setup lang="ts">
import { KeyRound, Mail } from 'lucide-vue-next'
import * as admin from '../../state/adminApp'

const { state, login } = admin
</script>
