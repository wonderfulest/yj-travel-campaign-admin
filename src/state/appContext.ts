import { createPinia, setActivePinia } from 'pinia'
import { useAppStore } from './useAppStore.ts'
import { createApiRequest } from '../api/client.ts'

setActivePinia(createPinia())

export const appStore = useAppStore()
export const request = createApiRequest(() => appStore.token)
