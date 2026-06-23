/**
 * Shared admin auth logic for Garda edge functions.
 * Used by admin-auth (login) and admin-api (verify).
 */

export interface AdminTokenPayload {
  email: string;
  expiry: number;
  isValid: boolean;
}

/**
 * Verify an admin token and return the decoded payload.
 * Token format: base64(email + ":" + expiry + ":" + hmac_sig)
 */
export async function verifyAdminToken(token: string): Promise<AdminTokenPayload> {
  const fallback: AdminTokenPayload = { email: '', expiry: 0, isValid: false };

  try {
    const decoded = atob(token);
    const parts = decoded.split(':');
    if (parts.length < 3) return fallback;

    const email = parts[0];
    const expiry = parseInt(parts[1], 10);
    const sig = parts.slice(2).join(':');

    if (isNaN(expiry) || Date.now() > expiry) return fallback;

    const authSecret = Deno.env.get('ADMIN_AUTH_SECRET') || Deno.env.get('ADMIN_PASSWORD') || '';
    if (!authSecret) return fallback;

    const payload = `${email}:${expiry}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(authSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const expectedSig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const expectedHex = Array.from(new Uint8Array(expectedSig)).map(b => b.toString(16).padStart(2, '0')).join('');

    // Constant-time comparison
    if (sig.length !== expectedHex.length) return fallback;
    let match = true;
    for (let i = 0; i < sig.length; i++) {
      if (sig[i] !== expectedHex[i]) match = false;
    }
    if (!match) return fallback;

    return { email, expiry, isValid: true };
  } catch {
    return fallback;
  }
}

/**
 * Extract and verify admin token from Authorization header.
 * Expected format: "Bearer <token>"
 */
export function extractAdminToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim();
}

// Hardened CORS (no wildcard for admin endpoints)
export const adminCorsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ADMIN_CORS_ORIGIN') || 'https://garda-alpha.vercel.app',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};
