/**
 * Admin Auth — separate login from Garda user auth.
 *
 * Validates email + password against env vars ADMIN_EMAIL and ADMIN_PASSWORD.
 * Returns a simple token (base64 encoded email+timestamp+secret).
 *
 * Set these in Supabase secrets:
 *   ADMIN_EMAIL=admin@garda.app
 *   ADMIN_PASSWORD=<your-strong-password>
 *   ADMIN_AUTH_SECRET=<random-32-chars>
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const body = await req.json();
    const { email, password } = body || {};

    if (!email || !password) return json({ error: 'Email dan password wajib diisi' }, 400);

    const adminEmail = Deno.env.get('ADMIN_EMAIL');
    const adminPassword = Deno.env.get('ADMIN_PASSWORD');

    if (!adminEmail || !adminPassword) {
      console.error('ADMIN_EMAIL or ADMIN_PASSWORD not set in secrets');
      return json({ error: 'Server configuration error' }, 500);
    }

    if (email !== adminEmail || password !== adminPassword) {
      return json({ error: 'Email atau password salah' }, 401);
    }

    // Generate simple token: base64(email + ":" + expiry + ":" + hmac)
    const expiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    const authSecret = Deno.env.get('ADMIN_AUTH_SECRET') || adminPassword;
    const payload = `${email}:${expiry}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(authSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
    const token = btoa(`${payload}:${sigHex}`);

    return json({
      success: true,
      token,
      expires_at: expiry,
      email,
    });
  } catch (e: any) {
    return json({ error: e?.message || 'Internal server error' }, 500);
  }
});
