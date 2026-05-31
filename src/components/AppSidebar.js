import { Mail, PanelLeftClose, PanelLeftOpen } from 'lucide-vue-next'

export const AppSidebar = {
  components: {
    Mail,
    PanelLeftClose,
    PanelLeftOpen
  },
  props: {
    state: {
      type: Object,
      required: true
    },
    availablePrimaryNavItems: {
      type: Array,
      required: true
    },
    navChildItems: {
      type: Function,
      required: true
    },
    isNavItemActive: {
      type: Function,
      required: true
    }
  },
  emits: ['set-active-nav', 'toggle-sidebar'],
  template: `
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="brand-lockup compact">
          <div class="brand-mark"><Mail :size="20" /></div>
          <div>
            <h1>有解获客</h1>
            <p>yj-lead-admin</p>
          </div>
        </div>
        <button
          class="sidebar-toggle"
          type="button"
          :aria-label="state.sidebarCollapsed ? '展开菜单栏' : '收起菜单栏'"
          :title="state.sidebarCollapsed ? '展开菜单栏' : '收起菜单栏'"
          @click="$emit('toggle-sidebar')"
        >
          <PanelLeftOpen v-if="state.sidebarCollapsed" :size="18" />
          <PanelLeftClose v-else :size="18" />
        </button>
      </div>
      <nav>
        <div v-for="item in availablePrimaryNavItems" :key="item.key" class="nav-group">
          <button
            :class="{active: state.activeNav === item.key, 'child-active': isNavItemActive(item) && state.activeNav !== item.key}"
            :title="state.sidebarCollapsed ? item.label : ''"
            @click="$emit('set-active-nav', item.key)"
          >
            <component :is="item.icon" :size="18" />{{ item.label }}
          </button>
          <div v-if="navChildItems(item.key).length" class="sub-nav">
            <button
              v-for="child in navChildItems(item.key)"
              :key="child.key"
              class="sub-nav-button"
              :class="{active: state.activeNav === child.key}"
              :title="state.sidebarCollapsed ? child.label : ''"
              @click="$emit('set-active-nav', child.key)"
            >
              <component :is="child.icon" :size="16" />{{ child.label }}
            </button>
          </div>
        </div>
      </nav>
    </aside>
  `
}
