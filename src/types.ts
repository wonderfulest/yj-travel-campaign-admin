import type { Component } from 'vue'

export interface TemplateVariable {
  key: string
  label: string
  sampleValue: string
  required: boolean
}

export interface NavItem {
  key: string
  label: string
  icon: Component
}

export interface NavChildItem {
  key: string
  label: string
}

export interface StatCard {
  label: string
  value: string | number
  icon: Component
  target: string
}

export interface DonutSegment {
  label: string
  color: string
  percent: number
  dashArray: string
  dashOffset: string
}

export interface DonutChart {
  total: number
  radius: number
  segments: DonutSegment[]
}

export interface SummaryStatItem {
  status?: string
  label?: string
  customers: number
}

export interface ReadinessBar {
  segmentId: string | number
  segmentName: string
  totalShare: string
  reachableShare: string
  reachableMemberCount: number
  memberCount: number
}

