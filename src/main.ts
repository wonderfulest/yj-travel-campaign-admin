import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { pinia } from './state/pinia'
import { useAppStore } from './state/useAppStore'
import { resetTemplatePreview } from './state/useCampaignStore'
import { setTokenProvider, setUnauthorizedHandler } from './api/request'
import './assets/styles/global.css'

const app = createApp(App).use(pinia).use(router)
const appStore = useAppStore(pinia)

setTokenProvider(() => appStore.token)
setUnauthorizedHandler(() => {
  if (appStore.isLoggedIn) {
    appStore.logout()
  }
  if (router.currentRoute.value.path !== '/login') {
    void router.replace('/login').catch(() => {})
  }
})

resetTemplatePreview()

if (appStore.token) {
  appStore.normalizeActiveNavAccess()
}

router.isReady().then(() => {
  app.mount('#app')
})
