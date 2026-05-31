import { defineStore } from 'pinia'
import type { AwsSesForm, Channel, SmtpForm } from '../types.ts'
import { request, appStore } from './appContext.ts'
import { normalizePageResult, emptyPageResult, pageQuery, boundedPage } from './useCustomerStore.ts'

function defaultSmtpForm(): SmtpForm {
  return {
    name: 'SMTP Gmail',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 465,
    smtpEncryption: 'SSL',
    smtpUsername: '',
    smtpPassword: '',
    fromEmail: 'noreply@example.com',
    fromName: 'Youjie Tech',
    replyTo: 'reply@example.com'
  }
}

function defaultAwsSesForm(): AwsSesForm {
  return {
    name: 'SES Frankfurt',
    fromEmail: 'noreply@example.com',
    fromName: 'Youjie Tech',
    replyTo: 'reply@example.com',
    awsRegion: 'eu-central-1',
    awsAccessKeyId: '',
    awsSecretAccessKey: ''
  }
}

export const useChannelStore = defineStore('channel', {
  state: () => ({
    channels: [] as Channel[],
    channelPage: {
      page: 0,
      size: 20,
      totalItems: 0,
      totalPages: 0,
      hasNext: false,
      hasPrevious: false
    },
    channelType: 'smtp' as 'smtp' | 'aws-ses',
    editingChannelId: null as string | number | null,
    editingChannelType: null as 'smtp' | 'aws-ses' | null,
    smtpForm: defaultSmtpForm(),
    awsSesForm: defaultAwsSesForm()
  })
})

export const channelStore = useChannelStore()

export async function loadChannels(page = channelStore.channelPage.page): Promise<void> {
  try {
    const result = await request(`/api/channels?${pageQuery(channelStore.channelPage, page)}`)
    const pageResult = normalizePageResult<Channel>(result, [], page, channelStore.channelPage.size)
    channelStore.channels = pageResult.items
    channelStore.channelPage = pageResult
  } catch (error: unknown) {
    const err = error as { message?: string }
    channelStore.channels = []
    channelStore.channelPage = normalizePageResult<Channel>([], [], 0, channelStore.channelPage.size)
    appStore.error = `推送通道加载失败：${err.message}`
  }
}

export async function saveChannel(): Promise<void> {
  appStore.loading = true
  appStore.error = ''
  appStore.notice = ''
  try {
    const isSmtp = channelStore.channelType === 'smtp'
    const path = channelStore.editingChannelId
      ? isSmtp
        ? `/api/channels/email/smtp/${channelStore.editingChannelId}`
        : `/api/channels/email/aws-ses/${channelStore.editingChannelId}`
      : isSmtp
        ? '/api/channels/email/smtp'
        : '/api/channels/email/aws-ses'
    const payload = isSmtp
      ? { ...channelStore.smtpForm, smtpPort: Number(channelStore.smtpForm.smtpPort) }
      : channelStore.awsSesForm
    await request(path, {
      method: channelStore.editingChannelId ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    })
    await loadChannels()
    const wasEditing = Boolean(channelStore.editingChannelId)
    channelStore.editingChannelId = null
    channelStore.editingChannelType = null
    if (isSmtp) {
      channelStore.smtpForm.smtpPassword = ''
    } else {
      channelStore.awsSesForm.awsSecretAccessKey = ''
    }
    appStore.notice = wasEditing ? '推送通道已更新' : '推送通道已保存'
  } catch (error: unknown) {
    const err = error as { message?: string }
    appStore.error = `通道保存失败：${err.message}`
  } finally {
    appStore.loading = false
  }
}

export const createChannel = saveChannel

export function editChannel(channel: Channel): void {
  appStore.error = ''
  appStore.notice = ''
  channelStore.editingChannelId = channel.id
  if (channel.channelType === 'EMAIL_SMTP') {
    channelStore.channelType = 'smtp'
    channelStore.editingChannelType = 'smtp'
    channelStore.smtpForm = {
      name: channel.name,
      smtpHost: channel.smtpHost || '',
      smtpPort: channel.smtpPort || 25,
      smtpEncryption: channel.smtpEncryption || 'None',
      smtpUsername: channel.smtpUsername || '',
      smtpPassword: '',
      fromEmail: channel.fromEmail,
      fromName: channel.fromName || '',
      replyTo: channel.replyTo || ''
    }
    return
  }
  channelStore.channelType = 'aws-ses'
  channelStore.editingChannelType = 'aws-ses'
  channelStore.awsSesForm = {
    name: channel.name,
    fromEmail: channel.fromEmail,
    fromName: channel.fromName || '',
    replyTo: channel.replyTo || '',
    awsRegion: channel.awsRegion || '',
    awsAccessKeyId: channel.awsAccessKeyId || '',
    awsSecretAccessKey: ''
  }
}

export function cancelChannelEdit(): void {
  channelStore.editingChannelId = null
  channelStore.editingChannelType = null
  channelStore.channelType = 'smtp'
  channelStore.smtpForm = defaultSmtpForm()
  channelStore.awsSesForm = defaultAwsSesForm()
}

export async function deleteChannel(channel: Channel): Promise<void> {
  if (!window.confirm(`确认删除推送通道「${channel.name}」？`)) return
  appStore.loading = true
  appStore.error = ''
  appStore.notice = ''
  try {
    await request(`/api/channels/${channel.id}`, {
      method: 'DELETE'
    })
    const nextPage = channelStore.channels.length === 1 && channelStore.channelPage.page > 0
      ? channelStore.channelPage.page - 1
      : channelStore.channelPage.page
    await loadChannels(nextPage)
    appStore.notice = '推送通道已删除'
  } catch (error: unknown) {
    const err = error as { message?: string }
    appStore.error = `通道删除失败：${err.message}`
  } finally {
    appStore.loading = false
  }
}

export function changeChannelPage(nextPage: number): void {
  if (nextPage < 0 || (channelStore.channelPage.totalPages && nextPage >= channelStore.channelPage.totalPages)) return
  loadChannels(nextPage)
}

export function jumpChannelPage(pageNumber: number | string): void {
  const nextPage = boundedPage(channelStore.channelPage, pageNumber)
  if (nextPage === null || nextPage === channelStore.channelPage.page) return
  loadChannels(nextPage)
}

export function changeChannelPageSize(size: number | string): void {
  const nextSize = Number(size)
  if (!nextSize) return
  channelStore.channelPage.size = nextSize
  loadChannels(0)
}
