import type { PageResult } from '../types.ts'

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

interface PageInfo {
  page: number
  size: number
}

export function pageQuery(pageInfo: PageInfo, nextPage = pageInfo.page): string {
  const params = new URLSearchParams({
    page: String(Math.max(0, nextPage)),
    size: String(pageInfo.size)
  })
  return params.toString()
}

export function boundedPage(pageInfo: { totalPages?: number }, pageNumber: number | string): number | null {
  const value = Number(pageNumber)
  if (!Number.isFinite(value)) return null
  const totalPages = Number(pageInfo.totalPages || 0)
  if (!totalPages) return null
  return Math.min(Math.max(Math.trunc(value) - 1, 0), totalPages - 1)
}

export function emptyPageResult<T>(page = 0, size = 20): PageResult<T> {
  return {
    items: [],
    page,
    size,
    totalItems: 0,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false
  }
}

interface PageResultLike<T> {
  items?: T[]
  page?: number
  size?: number
  totalItems?: number
  totalPages?: number
  hasNext?: boolean
  hasPrevious?: boolean
}

export function normalizePageResult<T>(
  result: T[] | PageResultLike<T> | null | undefined,
  fallbackItems: T[] = [],
  fallbackPage = 0,
  fallbackSize = 20
): PageResult<T> {
  if (Array.isArray(result)) {
    return {
      items: result,
      page: fallbackPage,
      size: fallbackSize,
      totalItems: result.length,
      totalPages: result.length ? 1 : 0,
      hasNext: false,
      hasPrevious: false
    }
  }
  const items = Array.isArray(result?.items) ? result.items : fallbackItems
  const size = Number(result?.size || fallbackSize)
  const totalItems = Number(result?.totalItems ?? items.length)
  return {
    items,
    page: Number(result?.page || 0),
    size,
    totalItems,
    totalPages: Number(result?.totalPages ?? (totalItems ? Math.ceil(totalItems / size) : 0)),
    hasNext: Boolean(result?.hasNext),
    hasPrevious: Boolean(result?.hasPrevious)
  }
}

export function localPageResult<T>(items: T[], page = 0, size = 20): PageResult<T> {
  const safeSize = Number(size) > 0 ? Number(size) : 20
  const safePage = Math.max(0, Number(page) || 0)
  const totalItems = items.length
  const totalPages = totalItems ? Math.ceil(totalItems / safeSize) : 0
  const currentPage = totalPages ? Math.min(safePage, totalPages - 1) : 0
  const fromIndex = currentPage * safeSize
  return {
    items: items.slice(fromIndex, fromIndex + safeSize),
    page: currentPage,
    size: safeSize,
    totalItems,
    totalPages,
    hasNext: currentPage + 1 < totalPages,
    hasPrevious: currentPage > 0
  }
}
