import { defineStore } from 'pinia'
import type { AwsSesForm, Channel, SmtpForm } from '../types'
import { channelsApi } from '../api/channels'
import { useAppStore } from './useAppStore'
import { boundedPage, normalizePageResult, pageQuery } from '../utils/pagination'

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

const channelState = () => useChannelStore()
const appState = () => useAppStore()

export async function loadChannels(page = channelState().channelPage.page): Promise<void> {
  try {
    const result = await channelsApi.list(pageQuery(channelState().channelPage, page))
    const pageResult = normalizePageResult<Channel>(result, [], page, channelState().channelPage.size)
    channelState().channels = pageResult.items
    channelState().channelPage = pageResult
  } catch (error: unknown) {
    const err = error as { message?: string }
    channelState().channels = []
    channelState().channelPage = normalizePageResult<Channel>([], [], 0, channelState().channelPage.size)
    appState().error = `推送通道加载失败：${err.message}`
  }
}

export async function saveChannel(): Promise<void> {
  const appStore = appState()
  const channelStore = channelState()
  appStore.loading = true
  appStore.error = ''
  appStore.notice = ''
  try {
    const isSmtp = channelState().channelType === 'smtp'
    const payload = isSmtp
      ? { ...channelStore.smtpForm, smtpPort: Number(channelStore.smtpForm.smtpPort) }
      : channelStore.awsSesForm
    await channelsApi.save(channelStore.channelType, channelStore.editingChannelId, payload)
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
  const appStore = appState()
  const channelStore = channelState()
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
  channelState().editingChannelId = null
  channelState().editingChannelType = null
  channelState().channelType = 'smtp'
  channelState().smtpForm = defaultSmtpForm()
  channelState().awsSesForm = defaultAwsSesForm()
}

export async function deleteChannel(channel: Channel): Promise<void> {
  if (!window.confirm(`确认删除推送通道「${channel.name}」？`)) return
  appState().loading = true
  appState().error = ''
  appState().notice = ''
  try {
    await channelsApi.remove(channel)
    const nextPage = channelState().channels.length === 1 && channelState().channelPage.page > 0
      ? channelState().channelPage.page - 1
      : channelState().channelPage.page
    await loadChannels(nextPage)
    appState().notice = '推送通道已删除'
  } catch (error: unknown) {
    const err = error as { message?: string }
    appState().error = `通道删除失败：${err.message}`
  } finally {
    appState().loading = false
  }
}

export function changeChannelPage(nextPage: number): void {
  if (nextPage < 0 || (channelState().channelPage.totalPages && nextPage >= channelState().channelPage.totalPages)) return
  loadChannels(nextPage)
}

export function jumpChannelPage(pageNumber: number | string): void {
  const nextPage = boundedPage(channelState().channelPage, pageNumber)
  if (nextPage === null || nextPage === channelState().channelPage.page) return
  loadChannels(nextPage)
}

export function changeChannelPageSize(size: number | string): void {
  const nextSize = Number(size)
  if (!nextSize) return
  channelState().channelPage.size = nextSize
  loadChannels(0)
}
