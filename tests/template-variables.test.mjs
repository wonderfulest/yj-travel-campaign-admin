import assert from 'node:assert/strict'

import { readFileSync } from 'node:fs'

import { scanTemplateVariableKeys, syncTemplateVariables } from '../src/template-variables.js'

const existingVariables = [
  { key: 'customerName', label: '客户名称', sampleValue: 'Reisen Scala', required: true },
  { key: 'companyName', label: '公司名称', sampleValue: 'Youjie Tech', required: false },
  { key: 'removedVariable', label: '移除变量', sampleValue: 'legacy', required: true }
]

const synced = syncTemplateVariables({
  subject: 'Special offer for ${customerName} from ${travelAdvisor}',
  htmlBody: '<p>Hello ${customerName}, book with ${companyName} and ${destinationName}</p>',
  variables: existingVariables
})

assert.deepEqual(
  synced.map((variable) => variable.key),
  ['customerName', 'travelAdvisor', 'companyName', 'destinationName'],
  'template variables must match placeholders from subject and HTML in first-seen order'
)

assert.equal(
  synced.find((variable) => variable.key === 'customerName').label,
  '客户名称',
  'existing variable metadata must be preserved for placeholders that remain in the template'
)

assert.equal(
  synced.find((variable) => variable.key === 'travelAdvisor').label,
  'travelAdvisor',
  'new subject placeholders must be added to variable config'
)

assert.equal(
  synced.some((variable) => variable.key === 'removedVariable'),
  false,
  'variable config entries absent from subject and HTML must be removed'
)

const defaultTemplate = readFileSync(new URL('../src/templates/pioneer-china-email.html', import.meta.url), 'utf8')

assert(
  scanTemplateVariableKeys(defaultTemplate).includes('trackingLink'),
  'default email HTML template must include the trackingLink short-link parameter'
)
