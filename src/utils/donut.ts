export const CHART_PALETTE = ['#0f766e', '#2563eb', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#64748b', '#0ea5e9']

export interface DonutItem {
  label: string
  value: number
  color?: string
}

export interface DonutSegment {
  label: string
  value: number
  percent: number
  color: string
  dashArray: string
  dashOffset: number
}

export interface DonutChart {
  radius: number
  circumference: number
  total: number
  segments: DonutSegment[]
}

export function buildDonut(items: DonutItem[]): DonutChart {
  const data = (items || []).filter((item) => Number(item.value) > 0)
  const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0)
  const radius = 52
  const circumference = 2 * Math.PI * radius
  let offset = 0
  const segments = data.map((item, index) => {
    const value = Number(item.value || 0)
    const fraction = total ? value / total : 0
    const length = fraction * circumference
    const segment: DonutSegment = {
      label: item.label,
      value,
      percent: Math.round(fraction * 100),
      color: item.color || CHART_PALETTE[index % CHART_PALETTE.length],
      dashArray: `${length} ${circumference - length}`,
      dashOffset: -offset
    }
    offset += length
    return segment
  })
  return { radius, circumference, total, segments }
}
