/**
 * Shared crypto helper for Garda edge functions.
 *
 * AES-256-GCM encryption for exchange API credentials.
 *  - Derives a 32-byte key from API_KEY_ENCRYPTION_SECRET via SHA-256.
 *  - Uses a fresh 12-byte random IV per ciphertext.
 *  - Output format: `${base64(iv)}:${base64(ciphertext + auth_tag)}`
 *
 * Web Crypto's AES-GCM appends the 16-byte auth tag to the ciphertext
 * automatically, so callers don't manage it separately.
 *
 * Throws if API_KEY_ENCRYPTION_SECRET is missing/empty — fail closed, never
 * fall back to plaintext.
 */

const ENC_SECRET_ENV = 'API_KEY_ENCRYPTION_SECRET';

let cachedKey: CryptoKey | null = null;

async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;

  const secret = Deno.env.get(ENC_SECRET_ENV);
  if (!secret || secret.length < 16) {
    throw new Error(
      `${ENC_SECRET_ENV} is missing or too short (need >= 16 chars). ` +
        `Set it via: supabase secrets set ${ENC_SECRET_ENV}=<random-32-chars>`,
    );
  }

  // Derive a deterministic 32-byte key from the secret via SHA-256.
  // (Simpler than PBKDF2 here; rotating the secret invalidates old ciphertexts,
  // which is the expected behavior for a config-managed master key.)
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(secret));

  cachedKey = await crypto.subtle.importKey(
    'raw',
    digest,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  );
  return cachedKey;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encrypt a UTF-8 string. Returns `${base64(iv)}:${base64(ciphertext+tag)}`.
 */
export async function encryptSecret(plaintext: string): Promise<string> {
  if (!plaintext) throw new Error('encryptSecret: plaintext is empty');
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const pt = new TextEncoder().encode(plaintext);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, pt);
  return `${bytesToBase64(iv)}:${bytesToBase64(new Uint8Array(ct))}`;
}

/**
 * Decrypt a ciphertext produced by encryptSecret. Throws on tamper / wrong key.
 */
export async function decryptSecret(payload: string): Promise<string> {
  if (!payload || !payload.includes(':')) {
    throw new Error('decryptSecret: payload is not in "iv:ciphertext" format');
  }
  const [ivB64, ctB64] = payload.split(':', 2);
  const key = await getKey();
  const iv = base64ToBytes(ivB64);
  const ct = base64ToBytes(ctB64);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(pt);
}

/**
 * Quick sanity check used by `connect-exchange` before issuing a 200 OK.
 * Encrypt-then-decrypt round trip must produce the same string.
 */
export async function selfTest(): Promise<void> {
  const sample = 'garda-crypto-selftest';
  const enc = await encryptSecret(sample);
  const dec = await decryptSecret(enc);
  if (dec !== sample) throw new Error('crypto selfTest failed: round trip mismatch');
}
