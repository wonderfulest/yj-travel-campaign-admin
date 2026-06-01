import { request } from './request'
import type { AwsSesForm, Channel, SmtpForm } from '../types'

type ChannelType = 'smtp' | 'aws-ses'

function channelSavePath(channelType: ChannelType, editingChannelId: string | number | null): string {
  const isSmtp = channelType === 'smtp'
  if (editingChannelId) {
    return isSmtp
      ? `/api/channels/email/smtp/${editingChannelId}`
      : `/api/channels/email/aws-ses/${editingChannelId}`
  }
  return isSmtp ? '/api/channels/email/smtp' : '/api/channels/email/aws-ses'
}

export const channelsApi = {
  list(query: string): Promise<unknown> {
    return request(`/api/channels?${query}`)
  },
  save(
    channelType: ChannelType,
    editingChannelId: string | number | null,
    payload: SmtpForm | AwsSesForm
  ): Promise<unknown> {
    return request(channelSavePath(channelType, editingChannelId), {
      method: editingChannelId ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    })
  },
  remove(channel: Channel): Promise<unknown> {
    return request(`/api/channels/${channel.id}`, { method: 'DELETE' })
  }
}
