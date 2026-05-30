const TEMPLATE_VARIABLE_PATTERN = /\$\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}/g

export function cloneTemplateVariables(variables) {
  return variables.map((variable) => ({ ...variable }))
}

export function parseTemplateVariables(variablesJson, fallbackVariables = []) {
  if (!variablesJson) return cloneTemplateVariables(fallbackVariables)
  try {
    const parsed = JSON.parse(variablesJson)
    if (!Array.isArray(parsed)) return cloneTemplateVariables(fallbackVariables)
    return normalizeTemplateVariables(parsed)
  } catch {
    return cloneTemplateVariables(fallbackVariables)
  }
}

export function templateVariablesToJson(variables) {
  return JSON.stringify(normalizeTemplateVariables(variables))
}

export function syncTemplateVariables({ subject, htmlBody, variables }) {
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

export function scanTemplateVariableKeys(source) {
  const keys = []
  const seen = new Set()
  for (const match of String(source || '').matchAll(TEMPLATE_VARIABLE_PATTERN)) {
    const key = match[1].trim()
    if (seen.has(key)) continue
    seen.add(key)
    keys.push(key)
  }
  return keys
}

function normalizeTemplateVariables(variables) {
  if (!Array.isArray(variables)) return []
  const seen = new Set()
  const normalized = []
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
