import type { TemplateVariable } from '../types'

const TEMPLATE_VARIABLE_PATTERN = /\$\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}/g

type TemplateVariableLike = Partial<TemplateVariable> & {
  key?: unknown
  label?: unknown
  sampleValue?: unknown
  required?: unknown
}

export function cloneTemplateVariables(variables: TemplateVariable[]) {
  return variables.map((variable) => ({ ...variable }))
}

export function parseTemplateVariables(variablesJson: string, fallbackVariables: TemplateVariable[] = []) {
  if (!variablesJson) return cloneTemplateVariables(fallbackVariables)
  try {
    const parsed = JSON.parse(variablesJson) as unknown
    if (!Array.isArray(parsed)) return cloneTemplateVariables(fallbackVariables)
    return normalizeTemplateVariables(parsed as TemplateVariableLike[])
  } catch {
    return cloneTemplateVariables(fallbackVariables)
  }
}

export function templateVariablesToJson(variables: TemplateVariable[]) {
  return JSON.stringify(normalizeTemplateVariables(variables))
}

export function renderTemplatePreview({
  subject,
  htmlBody,
  variables
}: {
  subject: string
  htmlBody: string
  variables: TemplateVariable[]
}) {
  const valuesByKey = new Map(
    normalizeTemplateVariables(variables).map((variable) => [
      variable.key,
      variable.sampleValue || variable.label || variable.key
    ])
  )
  return {
    subjectPreview: renderTemplateText(subject, valuesByKey),
    htmlPreview: renderTemplateText(htmlBody, valuesByKey)
  }
}

export function syncTemplateVariables({
  subject,
  htmlBody,
  variables
}: {
  subject: string
  htmlBody: string
  variables: TemplateVariable[]
}) {
  const existingByKey = new Map(
    normalizeTemplateVariables(variables).map((variable) => [variable.key, variable])
  )

  return scanTemplateVariableKeys(`${subject || ''}\n${htmlBody || ''}`).map((key) => {
    const existing = existingByKey.get(key)
    if (existing) return existing
    return {
      key,
      label: key,
      sampleValue: '',
      required: false
    }
  })
}

export function scanTemplateVariableKeys(source: string) {
  const keys: string[] = []
  const seen = new Set<string>()
  for (const match of String(source || '').matchAll(TEMPLATE_VARIABLE_PATTERN)) {
    const key = match[1].trim()
    if (seen.has(key)) continue
    seen.add(key)
    keys.push(key)
  }
  return keys
}

function normalizeTemplateVariables(variables: TemplateVariableLike[]) {
  if (!Array.isArray(variables)) return []
  const seen = new Set<string>()
  const normalized: TemplateVariable[] = []
  for (const variable of variables) {
    const key = String(variable?.key || '').trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    normalized.push({
      key,
      label: String(variable?.label || '').trim(),
      sampleValue: String(variable?.sampleValue || ''),
      required: Boolean(variable?.required)
    })
  }
  return normalized
}

function renderTemplateText(source: string, valuesByKey: Map<string, string>) {
  return String(source || '').replace(TEMPLATE_VARIABLE_PATTERN, (_, key: string) => {
    const normalizedKey = String(key || '').trim()
    return valuesByKey.get(normalizedKey) || ''
  })
}

