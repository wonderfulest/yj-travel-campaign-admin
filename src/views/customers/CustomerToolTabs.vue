<template>

    <section class="customer-tools">
      <button type="button" :class="{active: state.customerTool === 'list'}" @click="setCustomerTool('list')">
        <Database :size="17" />
        客户资产库
      </button>
      <button v-if="canAccessNav('imports')" type="button" :class="{active: state.customerTool === 'imports'}" @click="setCustomerTool('imports')">
        <FileUp :size="17" />
        客户导入
      </button>
      <button v-if="canAccessNav('mapping')" type="button" :class="{active: state.customerTool === 'mapping'}" @click="setCustomerTool('mapping')">
        <GitMerge :size="17" />
        资产 Mapping
      </button>
      <button type="button" class="help-link" @click="state.customerHelpVisible = !state.customerHelpVisible">
        用户提示
      </button>
    </section>
</template>
<script setup lang="ts">
import { Database, FileUp, GitMerge } from 'lucide-vue-next'
import * as admin from '../../state/index'

const {
  state,
  canAccessNav,
  setCustomerTool
} = admin

</script>
