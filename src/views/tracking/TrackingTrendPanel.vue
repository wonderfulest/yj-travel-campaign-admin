<template>
  <article class="ops-panel tracking-trend">
    <div class="panel-title">
      <TrendingUp :size="19" />
      <h3>点击趋势</h3>
    </div>
    <div v-if="timeseries.length" ref="chartRef" class="trend-chart"></div>
    <div v-else class="empty-state compact-empty">暂无点击趋势数据</div>
  </article>
</template>
<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { TrendingUp } from 'lucide-vue-next'
import type { TrackingTimeseriesPoint } from '../../types'

const props = defineProps<{
  timeseries: TrackingTimeseriesPoint[]
}>()

const chartRef = ref<HTMLDivElement>()
let chartInstance: any = null

const chartData = computed(() => {
  return props.timeseries.map(p => ({
    bucket: p.bucket,
    clicks: Number(p.clicks || 0),
    customers: Number(p.customers || 0)
  }))
})

async function initChart() {
  if (!props.timeseries.length) return
  await nextTick()
  if (!chartRef.value) return
  const echarts = await import('echarts')
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
  }
  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any[]) => {
        const p = params[0]
        const data = chartData.value[p.dataIndex]
        return `${data.bucket}<br/>点击: ${data.clicks}<br/>客户: ${data.customers}`
      }
    },
    grid: { left: 10, right: 10, top: 10, bottom: 20, containLabel: true },
    xAxis: {
      type: 'category',
      data: chartData.value.map(d => d.bucket),
      axisLine: { lineStyle: { color: '#999' } },
      axisLabel: { color: '#666', fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f0f0f0' } },
      axisLabel: { color: '#666', fontSize: 11 }
    },
    series: [{
      data: chartData.value.map(d => d.clicks),
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { color: '#3b82f6', width: 2 },
      itemStyle: { color: '#3b82f6' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(59,130,246,0.3)' },
            { offset: 1, color: 'rgba(59,130,246,0.05)' }
          ]
        }
      }
    }]
  }
  chartInstance.setOption(option)
}

function resizeChart() {
  chartInstance?.resize()
}

watch(() => props.timeseries, initChart, { deep: true, flush: 'post' })

onMounted(() => {
  initChart()
  window.addEventListener('resize', resizeChart)
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeChart)
  chartInstance?.dispose()
})
</script>
<style scoped>
.trend-chart {
  width: 100%;
  height: 200px;
}
</style>
