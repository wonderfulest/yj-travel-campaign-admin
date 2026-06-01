import router from './router'
import { navToPath } from './navigation'
import { activateNav, useAppStore } from './state/useAppStore'

export function navigateToNav(nav: string): void {
  const appStore = useAppStore()
  activateNav(nav, appStore)
  void router.push(navToPath(nav, appStore.customerTool)).catch(() => {})
}

export function replaceWithActiveNav(): void {
  const appStore = useAppStore()
  void router.replace(navToPath(appStore.activeNav, appStore.customerTool)).catch(() => {})
}

export function replaceWithLogin(): void {
  void router.replace('/login').catch(() => {})
}
