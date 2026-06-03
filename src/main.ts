import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { pinia } from './state/pinia'
import { useAppStore } from './state/useAppStore'
import { resetTemplatePreview } from './state/useCampaignStore'
import { setTokenProvider } from './api/request'
import './assets/styles/global.css'

const app = createApp(App).use(pinia).use(router)
const appStore = useAppStore(pinia)

setTokenProvider(() => appStore.token)

resetTemplatePreview()

if (appStore.token) {
  appStore.normalizeActiveNavAccess()
}

router.isReady().then(() => {
  app.mount('#app')
})
