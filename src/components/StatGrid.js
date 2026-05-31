export const StatGrid = {
  props: {
    stats: {
      type: Array,
      required: true
    },
    canAccessNav: {
      type: Function,
      required: true
    }
  },
  emits: ['open-stat-target'],
  template: `
    <section class="stats-grid">
      <button
        v-for="item in stats"
        :key="item.label"
        class="stat-card"
        type="button"
        :disabled="!canAccessNav(item.target)"
        @click="$emit('open-stat-target', item)"
      >
        <component :is="item.icon" :size="20" />
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </button>
    </section>
  `
}
