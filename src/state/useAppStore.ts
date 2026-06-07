import { computed } from 'vue'
import { defineStore } from 'pinia'
import type { AuthForm, AuthMode, User, UserRole } from '../types'
import { authApi } from '../api/auth'
import {
  BarChart3,
  CheckCircle2,
  Database,
  GitMerge,
  Layers,
  Mail,
  PlugZap,
  Send,
  Settings,
  Users
} from 'lucide-vue-next'
import {
  ACTIVE_NAV_STORAGE_KEY,
  ADMIN_NAV_QUERY_KEY,
  CUSTOMER_TOOL_STORAGE_KEY,
  CUSTOMER_TOOLS,
  normalizeCustomerTool,
  resolveNavigationFromLocation
} from '../navigation'

export function initialAdminNav() {
  const queryNav = new URLSearchParams(window.location.search).get(ADMIN_NAV_QUERY_KEY)
  const routeState = resolveNavigationFromLocation(window.location.pathname, queryNav)
  if (routeState.nav !== 'dashboard' || window.location.pathname !== '/') return routeState.nav
  const storedNav = localStorage.getItem(ACTIVE_NAV_STORAGE_KEY)
  return resolveNavigationFromLocation('/', storedNav).nav
}

export const useAppStore = defineStore('app', {
  state: () => ({
    token: localStorage.getItem('travel_admin_token') || '',
    user: JSON.parse(localStorage.getItem('travel_admin_user') || 'null') as User | null,
    authMode: 'login' as AuthMode,
    authForm: {
      tenantName: '',
      displayName: '',
      email: '',
      password: ''
    } as AuthForm,
    activeNav: initialAdminNav(),
    sidebarCollapsed: localStorage.getItem('travel_admin_sidebar_collapsed') === 'true',
    routeHistory: [] as Array<{ fullPath: string; label: string }>,
    loading: false,
    error: '',
    notice: '',
    customerTool: CUSTOMER_TOOLS.has(localStorage.getItem(CUSTOMER_TOOL_STORAGE_KEY))
      ? localStorage.getItem(CUSTOMER_TOOL_STORAGE_KEY) as 'list' | 'import' | 'mapping'
      : 'list'
  }),
  getters: {
    currentRoles(): UserRole[] {
      return currentRoles(this)
    },
    availableNavItems() {
      return navItems.filter((item) => canAccessNav(item.key, this))
    },
    availablePrimaryNavItems() {
      return this.availableNavItems.filter((item) => !item.parentKey && !item.hideFromMenu)
    },
    primaryRole(): UserRole {
      return this.currentRoles[0]
    },
    primaryRoleLabel(): string {
      return ROLE_LABELS[this.primaryRole] || this.primaryRole
    },
    pageMeta() {
      const fallback = this.availableNavItems[0] || navItems[0]
      if (!canAccessNav(this.activeNav, this)) return fallback
      return navItems.find((item) => item.key === this.activeNav) || fallback
    },
    isLoggedIn(): boolean {
      return Boolean(this.token)
    }
  },
  actions: {
    normalizeActiveNavAccess() {
      if (canAccessNav(this.activeNav, this)) {
        if (this.activeNav !== 'customers') {
          this.setCustomerToolState('list')
        } else if (!canAccessNav(this.customerTool, this)) {
          this.setCustomerToolState('list')
        } else {
          this.persistNavigationState()
        }
        return
      }
      this.activateNav('dashboard')
      if (this.activeNav !== 'customers') {
        this.setCustomerToolState('list')
      }
    },
    persistNavigationState() {
      localStorage.setItem(ACTIVE_NAV_STORAGE_KEY, this.activeNav)
      localStorage.setItem(CUSTOMER_TOOL_STORAGE_KEY, this.customerTool)
    },
    activateNav(nav: string) {
      this.activeNav = nav
      this.persistNavigationState()
    },
    setCustomerToolState(tool: string) {
      this.customerTool = normalizeCustomerTool(tool)
      this.persistNavigationState()
    },
    setActiveNav(nav: string, onNavSideEffect?: (nav: string) => void) {
      this.activeNav = nav
      this.persistNavigationState()
      onNavSideEffect?.(nav)
    },
    navChildItems(parentKey: string) {
      return navItems.filter((item) => item.parentKey === parentKey && !item.hideFromMenu && canAccessNav(item.key, this))
    },
    isNavItemActive(item: { key: string }) {
      if (this.activeNav === item.key) return true
      return navItems.some((child) => child.parentKey === item.key && child.key === this.activeNav)
    },
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed
      localStorage.setItem('travel_admin_sidebar_collapsed', String(this.sidebarCollapsed))
    },
    syncNavigationFromRoute(pathname: string, queryNav = '') {
      const { nav, customerTool } = resolveNavigationFromLocation(pathname, queryNav)
      this.activeNav = nav
      this.customerTool = normalizeCustomerTool(customerTool)
      this.persistNavigationState()
    },
    rememberRoute(pathname: string, fullPath: string, queryNav = '') {
      if (!this.isLoggedIn || pathname === '/login') return
      const { nav } = resolveNavigationFromLocation(pathname, queryNav)
      if (!canAccessNav(nav, this)) return
      const navItem = navItems.find((item) => item.key === nav)
      const label = navItem?.title || navItem?.label || nav
      const nextItem = { fullPath, label }
      this.routeHistory = [
        ...this.routeHistory.filter((item) => item.fullPath !== fullPath),
        nextItem
      ].slice(-8)
    },
    persistSession(result: { accessToken: string; email: string; tenantId: string | number; userId: string | number; roles?: UserRole[] }) {
      this.token = result.accessToken
      this.user = {
        email: result.email,
        tenantId: result.tenantId,
        userId: result.userId,
        roles: result.roles || []
      }
      localStorage.setItem('travel_admin_token', this.token)
      localStorage.setItem('travel_admin_user', JSON.stringify(this.user))
      this.normalizeActiveNavAccess()
    },
    async login(onSuccess?: () => Promise<void>) {
      this.loading = true
      this.error = ''
      this.notice = ''
      try {
        if (this.authMode === 'register') {
          await authApi.register({
            tenantName: this.authForm.tenantName,
            displayName: this.authForm.displayName,
            email: this.authForm.email,
            password: this.authForm.password
          })
        }
        const result = await authApi.login({
          email: this.authForm.email,
          password: this.authForm.password
        })
        this.persistSession(result)
        await onSuccess?.()
        this.notice = '已进入租户后台'
      } catch (error: unknown) {
        const err = error as { message?: string }
        this.error = `认证失败：${err.message}`
      } finally {
        this.loading = false
      }
    },
    logout() {
      this.token = ''
      this.user = null
      this.loading = false
      this.error = ''
      this.notice = ''
      this.setCustomerToolState('list')
      this.activeNav = 'dashboard'
      localStorage.removeItem('travel_admin_token')
      localStorage.removeItem('travel_admin_user')
      localStorage.removeItem(ACTIVE_NAV_STORAGE_KEY)
      localStorage.removeItem(CUSTOMER_TOOL_STORAGE_KEY)
    },
    canAccessNav(nav: string) {
      return canAccessNav(nav, this)
    }
  }
})

const appState = () => useAppStore()


export const navItems = [
  {
    key: 'dashboard',
    label: '仪表盘',
    icon: BarChart3,
    title: '租户工作台',
    description: '管理旅行社客户资产、来源导入和邮箱推送通道'
  },
  {
    key: 'customers',
    label: '客户资产',
    icon: Database,
    title: '客户资产',
    description: '查看和检索当前租户的旅行社客户资产'
  },
  {
    key: 'channels',
    label: '推送通道',
    icon: PlugZap,
    title: '推送通道',
    description: '配置 AWS SES 邮件推送通道，供后续邮件触达任务使用'
  },
  {
    key: 'segments',
    label: '客群管理',
    icon: Users,
    title: '客群管理',
    description: '维护基于规则引擎动态筛选的客户群，并刷新客户关联关系'
  },
  {
    key: 'campaign-list',
    label: '活动列表',
    icon: Layers,
    title: '邮件活动列表',
    description: '查看全部邮件活动，并进入指定活动的详情编辑页面'
  },
  {
    key: 'campaigns',
    label: '邮件活动',
    icon: Send,
    parentKey: 'campaign-list',
    hideFromMenu: true,
    title: '邮件活动详情',
    description: '创建活动、编辑模板、选择通道和客群，生成预推送并模拟发送'
  },
  {
    key: 'tracking',
    label: '短链统计',
    icon: BarChart3,
    title: '短链统计',
    description: '查看营销短链点击、UTM 维度和点击明细'
  },
  {
    key: 'settings',
    label: '租户设置',
    icon: Settings,
    title: '租户设置',
    description: '查看当前登录租户与账号信息'
  }
]

export const ROLE_PAGE_ACCESS = {
  TENANT_OWNER: ['dashboard', 'customers', 'channels', 'segments', 'campaign-list', 'campaigns', 'tracking', 'imports', 'mapping', 'settings'],
  TENANT_ADMIN: ['dashboard', 'customers', 'channels', 'segments', 'campaign-list', 'campaigns', 'tracking', 'imports', 'mapping', 'settings'],
  TENANT_USER: ['dashboard', 'customers', 'settings']
}

export const ROLE_LABELS = {
  TENANT_OWNER: '租户所有者',
  TENANT_ADMIN: '租户管理员',
  TENANT_USER: '租户成员'
}

export function currentRoles(store: ReturnType<typeof useAppStore> = appState()): UserRole[] {
  return store.user?.roles?.length ? store.user.roles as UserRole[] : ['TENANT_OWNER']
}

export function canAccessNav(nav: string, store: ReturnType<typeof useAppStore> = appState()): boolean {
  return currentRoles(store).some((role) => ROLE_PAGE_ACCESS[role as keyof typeof ROLE_PAGE_ACCESS]?.includes(nav))
}

export function persistNavigationState(store: ReturnType<typeof useAppStore>) {
  localStorage.setItem(ACTIVE_NAV_STORAGE_KEY, store.activeNav)
  localStorage.setItem(CUSTOMER_TOOL_STORAGE_KEY, store.customerTool)
}

export function activateNav(nav: string, store: ReturnType<typeof useAppStore>): void {
  store.activeNav = nav
  persistNavigationState(store)
}

export function setCustomerToolState(tool: string, store: ReturnType<typeof useAppStore>): void {
  store.customerTool = normalizeCustomerTool(tool)
  persistNavigationState(store)
}

export function normalizeActiveNavAccess(store: ReturnType<typeof useAppStore>) {
  if (canAccessNav(store.activeNav, store)) {
    if (store.activeNav !== 'customers') {
      setCustomerToolState('list', store)
    } else if (!canAccessNav(store.customerTool, store)) {
      setCustomerToolState('list', store)
    } else {
      persistNavigationState(store)
    }
    return
  }
  activateNav('dashboard', store)
  if (store.activeNav !== 'customers') {
    setCustomerToolState('list', store)
  }
}

export function navChildItems(parentKey: string, store: ReturnType<typeof useAppStore>) {
  return navItems.filter((item) => item.parentKey === parentKey && !item.hideFromMenu && canAccessNav(item.key, store))
}

export function isNavItemActive(item: { key: string }, store: ReturnType<typeof useAppStore>): boolean {
  if (store.activeNav === item.key) return true
  return navItems.some((child) => child.parentKey === item.key && child.key === store.activeNav)
}

export function toggleSidebar(store: ReturnType<typeof useAppStore>): void {
  store.sidebarCollapsed = !store.sidebarCollapsed
  localStorage.setItem('travel_admin_sidebar_collapsed', String(store.sidebarCollapsed))
}

export function syncNavigationFromRoute(pathname: string, queryNav = '', store: ReturnType<typeof useAppStore>): void {
  const { nav, customerTool } = resolveNavigationFromLocation(pathname, queryNav)
  store.activeNav = nav
  store.customerTool = normalizeCustomerTool(customerTool)
  persistNavigationState(store)
}

export function persistSession(result: { accessToken: string; email: string; tenantId: string | number; userId: string | number; roles?: UserRole[] }, store: ReturnType<typeof useAppStore>): void {
  store.token = result.accessToken
  store.user = {
    email: result.email,
    tenantId: result.tenantId,
    userId: result.userId,
    roles: result.roles || []
  }
  localStorage.setItem('travel_admin_token', store.token)
  localStorage.setItem('travel_admin_user', JSON.stringify(store.user))
  normalizeActiveNavAccess(store)
}

export async function login(onSuccess?: () => Promise<void>, store: ReturnType<typeof useAppStore> = appState()): Promise<void> {
  store.loading = true
  store.error = ''
  store.notice = ''
  try {
    if (store.authMode === 'register') {
      await authApi.register({
        tenantName: store.authForm.tenantName,
        displayName: store.authForm.displayName,
        email: store.authForm.email,
        password: store.authForm.password
      })
    }
    const result = await authApi.login({
      email: store.authForm.email,
      password: store.authForm.password
    })
    persistSession(result, store)
    await onSuccess?.()
    store.notice = '已进入租户后台'
  } catch (error: unknown) {
    const err = error as { message?: string }
    store.error = `认证失败：${err.message}`
  } finally {
    store.loading = false
  }
}

export function logout(store: ReturnType<typeof useAppStore>): void {
  store.token = ''
  store.user = null
  store.loading = false
  store.error = ''
  store.notice = ''
  setCustomerToolState('list', store)
  store.activeNav = 'dashboard'
  localStorage.removeItem('travel_admin_token')
  localStorage.removeItem('travel_admin_user')
  localStorage.removeItem(ACTIVE_NAV_STORAGE_KEY)
  localStorage.removeItem(CUSTOMER_TOOL_STORAGE_KEY)
}

export function setActiveNav(nav: string, store: ReturnType<typeof useAppStore> = appState(), onNavSideEffect?: (nav: string) => void): void {
  store.activeNav = nav
  persistNavigationState(store)
  onNavSideEffect?.(nav)
}
