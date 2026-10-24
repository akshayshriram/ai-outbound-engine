import 'server-only'

import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'node:crypto'

/**
 * AES-256-GCM envelope used for provider tokens at rest.
 *
 * Format: `v1:<iv b64>:<auth tag b64>:<ciphertext b64>`
 *
 * The `v1` prefix lets us rotate the algorithm later without guessing at old
 * rows, and `email_accounts` has a CHECK constraint on this shape so a raw
 * provider token can never be written to the token columns by mistake.
 */
const VERSION = 'v1'
const IV_BYTES = 12
const KEY_BYTES = 32

let cachedKey: Buffer | null = null

function resolveKey(): Buffer {
  if (cachedKey) return cachedKey

  const raw = process.env.AES_KEY?.trim()

  if (!raw) {
    throw new Error('AES_KEY is not set. Token encryption is unavailable.')
  }

  // Accept the three shapes people realistically paste into an env file.
  const candidates: Buffer[] = []

  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    candidates.push(Buffer.from(raw, 'hex'))
  }

  candidates.push(Buffer.from(raw, 'utf8'))

  try {
    candidates.push(Buffer.from(raw, 'base64'))
  } catch {
    // Not base64; the other candidates still apply.
  }

  const key = candidates.find((candidate) => candidate.length === KEY_BYTES)

  if (!key) {
    throw new Error(
      'AES_KEY must resolve to 32 bytes: 64 hex characters, a 32-character string, or base64 of 32 bytes.',
    )
  }

  cachedKey = key
  return key
}

/** Throws at boot/route entry if the key is unusable, so we fail before touching Google. */
export function assertEncryptionKey(): void {
  resolveKey()
}

export function encryptSecret(plaintext: string): string {
  const key = resolveKey()
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv('aes-256-gcm', key, iv)

  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [
    VERSION,
    iv.toString('base64'),
    authTag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':')
}

export function decryptSecret(envelope: string): string {
  const key = resolveKey()
  const parts = envelope.split(':')

  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error('Stored secret is not a recognised encryption envelope.')
  }

  const [, ivB64, authTagB64, ciphertextB64] = parts
  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(authTagB64, 'base64')

  if (iv.length !== IV_BYTES) {
    throw new Error('Stored secret has a malformed initialisation vector.')
  }

  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  try {
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextB64, 'base64')),
      decipher.final(),
    ]).toString('utf8')
  } catch {
    // GCM tag mismatch: wrong key, or the row was tampered with.
    throw new Error('Stored secret could not be decrypted. The AES_KEY may have changed.')
  }
}

export function encryptOptionalSecret(plaintext: string | null | undefined): string | null {
  return plaintext ? encryptSecret(plaintext) : null
}

/** Constant-time compare for signed values such as the OAuth state cookie. */
export function safeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8')
  const right = Buffer.from(b, 'utf8')

  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}
