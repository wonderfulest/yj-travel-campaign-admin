<template>
  <div class="app-message-box-stack" aria-live="polite" aria-atomic="true">
    <Transition name="app-message-box">
      <section
        v-if="message"
        :class="['app-message-box', `app-message-box-${message.type}`]"
        :role="message.type === 'error' ? 'alert' : 'status'"
      >
        <CircleAlert v-if="message.type === 'error'" :size="19" />
        <CircleCheck v-else :size="19" />
        <p>{{ message.text }}</p>
        <button class="icon-action" type="button" title="关闭提示" @click="hideMessage">
          <X :size="16" />
        </button>
      </section>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { CircleAlert, CircleCheck, X } from 'lucide-vue-next'
import { useAppStore } from '../../state/useAppStore'

type AppMessageType = 'error' | 'success'

const appStore = useAppStore()
const { error, notice } = storeToRefs(appStore)
const message = ref<{ type: AppMessageType; text: string } | null>(null)
let hideTimer: ReturnType<typeof window.setTimeout> | null = null

function clearHideTimer(): void {
  if (!hideTimer) return
  window.clearTimeout(hideTimer)
  hideTimer = null
}

function hideMessage(): void {
  clearHideTimer()
  message.value = null
}

function showMessage(type: AppMessageType, text: string): void {
  const normalized = text.trim()
  if (!normalized) {
    hideMessage()
    return
  }
  if (!appStore.isLoggedIn && type === 'error' && !normalized.startsWith('认证失败')) {
    hideMessage()
    return
  }
  clearHideTimer()
  message.value = { type, text: normalized }
  hideTimer = window.setTimeout(hideMessage, type === 'error' ? 5200 : 3600)
}

watch(error, (value) => showMessage('error', value || ''))
watch(notice, (value) => showMessage('success', value || ''))

onBeforeUnmount(clearHideTimer)
</script>
