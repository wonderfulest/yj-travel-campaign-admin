import { request } from './request'
import type { Campaign, TemplateVariableOption } from '../types'

export type CampaignActionKey = 'prePush' | 'confirm' | 'simulateSend'

const CAMPAIGN_ACTION_PATHS: Record<CampaignActionKey, string> = {
  prePush: 'pre-push',
  confirm: 'confirm',
  simulateSend: 'simulate-send'
}

export interface CampaignTemplatePreview {
  subjectPreview?: string
  htmlPreview?: string
}

export const campaignsApi = {
  list(query: string): Promise<unknown> {
    return request(`/api/campaigns?${query}`)
  },
  create(body: { name: string; objective: string }): Promise<Campaign> {
    return request('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify(body)
    }) as Promise<Campaign>
  },
  get(id: string | number): Promise<Campaign> {
    return request(`/api/campaigns/${id}`) as Promise<Campaign>
  },
  listTemplateVariables(): Promise<TemplateVariableOption[]> {
    return request('/api/campaigns/template/variables') as Promise<TemplateVariableOption[]>
  },
  remove(id: string | number): Promise<unknown> {
    return request(`/api/campaigns/${id}`, { method: 'DELETE' })
  },
  updateTemplate(id: string | number, payload: unknown): Promise<Campaign> {
    return request(`/api/campaigns/${id}/template`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }) as Promise<Campaign>
  },
  updateChannel(id: string | number, channelId: string | number): Promise<Campaign> {
    return request(`/api/campaigns/${id}/channel`, {
      method: 'PUT',
      body: JSON.stringify({ channelId })
    }) as Promise<Campaign>
  },
  updateSegments(id: string | number, segmentIds: (string | number)[]): Promise<Campaign> {
    return request(`/api/campaigns/${id}/segments`, {
      method: 'PUT',
      body: JSON.stringify({ segmentIds })
    }) as Promise<Campaign>
  },
  updateTrackingLink(id: string | number, payload: unknown): Promise<Campaign> {
    return request(`/api/campaigns/${id}/tracking-link`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }) as Promise<Campaign>
  },
  previewTemplate(id: string | number, payload: unknown): Promise<CampaignTemplatePreview> {
    return request(`/api/campaigns/${id}/template/preview`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }) as Promise<CampaignTemplatePreview>
  },
  action(id: string | number, action: CampaignActionKey, body: unknown): Promise<Campaign> {
    return request(`/api/campaigns/${id}/${CAMPAIGN_ACTION_PATHS[action]}`, {
      method: 'POST',
      body: JSON.stringify(body)
    }) as Promise<Campaign>
  },
  rollback(id: string | number, body: unknown): Promise<Campaign> {
    return request(`/api/campaigns/${id}/rollback`, {
      method: 'POST',
      body: JSON.stringify(body)
    }) as Promise<Campaign>
  },
}
