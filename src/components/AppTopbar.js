import { LogOut, ShieldCheck } from 'lucide-vue-next'

export const AppTopbar = {
  components: {
    LogOut,
    ShieldCheck
  },
  props: {
    state: {
      type: Object,
      required: true
    },
    pageMeta: {
      type: Object,
      required: true
    },
    primaryRoleLabel: {
      type: String,
      required: true
    }
  },
  emits: ['logout'],
  template: `
    <header class="topbar">
      <div>
        <h2>{{ pageMeta.title }}</h2>
        <p>{{ pageMeta.description }}</p>
      </div>
      <div class="tenant-chip">
        <ShieldCheck :size="17" />
        <span>{{ primaryRoleLabel }}</span>
        <strong>{{ state.user?.email }}</strong>
        <button class="icon-button" @click="$emit('logout')" title="退出登录"><LogOut :size="17" /></button>
      </div>
    </header>
  `
}
