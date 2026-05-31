import { createApp } from 'vue'
import { getActivePinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './state/index'
import './assets/styles/global.css'

const pinia = getActivePinia()!
const app = createApp(App).use(pinia).use(router)

router.isReady().then(() => {
  app.mount('#app')
})
