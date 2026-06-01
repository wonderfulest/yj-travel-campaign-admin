import { computed } from 'vue'
import { defineStore } from 'pinia'
import type {
  CustomerSegmentMember,
  Segment,
  SegmentForm,
  SegmentRefreshResult,
  SegmentRule,
  SegmentRuleCondition,
  SegmentSummary
} from '../types'
import { segmentsApi } from '../api/segments'
import { useAppStore } from './useAppStore'
import { boundedPage, emptyPageResult, normalizePageResult, pageQuery } from '../utils/pagination'

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
    segmentMembers: [] as CustomerSegmentMember[],
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

const segmentState = () => useSegmentStore()
const appState = () => useAppStore()

export const segmentReadinessStats = computed(() => segmentState().segmentSummary || summarizeSegments(segmentState().segments))

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
    segmentState().segmentSummary = await segmentsApi.summary() as SegmentSummary
  } catch (error) {
    segmentState().segmentSummary = null
    appState().error = `客群统计加载失败：${error.message}`
  }
}

export async function loadSegments(page = segmentState().segmentPage.page): Promise<void> {
  try {
    const result = await segmentsApi.list(pageQuery(segmentState().segmentPage, page))
    const pageResult = normalizePageResult<Segment>(result, [], page, segmentState().segmentPage.size)
    segmentState().segments = pageResult.items
    segmentState().segmentPage = pageResult
    if (!segmentState().selectedSegment && pageResult.items.length) {
      fillSegmentForm(pageResult.items[0])
    }
  } catch (error: unknown) {
    const err = error as { message?: string }
    segmentState().segments = []
    segmentState().segmentPage = emptyPageResult<Segment>(0, segmentState().segmentPage.size)
    appState().error = `客群加载失败：${err.message}`
  }
}

export async function loadSegmentMembers(segmentId = segmentState().selectedSegment?.id, page = segmentState().segmentMemberPage.page): Promise<void> {
  if (!segmentId) return
  try {
    const result = await segmentsApi.members(segmentId, pageQuery(segmentState().segmentMemberPage, page))
    const pageResult = normalizePageResult<CustomerSegmentMember>(result, [], page, segmentState().segmentMemberPage.size)
    segmentState().segmentMembers = pageResult.items
    segmentState().segmentMemberPage = pageResult
  } catch (error: unknown) {
    const err = error as { message?: string }
    segmentState().segmentMembers = []
    segmentState().segmentMemberPage = emptyPageResult<CustomerSegmentMember>(0, segmentState().segmentMemberPage.size)
    appState().error = `客群成员加载失败：${err.message}`
  }
}

export async function saveSegment(): Promise<void> {
  appState().loading = true
  appState().error = ''
  appState().notice = ''
  try {
    const isUpdate = Boolean(segmentState().segmentForm.id)
    const result = await segmentsApi.save(segmentState().segmentForm.id, segmentPayload())
    appState().notice = isUpdate ? '客群规则已更新' : '客群已创建'
    await loadSegments()
    fillSegmentForm(result)
  } catch (error: unknown) {
    const err = error as { message?: string }
    appState().error = `客群保存失败：${err.message}`
  } finally {
    appState().loading = false
  }
}

export async function deleteSegment(segmentId = segmentState().selectedSegment?.id): Promise<void> {
  if (!segmentId) {
    appState().error = '请先选择客群'
    return
  }
  appState().loading = true
  appState().error = ''
  appState().notice = ''
  try {
    await segmentsApi.remove(segmentId)
    appState().notice = '客群已删除'
    const nextPage = segmentState().segmentPage.page
    segmentState().selectedSegment = null
    segmentState().segmentMembers = []
    segmentState().segmentMemberPage = emptyPageResult<CustomerSegmentMember>(0, segmentState().segmentMemberPage.size)
    segmentState().segmentRefreshResult = null
    await loadSegments(nextPage)
    if (segmentState().segmentPage.totalPages > 0 && segmentState().segmentPage.page >= segmentState().segmentPage.totalPages) {
      await loadSegments(segmentState().segmentPage.totalPages - 1)
    }
  } catch (error: unknown) {
    const err = error as { message?: string }
    appState().error = `客群删除失败：${err.message}`
  } finally {
    appState().loading = false
  }
}

export async function refreshSegment(segmentId = segmentState().selectedSegment?.id): Promise<void> {
  if (!segmentId) {
    appState().error = '请先选择客群'
    return
  }
  appState().loading = true
  appState().error = ''
  appState().notice = ''
  try {
    segmentState().segmentRefreshResult = await segmentsApi.refresh(segmentId)
    await loadSegmentMembers(segmentId, 0)
    appState().notice = `客群已刷新，命中 ${segmentState().segmentRefreshResult.matchedCount} 个客户`
  } catch (error: unknown) {
    const err = error as { message?: string }
    appState().error = `客群刷新失败：${err.message}`
  } finally {
    appState().loading = false
  }
}

export function fillSegmentForm(segment: Segment): void {
  segmentState().selectedSegment = segment
  let rules: SegmentRuleCondition[] = []
  if (segment.rules?.conditions) {
    rules = segment.rules.conditions.map((c) => ({
      ...c,
      _valueText: Array.isArray(c.values) ? c.values.join(',') : (c.values?.[0] ?? ''),
      _countryValues: c.field === 'country' && Array.isArray(c.values) ? [...c.values] : []
    }))
  }
  segmentState().segmentForm = {
    id: segment.id,
    name: segment.name || '',
    description: segment.description || '',
    rules
  }
  loadSegmentMembers(String(segment.id))
}

export function resetSegmentForm(): void {
  segmentState().selectedSegment = null
  segmentState().segmentMembers = []
  segmentState().segmentMemberPage = emptyPageResult<CustomerSegmentMember>(0, segmentState().segmentMemberPage.size)
  segmentState().segmentForm = {
    id: '',
    name: '',
    description: '',
    rules: []
  }
}

export function segmentPayload(): { name: string; description: string; rules: SegmentRule | null } {
  return {
    name: segmentState().segmentForm.name,
    description: segmentState().segmentForm.description,
    rules: buildRules(segmentState().segmentForm.rules)
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
  segmentState().segmentForm.rules.push({ field: 'country', op: 'IN', values: [], _valueText: '', _countryValues: [] })
}

export function removeRule(index: number): void {
  segmentState().segmentForm.rules.splice(index, 1)
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
  if (nextPage < 0 || (segmentState().segmentPage.totalPages && nextPage >= segmentState().segmentPage.totalPages)) return
  loadSegments(nextPage)
}

export function jumpSegmentPage(pageNumber: number | string): void {
  const nextPage = boundedPage(segmentState().segmentPage, pageNumber)
  if (nextPage === null || nextPage === segmentState().segmentPage.page) return
  loadSegments(nextPage)
}

export function changeSegmentPageSize(size: number | string): void {
  const nextSize = Number(size)
  if (!nextSize) return
  segmentState().segmentPage.size = nextSize
  loadSegments(0)
}

export function changeSegmentMemberPage(nextPage: number): void {
  if (nextPage < 0 || (segmentState().segmentMemberPage.totalPages && nextPage >= segmentState().segmentMemberPage.totalPages)) return
  loadSegmentMembers(segmentState().selectedSegment?.id, nextPage)
}

export function changeSegmentMemberPageSize(size: number | string): void {
  const nextSize = Number(size)
  if (!nextSize) return
  segmentState().segmentMemberPage.size = nextSize
  loadSegmentMembers(segmentState().selectedSegment?.id, 0)
}

export function jumpSegmentMemberPage(pageNumber: number | string): void {
  const nextPage = boundedPage(segmentState().segmentMemberPage, pageNumber)
  if (nextPage === null || nextPage === segmentState().segmentMemberPage.page) return
  loadSegmentMembers(segmentState().selectedSegment?.id, nextPage)
}
