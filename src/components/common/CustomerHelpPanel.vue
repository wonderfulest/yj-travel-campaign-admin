<template>

<section v-if="canAccessNav('customers') && state.activeNav === 'customers' && state.customerHelpVisible" class="customer-help">
          <div>
            <strong>维护顺序</strong>
            <span>先用客户 JSON 导入把公开来源保存为来源数据，再通过合并规则补全客户资产库；OSM 入口仍保留给地图来源导入。</span>
          </div>
          <div>
            <strong>入库保护</strong>
            <span>新导入数据不会直接成为正式客户资产，避免重复、错误或低质量数据进入主表。</span>
          </div>
        </section>
</template>
<script setup lang="ts">
import * as admin from '../../state/index'

const { state, canAccessNav } = admin
</script>
