// Generates the salted PBKDF2 hash stored in the mock fixtures.
// Usage: node scripts/hash-password.mjs <password> [saltHex]
import { webcrypto as crypto } from 'node:crypto'

const ITERATIONS = 10_000

const toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
const fromHex = (hex) => Uint8Array.from(hex.match(/.{2}/g).map((pair) => parseInt(pair, 16)))

const [password, saltArg] = process.argv.slice(2)
if (!password) {
  console.error('Usage: node scripts/hash-password.mjs <password> [saltHex]')
  process.exit(1)
}

const salt = saltArg ? fromHex(saltArg) : crypto.getRandomValues(new Uint8Array(16))
const key = await crypto.subtle.importKey(
  'raw',
  new TextEncoder().encode(password),
  'PBKDF2',
  false,
  ['deriveBits'],
)
const bits = await crypto.subtle.deriveBits(
  { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS },
  key,
  256,
)

console.log(
  JSON.stringify({ passwordSalt: toHex(salt), passwordHash: toHex(new Uint8Array(bits)) }),
)
