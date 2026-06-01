import { defineStore } from 'pinia'
import type {
  TrackingEvent,
  TrackingFilter,
  TrackingLinkStat,
  TrackingSummary,
  TrackingTimeseriesPoint,
  TrackingUtmStat
} from '../types'
import { trackingApi } from '../api/tracking'
import { useAppStore } from './useAppStore'
import { boundedPage, emptyPageResult, normalizePageResult } from '../utils/pagination'

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

const trackingState = () => useTrackingStore()
const appState = () => useAppStore()

export async function loadTrackingAnalytics(page = trackingState().trackingEventPage.page, linkPage = trackingState().trackingLinkPage.page): Promise<void> {
  try {
    const params = new URLSearchParams()
    if (trackingState().trackingFilter.campaignId) params.set('campaignId', trackingState().trackingFilter.campaignId)
    const querySuffix = params.toString() ? `?${params}` : ''
    trackingState().trackingSummary = await trackingApi.summary(querySuffix)
    trackingState().trackingTimeseries = await trackingApi.timeseries(querySuffix)
    trackingState().trackingUtmStats = await trackingApi.byUtm(querySuffix)
    const linkParams = new URLSearchParams(params)
    linkParams.set('page', String(Math.max(0, linkPage)))
    linkParams.set('size', String(trackingState().trackingLinkPage.size))
    const linkResult = await trackingApi.byLink(linkParams.toString())
    const linkPageResult = normalizePageResult<TrackingLinkStat>(linkResult, [], linkPage, trackingState().trackingLinkPage.size)
    trackingState().trackingLinkStats = linkPageResult.items
    trackingState().trackingLinkPage = linkPageResult
    const eventParams = new URLSearchParams(params)
    eventParams.set('page', String(Math.max(0, page)))
    eventParams.set('size', String(trackingState().trackingEventPage.size))
    const eventResult = await trackingApi.events(eventParams.toString())
    const pageResult = normalizePageResult<TrackingEvent>(eventResult, [], page, trackingState().trackingEventPage.size)
    trackingState().trackingEvents = pageResult.items
    trackingState().trackingEventPage = pageResult
  } catch (error: unknown) {
    const err = error as { message?: string }
    trackingState().trackingEvents = []
    trackingState().trackingTimeseries = []
    trackingState().trackingUtmStats = []
    trackingState().trackingLinkStats = []
    trackingState().trackingLinkPage = emptyPageResult<TrackingLinkStat>(0, trackingState().trackingLinkPage.size)
    trackingState().trackingEventPage = emptyPageResult<TrackingEvent>(0, trackingState().trackingEventPage.size)
    appState().error = `短链统计加载失败：${err.message}`
  }
}

export function changeTrackingEventPage(nextPage: number): void {
  if (nextPage < 0 || (trackingState().trackingEventPage.totalPages && nextPage >= trackingState().trackingEventPage.totalPages)) return
  loadTrackingAnalytics(nextPage)
}

export function jumpTrackingEventPage(pageNumber: number | string): void {
  const nextPage = boundedPage(trackingState().trackingEventPage, pageNumber)
  if (nextPage === null || nextPage === trackingState().trackingEventPage.page) return
  loadTrackingAnalytics(nextPage)
}

export function changeTrackingLinkPage(nextPage: number): void {
  if (nextPage < 0 || (trackingState().trackingLinkPage.totalPages && nextPage >= trackingState().trackingLinkPage.totalPages)) return
  loadTrackingAnalytics(trackingState().trackingEventPage.page, nextPage)
}

export function jumpTrackingLinkPage(pageNumber: number | string): void {
  const nextPage = boundedPage(trackingState().trackingLinkPage, pageNumber)
  if (nextPage === null || nextPage === trackingState().trackingLinkPage.page) return
  loadTrackingAnalytics(trackingState().trackingEventPage.page, nextPage)
}
