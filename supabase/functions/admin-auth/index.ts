/**
 * Admin Auth — separate login from Garda user auth.
 *
 * POST /functions/v1/admin-auth
 * Body: { email, password }
 *
 * Returns { success, token, expires_at }
 *
 * Credentials stored in Supabase secrets:
 *   ADMIN_EMAIL=admin@garda.app
 *   ADMIN_PASSWORD=<strong-password>
 *   ADMIN_AUTH_SECRET=<random-32-chars> (optional, falls back to ADMIN_PASSWORD)
 */

import { adminCorsHeaders } from '../_shared/admin-auth.ts';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...adminCorsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: adminCorsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const body = await req.json();
    const { email, password } = body || {};
    if (!email || !password) return json({ error: 'Email dan password wajib diisi' }, 400);

    const adminEmail = Deno.env.get('ADMIN_EMAIL');
    const adminPassword = Deno.env.get('ADMIN_PASSWORD');
    if (!adminEmail || !adminPassword) {
      console.error('ADMIN_EMAIL or ADMIN_PASSWORD not set');
      return json({ error: 'Server configuration error' }, 500);
    }

    // Constant-time string comparison to prevent timing attacks
    if (email.length !== adminEmail.length || password.length !== adminPassword.length) {
      return json({ error: 'Email atau password salah' }, 401);
    }
    let emailMatch = true, passMatch = true;
    for (let i = 0; i < email.length; i++) if (email[i] !== adminEmail[i]) emailMatch = false;
    for (let i = 0; i < password.length; i++) if (password[i] !== adminPassword[i]) passMatch = false;
    if (!emailMatch || !passMatch) return json({ error: 'Email atau password salah' }, 401);

    // Generate token: base64(email:expiry:HMAC)
    const expiry = Date.now() + 24 * 60 * 60 * 1000;
    const authSecret = Deno.env.get('ADMIN_AUTH_SECRET') || adminPassword;
    const payload = `${email}:${expiry}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(authSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
    const token = btoa(`${payload}:${sigHex}`);

    return json({ success: true, token, expires_at: expiry, email });
  } catch (e: any) {
    console.error('Admin auth error:', e?.message);
    return json({ error: 'Internal server error' }, 500);
  }
});
