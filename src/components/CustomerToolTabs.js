import { Database, FileUp, GitMerge } from 'lucide-vue-next'

export const CustomerToolTabs = {
  components: {
    Database,
    FileUp,
    GitMerge
  },
  props: {
    state: {
      type: Object,
      required: true
    },
    canAccessNav: {
      type: Function,
      required: true
    }
  },
  emits: ['set-customer-tool', 'toggle-help'],
  template: `
    <section class="customer-tools">
      <button type="button" :class="{active: state.customerTool === 'list'}" @click="$emit('set-customer-tool', 'list')">
        <Database :size="17" />
        客户资产库
      </button>
      <button v-if="canAccessNav('imports')" type="button" :class="{active: state.customerTool === 'imports'}" @click="$emit('set-customer-tool', 'imports')">
        <FileUp :size="17" />
        OSM 导入
      </button>
      <button v-if="canAccessNav('mapping')" type="button" :class="{active: state.customerTool === 'mapping'}" @click="$emit('set-customer-tool', 'mapping')">
        <GitMerge :size="17" />
        资产 Mapping
      </button>
      <button type="button" class="help-link" @click="$emit('toggle-help')">
        用户提示
      </button>
    </section>
  `
}
