import router from './router'
import { navToPath } from './navigation'
import { activateNav, useAppStore } from './state/useAppStore'

export function navigateToNav(nav: string, query: Record<string, string | number | undefined> = {}): void {
  const appStore = useAppStore()
  activateNav(nav, appStore)
  const cleanQuery = Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== '')
  )
  if (Object.keys(cleanQuery).length) {
    void router.push({ path: navToPath(nav, appStore.customerTool), query: cleanQuery }).catch(() => {})
    return
  }
  void router.push(navToPath(nav, appStore.customerTool)).catch(() => {})
}

export function replaceWithActiveNav(): void {
  const appStore = useAppStore()
  void router.replace(navToPath(appStore.activeNav, appStore.customerTool)).catch(() => {})
}

export function replaceWithLogin(): void {
  void router.replace('/login').catch(() => {})
}
