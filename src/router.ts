import { createRouter, createWebHistory } from 'vue-router'
import { navToPath, resolveNavigationFromLocation } from './navigation'

const RoutePlaceholder = {
  name: 'RoutePlaceholder',
  render() {
    return null
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/login', name: 'login', component: RoutePlaceholder },
    { path: '/dashboard', name: 'dashboard', component: RoutePlaceholder },
    { path: '/customers', name: 'customers', component: RoutePlaceholder },
    { path: '/customers/list', redirect: '/customers' },
    { path: '/customers/imports', name: 'customer-imports', component: RoutePlaceholder },
    { path: '/customers/mapping', name: 'customer-mapping', component: RoutePlaceholder },
    { path: '/channels', name: 'channels', component: RoutePlaceholder },
    { path: '/segments', name: 'segments', component: RoutePlaceholder },
    { path: '/campaign-list', name: 'campaign-list', component: RoutePlaceholder },
    { path: '/campaigns', name: 'campaigns', component: RoutePlaceholder },
    { path: '/tracking', name: 'tracking', component: RoutePlaceholder },
    { path: '/settings', name: 'settings', component: RoutePlaceholder },
    { path: '/:pathMatch(.*)*', redirect: '/dashboard' }
  ]
})

function hasStoredSession() {
  return Boolean(localStorage.getItem('travel_admin_token'))
}

router.beforeEach((to) => {
  const queryNav = typeof to.query.nav === 'string' ? to.query.nav : ''
  if (queryNav) {
    const { nav, customerTool } = resolveNavigationFromLocation('/' + queryNav, queryNav)
    return navToPath(nav, customerTool)
  }

  if (!hasStoredSession() && to.path !== '/login') {
    return '/login'
  }

  if (to.path === '/' && hasStoredSession()) {
    return '/dashboard'
  }

  return true
})

export default router
