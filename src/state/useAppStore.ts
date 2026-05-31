import { computed } from 'vue'
import { defineStore } from 'pinia'
import type { AuthForm, AuthMode, User, UserRole } from '../types.ts'
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
import { createApiRequest } from '../api/client.ts'
import router from '../router'
import {
  ACTIVE_NAV_STORAGE_KEY,
  ADMIN_NAV_QUERY_KEY,
  CUSTOMER_TOOL_STORAGE_KEY,
  CUSTOMER_TOOLS,
  navToPath,
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
      tenantName: 'Youjie Tech',
      displayName: 'Owner',
      email: 'owner@example.com',
      password: 'secret123'
    } as AuthForm,
    activeNav: initialAdminNav(),
    sidebarCollapsed: localStorage.getItem('travel_admin_sidebar_collapsed') === 'true',
    loading: false,
    error: '',
    notice: '',
    customerTool: CUSTOMER_TOOLS.has(localStorage.getItem(CUSTOMER_TOOL_STORAGE_KEY))
      ? localStorage.getItem(CUSTOMER_TOOL_STORAGE_KEY) as 'list' | 'import' | 'mapping'
      : 'list'
  })
})

export const appStore = useAppStore()
export const request = createApiRequest(() => appStore.token)

export const isLoggedIn = computed(() => Boolean(appStore.token))

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

export function currentRoles(): UserRole[] {
  return appStore.user?.roles?.length ? appStore.user.roles as UserRole[] : ['TENANT_OWNER']
}

export function canAccessNav(nav: string): boolean {
  return currentRoles().some((role) => ROLE_PAGE_ACCESS[role as keyof typeof ROLE_PAGE_ACCESS]?.includes(nav))
}

export const availableNavItems = computed(() => navItems.filter((item) => canAccessNav(item.key)))
export const availablePrimaryNavItems = computed(() => availableNavItems.value.filter((item) => !item.parentKey))
export const primaryRole = computed(() => currentRoles()[0])
export const primaryRoleLabel = computed(() => ROLE_LABELS[primaryRole.value] || primaryRole.value)
export const pageMeta = computed(() => {
  const fallback = availableNavItems.value[0] || navItems[0]
  if (!canAccessNav(appStore.activeNav)) return fallback
  return navItems.find((item) => item.key === appStore.activeNav) || fallback
})

export function persistNavigationState() {
  localStorage.setItem(ACTIVE_NAV_STORAGE_KEY, appStore.activeNav)
  localStorage.setItem(CUSTOMER_TOOL_STORAGE_KEY, appStore.customerTool)
}

export function activateNav(nav: string): void {
  appStore.activeNav = nav
  persistNavigationState()
  void router.push(navToPath(nav, appStore.customerTool)).catch(() => {})
}

export function setCustomerToolState(tool: string): void {
  appStore.customerTool = normalizeCustomerTool(tool)
  persistNavigationState()
}

export function normalizeActiveNavAccess() {
  if (canAccessNav(appStore.activeNav)) {
    if (appStore.activeNav !== 'customers') {
      setCustomerToolState('list')
    } else if (!canAccessNav(appStore.customerTool)) {
      setCustomerToolState('list')
    } else {
      persistNavigationState()
    }
    return
  }
  activateNav(availableNavItems.value[0]?.key || 'dashboard')
  if (appStore.activeNav !== 'customers') {
    setCustomerToolState('list')
  }
}

export function setActiveNav(nav: string, onNavSideEffect?: (nav: string) => void): void {
  if (!canAccessNav(nav)) {
    appStore.error = '当前角色没有访问该页面的权限'
    activateNav(availableNavItems.value[0]?.key || 'dashboard')
    return
  }
  appStore.error = ''
  activateNav(nav)
  if (nav !== 'customers') {
    setCustomerToolState('list')
  }
  onNavSideEffect?.(nav)
}

export function navChildItems(parentKey: string) {
  return availableNavItems.value.filter((item) => item.parentKey === parentKey)
}

export function isNavItemActive(item: { key: string }): boolean {
  if (appStore.activeNav === item.key) return true
  return navChildItems(item.key).some((child) => child.key === appStore.activeNav)
}

export function toggleSidebar(): void {
  appStore.sidebarCollapsed = !appStore.sidebarCollapsed
  localStorage.setItem('travel_admin_sidebar_collapsed', String(appStore.sidebarCollapsed))
}

export function syncNavigationFromRoute(pathname: string, queryNav = ''): void {
  const { nav, customerTool } = resolveNavigationFromLocation(pathname, queryNav)
  appStore.activeNav = nav
  appStore.customerTool = normalizeCustomerTool(customerTool)
}

export function persistSession(result: { accessToken: string; email: string; tenantId: string | number; userId: string | number; roles?: UserRole[] }): void {
  appStore.token = result.accessToken
  appStore.user = {
    email: result.email,
    tenantId: result.tenantId,
    userId: result.userId,
    roles: result.roles || []
  }
  localStorage.setItem('travel_admin_token', appStore.token)
  localStorage.setItem('travel_admin_user', JSON.stringify(appStore.user))
  normalizeActiveNavAccess()
}

export async function login(onSuccess?: () => Promise<void>): Promise<void> {
  appStore.loading = true
  appStore.error = ''
  appStore.notice = ''
  try {
    if (appStore.authMode === 'register') {
      await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          tenantName: appStore.authForm.tenantName,
          displayName: appStore.authForm.displayName,
          email: appStore.authForm.email,
          password: appStore.authForm.password
        })
      })
    }
    const result = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: appStore.authForm.email,
        password: appStore.authForm.password
      })
    }) as { accessToken: string; email: string; tenantId: string | number; userId: string | number; roles?: UserRole[] }
    persistSession(result)
    await onSuccess?.()
    appStore.notice = '已进入租户后台'
    void router.replace(navToPath(appStore.activeNav, appStore.customerTool)).catch(() => {})
  } catch (error: unknown) {
    const err = error as { message?: string }
    appStore.error = `认证失败：${err.message}`
  } finally {
    appStore.loading = false
  }
}

export function logout(): void {
  appStore.token = ''
  appStore.user = null
  setCustomerToolState('list')
  appStore.activeNav = 'dashboard'
  localStorage.removeItem('travel_admin_token')
  localStorage.removeItem('travel_admin_user')
  localStorage.removeItem(ACTIVE_NAV_STORAGE_KEY)
  localStorage.removeItem(CUSTOMER_TOOL_STORAGE_KEY)
  void router.replace('/login').catch(() => {})
}
