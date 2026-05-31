import { defineStore } from 'pinia'
import type { AwsSesForm, Channel, SmtpForm } from '../types.ts'
import { request } from './useAppStore.ts'
import { normalizePageResult, emptyPageResult, pageQuery, boundedPage } from './useCustomerStore.ts'

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
    smtpForm: {
      name: 'SMTP Gmail',
      smtpHost: 'smtp.gmail.com',
      smtpPort: 465,
      smtpEncryption: 'SSL',
      smtpUsername: '',
      smtpPassword: '',
      fromEmail: 'noreply@example.com',
      fromName: 'Youjie Tech',
      replyTo: 'reply@example.com'
    } as SmtpForm,
    awsSesForm: {
      name: 'SES Frankfurt',
      fromEmail: 'noreply@example.com',
      fromName: 'Youjie Tech',
      replyTo: 'reply@example.com',
      awsRegion: 'eu-central-1',
      awsAccessKeyId: '',
      awsSecretAccessKey: ''
    } as AwsSesForm
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
    const { appStore } = await import('./useAppStore.ts')
    appStore.error = `推送通道加载失败：${err.message}`
  }
}

export async function createChannel(): Promise<void> {
  const { appStore } = await import('./useAppStore.ts')
  appStore.loading = true
  appStore.error = ''
  appStore.notice = ''
  try {
    const isSmtp = channelStore.channelType === 'smtp'
    const path = isSmtp ? '/api/channels/email/smtp' : '/api/channels/email/aws-ses'
    const payload = isSmtp
      ? { ...channelStore.smtpForm, smtpPort: Number(channelStore.smtpForm.smtpPort) }
      : channelStore.awsSesForm
    await request(path, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    await loadChannels()
    if (isSmtp) {
      channelStore.smtpForm.smtpPassword = ''
    } else {
      channelStore.awsSesForm.awsSecretAccessKey = ''
    }
    appStore.notice = '推送通道已保存'
  } catch (error: unknown) {
    const err = error as { message?: string }
    appStore.error = `通道保存失败：${err.message}`
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
