import { computed } from 'vue'
import { defineStore } from 'pinia'
import type {
  Customer,
  Segment,
  SegmentForm,
  SegmentRefreshResult,
  SegmentRule,
  SegmentRuleCondition,
  SegmentSummary
} from '../types.ts'
import { request } from './useAppStore.ts'
import { normalizePageResult, emptyPageResult, pageQuery, boundedPage } from './useCustomerStore.ts'

export const useSegmentStore = defineStore('segment', {
  state: () => ({
    segments: [] as Segment[],
    segmentSummary: null as SegmentSummary | null,
    segmentPage: {
      page: 0,
      size: 20,
      totalItems: 0,
      totalPages: 0,
      hasNext: false,
      hasPrevious: false
    },
    segmentMembers: [] as Customer[],
    segmentMemberPage: {
      page: 0,
      size: 20,
      totalItems: 0,
      totalPages: 0,
      hasNext: false,
      hasPrevious: false
    },
    selectedSegment: null as Segment | null,
    segmentForm: {
      id: '',
      name: '',
      description: '',
      rules: [] as SegmentRuleCondition[]
    } as SegmentForm,
    segmentRefreshResult: null as SegmentRefreshResult | null
  })
})

export const segmentStore = useSegmentStore()

export const segmentReadinessStats = computed(() => segmentStore.segmentSummary || summarizeSegments(segmentStore.segments))

export const segmentReadinessBars = computed(() => {
  const segments = Array.isArray(segmentReadinessStats.value?.topSegments) ? segmentReadinessStats.value.topSegments : []
  const max = segments.reduce((peak, segment) => Math.max(peak, Number(segment.memberCount || 0)), 0)
  return segments.map((segment) => {
    const memberCount = Number(segment.memberCount || 0)
    const reachableMemberCount = Number(segment.reachableMemberCount || 0)
    return {
      segmentId: segment.segmentId,
      segmentName: segment.segmentName,
      memberCount,
      reachableMemberCount,
      totalShare: max ? `${Math.round((memberCount / max) * 100)}%` : '0%',
      reachableShare: memberCount ? `${Math.round((reachableMemberCount / memberCount) * 100)}%` : '0%'
    }
  })
})

export function summarizeSegments(segments: Segment[]): SegmentSummary {
  return {
    segmentCount: segments.length,
    memberCount: 0,
    uniqueCustomerCount: 0,
    reachableMemberCount: 0,
    topSegments: []
  }
}

export async function loadSegmentSummary(): Promise<void> {
  try {
    segmentStore.segmentSummary = await request('/api/segments/summary')
  } catch (error) {
    segmentStore.segmentSummary = null
    const { appStore } = await import('./useAppStore.ts')
    appStore.error = `客群统计加载失败：${error.message}`
  }
}

export async function loadSegments(page = segmentStore.segmentPage.page): Promise<void> {
  try {
    const result = await request(`/api/segments?${pageQuery(segmentStore.segmentPage, page)}`)
    const pageResult = normalizePageResult<Segment>(result, [], page, segmentStore.segmentPage.size)
    segmentStore.segments = pageResult.items
    segmentStore.segmentPage = pageResult
    if (!segmentStore.selectedSegment && pageResult.items.length) {
      fillSegmentForm(pageResult.items[0])
    }
  } catch (error: unknown) {
    const err = error as { message?: string }
    segmentStore.segments = []
    segmentStore.segmentPage = emptyPageResult<Segment>(0, segmentStore.segmentPage.size)
    const { appStore } = await import('./useAppStore.ts')
    appStore.error = `客群加载失败：${err.message}`
  }
}

export async function loadSegmentMembers(segmentId = segmentStore.selectedSegment?.id, page = segmentStore.segmentMemberPage.page): Promise<void> {
  if (!segmentId) return
  try {
    const result = await request(`/api/segments/${segmentId}/members?${pageQuery(segmentStore.segmentMemberPage, page)}`)
    const pageResult = normalizePageResult<Customer>(result, [], page, segmentStore.segmentMemberPage.size)
    segmentStore.segmentMembers = pageResult.items
    segmentStore.segmentMemberPage = pageResult
  } catch (error: unknown) {
    const err = error as { message?: string }
    segmentStore.segmentMembers = []
    segmentStore.segmentMemberPage = emptyPageResult<Customer>(0, segmentStore.segmentMemberPage.size)
    const { appStore } = await import('./useAppStore.ts')
    appStore.error = `客群成员加载失败：${err.message}`
  }
}

export async function saveSegment(): Promise<void> {
  const { appStore } = await import('./useAppStore.ts')
  appStore.loading = true
  appStore.error = ''
  appStore.notice = ''
  try {
    const isUpdate = Boolean(segmentStore.segmentForm.id)
    const result = await request(isUpdate ? `/api/segments/${segmentStore.segmentForm.id}` : '/api/segments', {
      method: isUpdate ? 'PUT' : 'POST',
      body: JSON.stringify(segmentPayload())
    }) as Segment
    appStore.notice = isUpdate ? '客群规则已更新' : '客群已创建'
    await loadSegments()
    fillSegmentForm(result)
  } catch (error: unknown) {
    const err = error as { message?: string }
    appStore.error = `客群保存失败：${err.message}`
  } finally {
    appStore.loading = false
  }
}

export async function refreshSegment(segmentId = segmentStore.selectedSegment?.id): Promise<void> {
  const { appStore } = await import('./useAppStore.ts')
  if (!segmentId) {
    appStore.error = '请先选择客群'
    return
  }
  appStore.loading = true
  appStore.error = ''
  appStore.notice = ''
  try {
    segmentStore.segmentRefreshResult = await request(`/api/segments/${segmentId}/refresh`, { method: 'POST', body: JSON.stringify({}) }) as SegmentRefreshResult
    await loadSegmentMembers(segmentId, 0)
    appStore.notice = `客群已刷新，命中 ${segmentStore.segmentRefreshResult.matchedCount} 个客户`
  } catch (error: unknown) {
    const err = error as { message?: string }
    appStore.error = `客群刷新失败：${err.message}`
  } finally {
    appStore.loading = false
  }
}

export function fillSegmentForm(segment: Segment): void {
  segmentStore.selectedSegment = segment
  let rules: SegmentRuleCondition[] = []
  if (segment.rules?.conditions) {
    rules = segment.rules.conditions.map((c) => ({
      ...c,
      _valueText: Array.isArray(c.values) ? c.values.join(',') : (c.values?.[0] ?? ''),
      _countryValues: c.field === 'country' && Array.isArray(c.values) ? [...c.values] : []
    }))
  }
  segmentStore.segmentForm = {
    id: segment.id,
    name: segment.name || '',
    description: segment.description || '',
    rules
  }
  loadSegmentMembers(String(segment.id))
}

export function resetSegmentForm(): void {
  segmentStore.selectedSegment = null
  segmentStore.segmentMembers = []
  segmentStore.segmentMemberPage = emptyPageResult<Customer>(0, segmentStore.segmentMemberPage.size)
  segmentStore.segmentForm = {
    id: '',
    name: '',
    description: '',
    rules: []
  }
}

export function segmentPayload(): { name: string; description: string; rules: SegmentRule | null } {
  return {
    name: segmentStore.segmentForm.name,
    description: segmentStore.segmentForm.description,
    rules: buildRules(segmentStore.segmentForm.rules)
  }
}

export const RULE_FIELDS = [
  { value: 'country', label: '国家 (country)' },
  { value: 'city', label: '城市 (city)' },
  { value: 'email_quality', label: '邮箱质量 (email_quality)' },
  { value: 'contact_status', label: '客户状态 (contact_status)' },
  { value: 'source_primary', label: '数据来源 (source_primary)' },
  { value: 'asset_type', label: '资产类型 (asset_type)' },
  { value: 'name', label: '名称 (name)' },
  { value: 'postcode', label: '邮编 (postcode)' },
  { value: 'email', label: '邮箱 (email)' },
  { value: 'phone', label: '电话 (phone)' },
  { value: 'website', label: '网站 (website)' },
]

export const RULE_OPS = [
  { value: 'IN', label: '包含于 (IN)', multi: true },
  { value: 'NOT_IN', label: '不包含于 (NOT_IN)', multi: true },
  { value: 'EQ', label: '等于 (EQ)', multi: false },
  { value: 'NEQ', label: '不等于 (NEQ)', multi: false },
  { value: 'CONTAINS', label: '包含字符串 (CONTAINS)', multi: false },
  { value: 'NOT_CONTAINS', label: '不含字符串 (NOT_CONTAINS)', multi: false },
  { value: 'IS_EMPTY', label: '为空 (IS_EMPTY)', multi: false },
  { value: 'IS_NOT_EMPTY', label: '不为空 (IS_NOT_EMPTY)', multi: false },
]

export function ruleOpIsMulti(op: string): boolean {
  return RULE_OPS.find(o => o.value === op)?.multi ?? false
}

export function ruleOpHasValue(op: string): boolean {
  return op !== 'IS_EMPTY' && op !== 'IS_NOT_EMPTY'
}

export function addRule(): void {
  segmentStore.segmentForm.rules.push({ field: 'country', op: 'IN', values: [], _valueText: '', _countryValues: [] })
}

export function removeRule(index: number): void {
  segmentStore.segmentForm.rules.splice(index, 1)
}

export function buildRules(rules: SegmentRuleCondition[]): SegmentRule | null {
  if (!rules || rules.length === 0) return null
  const conditions = rules.map(r => {
    const isMulti = ruleOpIsMulti(r.op)
    const hasVal = ruleOpHasValue(r.op)
    let values: string[]
    if (!hasVal) {
      values = []
    } else if (r.field === 'country' && Array.isArray(r._countryValues)) {
      values = isMulti ? [...r._countryValues] : [r._countryValues[0]].filter(Boolean)
    } else if (isMulti) {
      values = (r._valueText || '').split(',').map(v => v.trim()).filter(Boolean)
    } else {
      values = [(r._valueText || '')].filter(Boolean)
    }
    return { field: r.field, op: r.op, values }
  })
  return { logic: 'AND', conditions }
}

export function changeSegmentPage(nextPage: number): void {
  if (nextPage < 0 || (segmentStore.segmentPage.totalPages && nextPage >= segmentStore.segmentPage.totalPages)) return
  loadSegments(nextPage)
}

export function jumpSegmentPage(pageNumber: number | string): void {
  const nextPage = boundedPage(segmentStore.segmentPage, pageNumber)
  if (nextPage === null || nextPage === segmentStore.segmentPage.page) return
  loadSegments(nextPage)
}

export function changeSegmentPageSize(size: number | string): void {
  const nextSize = Number(size)
  if (!nextSize) return
  segmentStore.segmentPage.size = nextSize
  loadSegments(0)
}

export function changeSegmentMemberPage(nextPage: number): void {
  if (nextPage < 0 || (segmentStore.segmentMemberPage.totalPages && nextPage >= segmentStore.segmentMemberPage.totalPages)) return
  loadSegmentMembers(segmentStore.selectedSegment?.id, nextPage)
}

export function changeSegmentMemberPageSize(size: number | string): void {
  const nextSize = Number(size)
  if (!nextSize) return
  segmentStore.segmentMemberPage.size = nextSize
  loadSegmentMembers(segmentStore.selectedSegment?.id, 0)
}

export function jumpSegmentMemberPage(pageNumber: number | string): void {
  const nextPage = boundedPage(segmentStore.segmentMemberPage, pageNumber)
  if (nextPage === null || nextPage === segmentStore.segmentMemberPage.page) return
  loadSegmentMembers(segmentStore.selectedSegment?.id, nextPage)
}
