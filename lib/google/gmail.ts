import 'server-only'

const SEND_ENDPOINT = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'

export type GmailSendResult = {
  messageId: string
  threadId: string | null
}

/** base64url, which is what Gmail's `raw` field expects (no padding, URL-safe). */
function toBase64Url(value: Buffer | string): string {
  return (typeof value === 'string' ? Buffer.from(value, 'utf8') : value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Headers must be ASCII, so a subject with any non-ASCII character (an accent,
 * a dash, an emoji) has to be an RFC 2047 encoded-word or Gmail mangles it.
 */
function encodeHeaderValue(value: string): string {
  const collapsed = value.replace(/[\r\n]+/g, ' ').trim()

  if (!/[^ -~]/.test(collapsed)) return collapsed

  return `=?UTF-8?B?${Buffer.from(collapsed, 'utf8').toString('base64')}?=`
}

/**
 * Builds an RFC 5322 message. The body is base64 with an explicit UTF-8
 * charset, which keeps long lines and non-ASCII content intact without us
 * having to implement quoted-printable line folding.
 */
function buildMimeMessage(input: {
  from: string
  to: string
  subject: string
  body: string
}): string {
  const headers = [
    `From: ${encodeHeaderValue(input.from)}`,
    `To: ${encodeHeaderValue(input.to)}`,
    `Subject: ${encodeHeaderValue(input.subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
  ]

  const encodedBody = Buffer.from(input.body, 'utf8')
    .toString('base64')
    .replace(/(.{76})/g, '$1\r\n')

  return `${headers.join('\r\n')}\r\n\r\n${encodedBody}`
}

export async function sendGmailMessage(input: {
  accessToken: string
  from: string
  to: string
  subject: string
  body: string
}): Promise<GmailSendResult> {
  const response = await fetch(SEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: toBase64Url(buildMimeMessage(input)) }),
    cache: 'no-store',
  })

  const payload = (await response.json().catch(() => null)) as
    | { id?: string; threadId?: string; error?: { message?: string } }
    | null

  if (!response.ok || !payload?.id) {
    const reason = payload?.error?.message ?? `HTTP ${response.status}`
    throw new Error(`Gmail refused the message: ${reason}`)
  }

  return { messageId: payload.id, threadId: payload.threadId ?? null }
}
