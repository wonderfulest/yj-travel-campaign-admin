import { request } from './request'
import type { Segment, SegmentRefreshResult, SegmentRule } from '../types'

export interface SegmentPayload {
  name: string
  description: string
  rules: SegmentRule | null
}

export const segmentsApi = {
  summary(): Promise<unknown> {
    return request('/api/segments/summary')
  },
  list(query: string): Promise<unknown> {
    return request(`/api/segments?${query}`)
  },
  members(segmentId: string | number, query: string): Promise<unknown> {
    return request(`/api/segments/${segmentId}/members?${query}`)
  },
  save(segmentId: string | number | '' | null, payload: SegmentPayload): Promise<Segment> {
    const isUpdate = Boolean(segmentId)
    return request(isUpdate ? `/api/segments/${segmentId}` : '/api/segments', {
      method: isUpdate ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    }) as Promise<Segment>
  },
  remove(segmentId: string | number): Promise<unknown> {
    return request(`/api/segments/${segmentId}`, { method: 'DELETE' })
  },
  refresh(segmentId: string | number): Promise<SegmentRefreshResult> {
    return request(`/api/segments/${segmentId}/refresh`, {
      method: 'POST',
      body: JSON.stringify({})
    }) as Promise<SegmentRefreshResult>
  }
}
