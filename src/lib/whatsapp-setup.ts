import type { OrganizationWhatsAppRules, WhatsAppTemplateKey, WhatsAppTemplateState } from '@/types/api'

/** Identificador con el que el super-admin administra la cuenta de WhatsApp de la plataforma. */
export const PLATFORM_WHATSAPP_ID = '__platform__'

/** Bandeja del super-admin: chats al número de la plataforma que no pertenecen a ninguna organización. */
export const UNASSIGNED_WHATSAPP_ID = '__unassigned__'

export const MAX_TEMPLATE_BODY_LENGTH = 1024
/** Días de antelación posibles para el recordatorio. El día del vencimiento tiene su propio aviso. */
export const REMINDER_DAY_OPTIONS = [3, 5, 7]

export type TemplateDisplayStatus = 'active' | 'pending' | 'rejected' | 'blocked' | 'none'

export function getTemplateDisplayStatus(template: WhatsAppTemplateState): TemplateDisplayStatus {
  const status = template.request?.status
  if (status === 'pending' || status === 'rejected' || status === 'blocked') return status
  return template.activeContentSid ? 'active' : 'none'
}

/** "5 y 3 días", "1 día". */
export function formatReminderDays(days: number[]): string {
  const sorted = [...days].sort((a, b) => b - a)
  const unit = sorted.length === 1 && sorted[0] === 1 ? 'día' : 'días'
  const list =
    sorted.length <= 1 ? sorted.join('') : `${sorted.slice(0, -1).join(', ')} y ${sorted[sorted.length - 1]}`
  return `${list} ${unit}`
}

interface TemplateUsage {
  /** Si alguna regla activa envía esta plantilla de forma automática. */
  enabled: boolean
  when: string
}

const TEMPLATE_USAGE: Record<WhatsAppTemplateKey, (rules: OrganizationWhatsAppRules) => TemplateUsage> = {
  reminder: (rules) =>
    rules.reminderDaysBefore.length > 0
      ? { enabled: true, when: `Se envía ${formatReminderDays(rules.reminderDaysBefore)} antes del vencimiento.` }
      : { enabled: false, when: 'Desactivado: no elegiste días de recordatorio en «Cuándo avisar».' },
  dueDateWarning: (rules) =>
    rules.dueDateWarningEnabled
      ? { enabled: true, when: 'Se envía el día en que vence el período sin pagar.' }
      : { enabled: false, when: 'Desactivado en «Cuándo avisar». Aún sirve para los recordatorios manuales del inicio.' },
  suspensionNotice: (rules) =>
    rules.suspensionNoticeEnabled
      ? { enabled: true, when: 'Se envía cuando el servicio pasa a suspendido.' }
      : { enabled: false, when: 'Desactivado en «Cuándo avisar».' },
}

/** `null` para plantillas que el servidor añada y esta versión aún no conozca. */
export function describeTemplateUsage(key: string, rules: OrganizationWhatsAppRules): TemplateUsage | null {
  return Object.hasOwn(TEMPLATE_USAGE, key) ? TEMPLATE_USAGE[key as WhatsAppTemplateKey](rules) : null
}

/** El servidor decide; las reglas locales solo cubren a uno que aún no envíe `required`. */
export function isTemplateRequired(template: WhatsAppTemplateState, rules: OrganizationWhatsAppRules): boolean {
  return template.required ?? describeTemplateUsage(template.key, rules)?.enabled ?? false
}

const PLACEHOLDER_PATTERN = /\{\{[^{}]*\}\}/g

/** Mismas reglas que aplica el servidor, para avisar antes de enviar a revisión. */
export function validateTemplateBody(rawBody: string, variables: WhatsAppTemplateState['variables']): string | null {
  const body = rawBody.trim()
  if (!body) return 'Escribe el texto del mensaje.'
  if (body.length > MAX_TEMPLATE_BODY_LENGTH) {
    return `El texto no puede superar ${MAX_TEMPLATE_BODY_LENGTH} caracteres.`
  }
  const found = new Set(body.match(PLACEHOLDER_PATTERN) ?? [])
  const missing = variables.filter((variable) => !found.has(variable.placeholder))
  if (missing.length > 0) {
    return `Falta incluir ${missing.map((variable) => `${variable.placeholder} (${variable.description})`).join(', ')}.`
  }
  const expected = new Set(variables.map((variable) => variable.placeholder))
  const unknown = [...found].filter((placeholder) => !expected.has(placeholder))
  if (unknown.length > 0) {
    return `Quita ${unknown.join(', ')}: este mensaje solo admite ${[...expected].join(', ')}.`
  }
  if (body.startsWith('{{') || body.endsWith('}}')) {
    return 'WhatsApp no acepta mensajes que empiecen o terminen con un dato variable. Añade texto antes o después.'
  }
  return null
}

export interface TemplatePreviewPart {
  text: string
  isVariable: boolean
  bold: boolean
}

/** Sustituye cada `{{n}}` por un dato de ejemplo o, si el servidor no lo envía, por su descripción. */
export function buildTemplatePreview(
  body: string,
  variables: WhatsAppTemplateState['variables'],
): TemplatePreviewPart[] {
  const descriptions = new Map(
    variables.map((variable) => [variable.placeholder, variable.sample ?? variable.description]),
  )
  const parts: TemplatePreviewPart[] = []
  let cursor = 0
  for (const match of body.matchAll(PLACEHOLDER_PATTERN)) {
    if (match.index > cursor) {
      parts.push({ text: body.slice(cursor, match.index), isVariable: false, bold: false })
    }
    const description = descriptions.get(match[0])
    parts.push(
      description
        ? { text: description, isVariable: true, bold: false }
        : { text: match[0], isVariable: false, bold: false },
    )
    cursor = match.index + match[0].length
  }
  if (cursor < body.length) parts.push({ text: body.slice(cursor), isVariable: false, bold: false })

  const tokens = parts.flatMap((part) =>
    part.isVariable
      ? [part]
      : part.text
          .split(/(\*)/)
          .filter(Boolean)
          .map((text) => ({ text, isVariable: false, bold: false })),
  )
  const preview: TemplatePreviewPart[] = []
  let bold = false
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    if (!token.isVariable && token.text === '*') {
      if (bold) {
        bold = false
        continue
      }
      if (tokens.slice(index + 1).some((next) => !next.isVariable && next.text === '*')) {
        bold = true
        continue
      }
    }
    preview.push({ ...token, bold })
  }
  return preview
}
