import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'

type EncryptedData = {
  ciphertext: string
  iv: string
  authTag: string
}

function getKey(): Buffer {
  const key = process.env.SPRL_ENCRYPTION_KEY
  if (!key) {
    throw new Error(
      'SPRL_ENCRYPTION_KEY not set. Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    )
  }
  if (key.length !== 64) {
    throw new Error('SPRL_ENCRYPTION_KEY must be 64 hex characters (32 bytes)')
  }
  return Buffer.from(key, 'hex')
}

export function encrypt(plaintext: string): EncryptedData {
  const key = getKey()
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  let ciphertext = cipher.update(plaintext, 'utf8', 'base64')
  ciphertext += cipher.final('base64')

  return {
    ciphertext,
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  }
}

export function decrypt(data: EncryptedData): string {
  const key = getKey()
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(data.iv, 'base64'))
  decipher.setAuthTag(Buffer.from(data.authTag, 'base64'))

  let plaintext = decipher.update(data.ciphertext, 'base64', 'utf8')
  plaintext += decipher.final('utf8')

  return plaintext
}
