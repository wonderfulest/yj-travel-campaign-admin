import { createRouter, createWebHistory } from 'vue-router'
import { navToPath, resolveNavigationFromLocation } from './navigation'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/login', name: 'login', component: () => import('./views/auth/AuthView.vue') },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('./views/dashboard/DashboardView.vue')
    },
    {
      path: '/customers',
      component: () => import('./views/customers/CustomersLayout.vue'),
      children: [
        { path: '', name: 'customers', component: () => import('./views/customers/CustomerAssetsView.vue') },
        { path: 'list', redirect: '' },
        { path: 'imports', name: 'customer-imports', component: () => import('./views/customers/CustomerImportView.vue') },
        { path: 'mapping', name: 'customer-mapping', component: () => import('./views/customers/CustomerMappingView.vue') }
      ]
    },
    {
      path: '/channels',
      name: 'channels',
      component: () => import('./views/channels/ChannelsView.vue')
    },
    {
      path: '/segments',
      name: 'segments',
      component: () => import('./views/segments/SegmentsView.vue')
    },
    {
      path: '/campaign-list',
      name: 'campaign-list',
      component: () => import('./views/campaigns/CampaignListView.vue')
    },
    {
      path: '/campaigns',
      name: 'campaigns',
      component: () => import('./views/campaigns/CampaignWorkbenchView.vue')
    },
    {
      path: '/tracking',
      name: 'tracking',
      component: () => import('./views/tracking/TrackingView.vue')
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('./views/settings/SettingsView.vue')
    },
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
