import assert from 'node:assert/strict'

import { readdirSync, readFileSync } from 'node:fs'

import { renderTemplatePreview, scanTemplateVariableKeys, syncTemplateVariables } from '../src/utils/templateVariables.ts'

const existingVariables = [
  { key: 'customerName', label: '客户名称', sampleValue: 'Reisen Scala', required: true },
  { key: 'companyName', label: '公司名称', sampleValue: 'Youjie Tech', required: false },
  { key: 'removedVariable', label: '移除变量', sampleValue: 'legacy', required: true }
]

const synced = syncTemplateVariables({
  subject: 'Special offer for ${customerName} from ${travelAdvisor}',
  htmlBody: '<p>Hello ${customerName}, book with ${companyName} and ${destinationName}</p><a href="${trackingLink}">View</a><a href="${unsubscribeLink}">Unsubscribe</a>',
  variables: existingVariables
})

assert.deepEqual(
  synced.map((variable) => variable.key),
  ['customerName', 'travelAdvisor', 'companyName', 'destinationName', 'trackingLink', 'unsubscribeLink'],
  'template variables must include all placeholders from the subject and HTML'
)

assert.equal(
  synced.find((variable) => variable.key === 'trackingLink').label,
  '短链',
  'trackingLink must use the short-link variable label'
)

assert.equal(
  synced.find((variable) => variable.key === 'unsubscribeLink').label,
  '退订链接',
  'unsubscribeLink must use the unsubscribe variable label'
)

assert.deepEqual(
  syncTemplateVariables({
    subject: 'Special offer for ${customerName}',
    htmlBody: '<p>Hello ${companyName}</p>',
    variables: existingVariables
  }).map((variable) => variable.key),
  ['customerName', 'companyName'],
  'template variable config must mirror non-short-link placeholders from the template'
)

assert.equal(
  synced.find((variable) => variable.key === 'customerName').label,
  '客户名称',
  'synced variables must preserve existing labels'
)

assert.equal(
  synced.find((variable) => variable.key === 'travelAdvisor').label,
  'travelAdvisor',
  'new variables must default their label to the variable key'
)

assert.equal(
  synced.some((variable) => variable.key === 'removedVariable'),
  false,
  'variable config entries absent from subject and HTML must be removed'
)

const templateDirectory = new URL('../src/assets/templates/', import.meta.url)
const templateFiles = readdirSync(templateDirectory).filter((file) => file.endsWith('.html'))

for (const templateFile of templateFiles) {
  const template = readFileSync(new URL(templateFile, templateDirectory), 'utf8')
  const keys = scanTemplateVariableKeys(template)

  assert(
    keys.includes('trackingLink'),
    `${templateFile} must include the trackingLink short-link parameter`
  )

  assert(
    keys.includes('unsubscribeLink'),
    `${templateFile} must include the unsubscribeLink parameter`
  )
}

const renderedPreview = renderTemplatePreview({
  subject: 'Special offer for ${customerName}',
  htmlBody: '<p>Hello ${customerName}, book with ${companyName}</p><a href="${trackingLink}">View</a><a href="${unsubscribeLink}">Unsubscribe</a>',
  variables: synced,
  runtimeVariables: {
    trackingLink: 'https://go.example.com/uk-agency-202605',
    unsubscribeLink: 'https://tengxuan.com/unsubscribe?token=rt_abc'
  }
})

assert.equal(
  renderedPreview.subjectPreview,
  'Special offer for Reisen Scala',
  'local template preview must render configured non-short-link placeholders'
)

assert.equal(
  renderedPreview.htmlPreview,
  '<p>Hello Reisen Scala, book with Youjie Tech</p><a href="https://go.example.com/uk-agency-202605">View</a><a href="https://tengxuan.com/unsubscribe?token=rt_abc">Unsubscribe</a>',
  'local template preview must render configured variables, trackingLink, and unsubscribeLink'
)
