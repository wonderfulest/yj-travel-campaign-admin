import assert from 'node:assert/strict'

import { readFileSync } from 'node:fs'

import { renderTemplatePreview, scanTemplateVariableKeys, syncTemplateVariables } from '../src/utils/templateVariables.ts'

const existingVariables = [
  { key: 'customerName', label: '客户名称', sampleValue: 'Reisen Scala', required: true },
  { key: 'companyName', label: '公司名称', sampleValue: 'Youjie Tech', required: false },
  { key: 'removedVariable', label: '移除变量', sampleValue: 'legacy', required: true }
]

const synced = syncTemplateVariables({
  subject: 'Special offer for ${customerName} from ${travelAdvisor}',
  htmlBody: '<p>Hello ${customerName}, book with ${companyName} and ${destinationName}</p><a href="${trackingLink}">View</a>',
  variables: existingVariables
})

assert.deepEqual(
  synced.map((variable) => variable.key),
  ['customerName', 'travelAdvisor', 'companyName', 'destinationName', 'trackingLink'],
  'template variables must include all placeholders from the subject and HTML'
)

assert.equal(
  synced.find((variable) => variable.key === 'trackingLink').label,
  '短链',
  'trackingLink must use the short-link variable label'
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

const defaultTemplate = readFileSync(new URL('../src/assets/templates/pioneer-china-email.html', import.meta.url), 'utf8')

assert(
  scanTemplateVariableKeys(defaultTemplate).includes('trackingLink'),
  'default email HTML template must include the trackingLink short-link parameter'
)

const renderedPreview = renderTemplatePreview({
  subject: 'Special offer for ${customerName}',
  htmlBody: '<p>Hello ${customerName}, book with ${companyName}</p><a href="${trackingLink}">View</a>',
  variables: synced,
  runtimeVariables: {
    trackingLink: 'https://go.example.com/uk-agency-202605'
  }
})

assert.equal(
  renderedPreview.subjectPreview,
  'Special offer for Reisen Scala',
  'local template preview must render configured non-short-link placeholders'
)

assert.equal(
  renderedPreview.htmlPreview,
  '<p>Hello Reisen Scala, book with Youjie Tech</p><a href="https://go.example.com/uk-agency-202605">View</a>',
  'local template preview must render configured variables and trackingLink from the saved short-link configuration'
)
