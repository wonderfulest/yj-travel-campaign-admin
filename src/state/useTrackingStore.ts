import { defineStore } from 'pinia'
import { pinia } from './pinia.ts'
import type {
  TrackingEvent,
  TrackingFilter,
  TrackingLinkStat,
  TrackingSummary,
  TrackingTimeseriesPoint,
  TrackingUtmStat
} from '../types.ts'
import { trackingApi } from '../api/tracking.ts'
import { appStore } from './useAppStore.ts'
import { boundedPage, emptyPageResult, normalizePageResult } from '../utils/pagination.ts'

export const useTrackingStore = defineStore('tracking', {
  state: () => ({
    trackingSummary: {
      totalClicks: 0,
      clickedCustomers: 0,
      shortLinks: 0,
      clickRate: 0
    } as TrackingSummary,
    trackingTimeseries: [] as TrackingTimeseriesPoint[],
    trackingUtmStats: [] as TrackingUtmStat[],
    trackingLinkStats: [] as TrackingLinkStat[],
    trackingLinkPage: {
      page: 0,
      size: 20,
      totalItems: 0,
      totalPages: 0,
      hasNext: false,
      hasPrevious: false
    },
    trackingEvents: [] as TrackingEvent[],
    trackingEventPage: {
      page: 0,
      size: 20,
      totalItems: 0,
      totalPages: 0,
      hasNext: false,
      hasPrevious: false
    },
    trackingFilter: {
      campaignId: ''
    } as TrackingFilter
  })
})

export const trackingStore = useTrackingStore(pinia)

export async function loadTrackingAnalytics(page = trackingStore.trackingEventPage.page, linkPage = trackingStore.trackingLinkPage.page): Promise<void> {
  try {
    const params = new URLSearchParams()
    if (trackingStore.trackingFilter.campaignId) params.set('campaignId', trackingStore.trackingFilter.campaignId)
    const querySuffix = params.toString() ? `?${params}` : ''
    trackingStore.trackingSummary = await trackingApi.summary(querySuffix)
    trackingStore.trackingTimeseries = await trackingApi.timeseries(querySuffix)
    trackingStore.trackingUtmStats = await trackingApi.byUtm(querySuffix)
    const linkParams = new URLSearchParams(params)
    linkParams.set('page', String(Math.max(0, linkPage)))
    linkParams.set('size', String(trackingStore.trackingLinkPage.size))
    const linkResult = await trackingApi.byLink(linkParams.toString())
    const linkPageResult = normalizePageResult<TrackingLinkStat>(linkResult, [], linkPage, trackingStore.trackingLinkPage.size)
    trackingStore.trackingLinkStats = linkPageResult.items
    trackingStore.trackingLinkPage = linkPageResult
    const eventParams = new URLSearchParams(params)
    eventParams.set('page', String(Math.max(0, page)))
    eventParams.set('size', String(trackingStore.trackingEventPage.size))
    const eventResult = await trackingApi.events(eventParams.toString())
    const pageResult = normalizePageResult<TrackingEvent>(eventResult, [], page, trackingStore.trackingEventPage.size)
    trackingStore.trackingEvents = pageResult.items
    trackingStore.trackingEventPage = pageResult
  } catch (error: unknown) {
    const err = error as { message?: string }
    trackingStore.trackingEvents = []
    trackingStore.trackingTimeseries = []
    trackingStore.trackingUtmStats = []
    trackingStore.trackingLinkStats = []
    trackingStore.trackingLinkPage = emptyPageResult<TrackingLinkStat>(0, trackingStore.trackingLinkPage.size)
    trackingStore.trackingEventPage = emptyPageResult<TrackingEvent>(0, trackingStore.trackingEventPage.size)
    appStore.error = `短链统计加载失败：${err.message}`
  }
}

export function changeTrackingEventPage(nextPage: number): void {
  if (nextPage < 0 || (trackingStore.trackingEventPage.totalPages && nextPage >= trackingStore.trackingEventPage.totalPages)) return
  loadTrackingAnalytics(nextPage)
}

export function jumpTrackingEventPage(pageNumber: number | string): void {
  const nextPage = boundedPage(trackingStore.trackingEventPage, pageNumber)
  if (nextPage === null || nextPage === trackingStore.trackingEventPage.page) return
  loadTrackingAnalytics(nextPage)
}

export function changeTrackingLinkPage(nextPage: number): void {
  if (nextPage < 0 || (trackingStore.trackingLinkPage.totalPages && nextPage >= trackingStore.trackingLinkPage.totalPages)) return
  loadTrackingAnalytics(trackingStore.trackingEventPage.page, nextPage)
}

export function jumpTrackingLinkPage(pageNumber: number | string): void {
  const nextPage = boundedPage(trackingStore.trackingLinkPage, pageNumber)
  if (nextPage === null || nextPage === trackingStore.trackingLinkPage.page) return
  loadTrackingAnalytics(trackingStore.trackingEventPage.page, nextPage)
}
