<template>

    <section class="customer-tools">
      <button type="button" :class="{active: customerTool === 'list'}" @click="setCustomerTool('list')">
        <Database :size="17" />
        客户资产库
      </button>
      <button v-if="canAccessNav('imports', appStore)" type="button" :class="{active: customerTool === 'imports'}" @click="setCustomerTool('imports')">
        <FileUp :size="17" />
        客户导入
      </button>
      <button v-if="canAccessNav('mapping', appStore)" type="button" :class="{active: customerTool === 'mapping'}" @click="setCustomerTool('mapping')">
        <GitMerge :size="17" />
        资产 Mapping
      </button>
      <button type="button" class="help-link" @click="customerHelpVisible = !customerHelpVisible">
        用户提示
      </button>
    </section>
</template>
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { Database, FileUp, GitMerge } from 'lucide-vue-next'
import { canAccessNav, useAppStore } from '../../state/useAppStore'
import { useCustomerStore } from '../../state/useCustomerStore'
import { setCustomerTool } from '../../state/useUiStore'

const appStore = useAppStore()
const customerStore = useCustomerStore()
const { customerTool } = storeToRefs(appStore)
const { customerHelpVisible } = storeToRefs(customerStore)

</script>
