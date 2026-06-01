export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: '待验证',
    VERIFIED: '已验证',
    BOUNCED: '退信',
    MISSING: '缺失',
    NOT_CONTACTED: '未触达',
    READY_TO_VERIFY: '待复核',
    CONTACTED: '已触达',
    UNSUBSCRIBED: '已退订',
    INVALID: '无效',
    UNKNOWN: '未知'
  }
  return labels[status] || status || '未知'
}

export function displayValue<T>(value: T): T | '-' {
  if (value === null || value === undefined || value === '') return '-'
  return value
}

export function percentValue(value: number | string | undefined): string {
  return `${Math.round(Number(value || 0) * 100)}%`
}

export function normalizedWebsiteUrl(website: string | undefined): string {
  const value = String(website || '').trim()
  if (!value) return ''
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

export function formatWebsiteLabel(website: string | undefined): string {
  return String(website || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/$/, '')
}

export function jsonObject(value: unknown): unknown {
  if (!value) return null
  if (typeof value === 'object') return value
  try {
    return JSON.parse(String(value))
  } catch {
    return null
  }
}

export function localizedName(value: unknown): string {
  const parsed = jsonObject(value) as Record<string, string> | null
  if (!parsed) return displayValue(value) as string
  return parsed.zh || parsed['zh-CN'] || parsed.en || Object.values(parsed).find(Boolean) || '-'
}

export function formatLanguages(languages: unknown[]): string {
  if (!languages?.length) return '-'
  return languages.map((item) => localizedName(item)).filter((item) => item && item !== '-').join('、') || '-'
}

interface Destination {
  country?: { id: string; name: unknown }
  city?: { name: unknown; country?: { id: string } }
  worldRegion?: { name: unknown }
  iataAirport?: { id: string; name: unknown }
}

export function destinationLabel(destination: Destination | null | undefined): string {
  if (!destination) return '-'
  if (destination.country) return `${destination.country.id} ${localizedName(destination.country.name)}`
  if (destination.city) return `${localizedName(destination.city.name)}${destination.city.country?.id ? ` / ${destination.city.country.id}` : ''}`
  if (destination.worldRegion) return localizedName(destination.worldRegion.name)
  if (destination.iataAirport) return `${destination.iataAirport.id} ${localizedName(destination.iataAirport.name)}`
  return '-'
}

export function csvToList(value: unknown): string[] {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}
