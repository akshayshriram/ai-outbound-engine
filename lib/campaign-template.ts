import type { Database, Json } from '@/types/database'

type CampaignRow = Database['public']['Tables']['campaigns']['Row']

/**
 * Shape stored in `campaigns.email_template`. The column is jsonb so new fields
 * (tone, CTA, variants, sequence steps) can be added without a migration, which
 * also means the database cannot type-check it for us: every read goes through
 * `parseCampaignEmailTemplate` and every write through `buildCampaignEmailTemplate`.
 */
export type CampaignEmailTemplate = {
  subject: string
  body: string
  context: string | null
  /** When the AI last produced this template. Manual edits do not move it. */
  generatedAt: string | null
  /** When a human last edited this template, or null if it is untouched. */
  updatedAt: string | null
}

function asRecord(value: Json | null): Record<string, Json | undefined> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value
}

function asString(value: Json | undefined): string | null {
  return typeof value === 'string' ? value : null
}

/**
 * Narrows the raw jsonb column into a typed template, or null when the column is
 * empty or does not carry a usable subject and body.
 */
export function parseCampaignEmailTemplate(
  value: CampaignRow['email_template'],
): CampaignEmailTemplate | null {
  const record = asRecord(value)
  if (!record) return null

  const subject = asString(record.subject)
  const body = asString(record.body)
  if (!subject || !body) return null

  return {
    subject,
    body,
    context: asString(record.context),
    generatedAt: asString(record.generatedAt),
    updatedAt: asString(record.updatedAt),
  }
}

/**
 * Builds the jsonb payload to persist, keeping the stored shape in one place so
 * writers cannot drift from what `parseCampaignEmailTemplate` expects.
 */
export function buildCampaignEmailTemplate(
  input: Pick<CampaignEmailTemplate, 'subject' | 'body'> &
    Partial<Pick<CampaignEmailTemplate, 'context' | 'generatedAt'>>,
): CampaignEmailTemplate {
  return {
    subject: input.subject,
    body: input.body,
    context: input.context ?? null,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    updatedAt: null,
  }
}

/** Lead fields a template placeholder can resolve against. */
export type CampaignEmailRecipient = Partial<
  Pick<
    Database['public']['Tables']['leads']['Row'],
    'first_name' | 'last_name' | 'company' | 'email'
  >
>

export type RenderedCampaignEmail = {
  subject: string
  body: string
  /** Placeholders left unresolved, e.g. a typo or a field the lead is missing. */
  unresolved: string[]
}

const PLACEHOLDER_PATTERN = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi

/**
 * Substitutes {{first_name}}-style placeholders with lead data. Shared by the
 * send route and the UI preview so what a user previews is exactly what is
 * sent — any drift between the two would be invisible until a prospect saw it.
 *
 * Unresolved placeholders are left verbatim and reported rather than silently
 * blanked, so the caller can refuse to send a half-filled email.
 */
export function renderCampaignEmailTemplate(
  template: Pick<CampaignEmailTemplate, 'subject' | 'body'>,
  recipient: CampaignEmailRecipient,
): RenderedCampaignEmail {
  const values: Record<string, string | null | undefined> = {
    first_name: recipient.first_name,
    last_name: recipient.last_name,
    company: recipient.company,
    email: recipient.email,
  }

  const unresolved = new Set<string>()

  const render = (text: string) =>
    text.replace(PLACEHOLDER_PATTERN, (match, rawKey: string) => {
      const value = values[rawKey.toLowerCase()]

      if (typeof value === 'string' && value.trim()) return value.trim()

      unresolved.add(rawKey.toLowerCase())
      return match
    })

  return {
    subject: render(template.subject),
    body: render(template.body),
    unresolved: [...unresolved],
  }
}

/**
 * Applies a manual edit, keeping everything the editor does not own (the context
 * the AI was given, when it was generated) so an edit never silently drops it.
 */
export function applyCampaignEmailTemplateEdit(
  template: CampaignEmailTemplate,
  edit: Pick<CampaignEmailTemplate, 'subject' | 'body'>,
): CampaignEmailTemplate {
  return {
    ...template,
    subject: edit.subject,
    body: edit.body,
    updatedAt: new Date().toISOString(),
  }
}
