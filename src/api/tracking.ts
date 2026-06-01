import { request } from './request'
import type {
  TrackingSummary,
  TrackingTimeseriesPoint,
  TrackingUtmStat
} from '../types'

export const trackingApi = {
  summary(querySuffix = ''): Promise<TrackingSummary> {
    return request(`/api/tracking/analytics/summary${querySuffix}`) as Promise<TrackingSummary>
  },
  timeseries(querySuffix = ''): Promise<TrackingTimeseriesPoint[]> {
    return request(`/api/tracking/analytics/timeseries${querySuffix}`) as Promise<TrackingTimeseriesPoint[]>
  },
  byUtm(querySuffix = ''): Promise<TrackingUtmStat[]> {
    return request(`/api/tracking/analytics/by-utm${querySuffix}`) as Promise<TrackingUtmStat[]>
  },
  byLink(query: string): Promise<unknown> {
    return request(`/api/tracking/analytics/by-link?${query}`)
  },
  events(query: string): Promise<unknown> {
    return request(`/api/tracking/analytics/events?${query}`)
  }
}
