import { createApp } from 'vue'
import { getActivePinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './state/adminApp'
import './assets/styles/global.css'

const pinia = getActivePinia()!
createApp(App).use(pinia).use(router).mount('#app')
