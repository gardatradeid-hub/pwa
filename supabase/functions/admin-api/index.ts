/**
 * Admin API — Supabase Edge Function
 *
 * GET /functions/v1/admin-api?action=list_users
 * GET /functions/v1/admin-api?action=get_logs&page=1&limit=50
 * POST /functions/v1/admin-api — body: { action, ... }
 *
 * All actions require the caller to be in the admin_users table.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logAudit, Action } from '../_shared/logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    // Check admin
    const { data: admin } = await supabase
      .from('admin_users')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (!admin || (admin.role !== 'admin' && admin.role !== 'superadmin')) {
      return json({ error: 'Forbidden — not an admin' }, 403);
    }

    // ---- check_admin (used by AdminGuard client-side: just returns role) ----
    if (action === 'check_admin') {
      return json({ success: true, data: { role: admin.role } });
    }

    // Get user email for audit log
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .maybeSingle();

    const userEmail = profile?.email || user.email || 'unknown';
    const ipAddress = req.headers.get('x-forwarded-for') || '';
    const body: any = req.method === 'POST' ? await req.json() : {};
    const action = new URL(req.url).searchParams.get('action') || body.action;
    const requestBody = { ...body, action };

    // ---- list_users ----
    if (action === 'list_users') {
      const page = Math.max(1, parseInt(body.page || '1'));
      const limit = Math.min(100, Math.max(1, parseInt(body.limit || '20')));
      const offset = (page - 1) * limit;

      const { data: users, error: uErr, count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (uErr) {
        await logAudit(supabase, { userId: user.id, userEmail, action: Action.ADMIN_LIST_USERS, functionName: 'admin-api', requestBody, responseStatus: 500, errorMessage: uErr.message, ipAddress });
        return json({ error: 'Failed to fetch users' }, 500);
      }

      // Also get admin_users to mark who is admin
      const { data: admins } = await supabase.from('admin_users').select('id, role');
      const adminMap: Record<string, string> = {};
      if (admins) for (const a of admins) adminMap[a.id] = a.role;

      const result = (users || []).map((u: any) => ({
        ...u,
        api_key_encrypted: undefined,
        api_secret_encrypted: undefined,
        is_admin: adminMap[u.id] || null,
        admin_role: adminMap[u.id] || null,
      }));

      await logAudit(supabase, { userId: user.id, userEmail, action: Action.ADMIN_LIST_USERS, functionName: 'admin-api', requestBody, responseStatus: 200, ipAddress });
      return json({ success: true, data: result, total: count || 0, page, limit });
    }

    // ---- get_user ----
    if (action === 'get_user') {
      const targetId = body.user_id;
      if (!targetId) return json({ error: 'user_id required' }, 400);

      const { data: target, error: tErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetId)
        .single();

      if (tErr || !target) return json({ error: 'User not found' }, 404);

      // Get trades
      const { data: trades, error: trErr } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', targetId)
        .order('opened_at', { ascending: false })
        .limit(50);

      // Get daily stats
      const { data: stats } = await supabase
        .from('daily_stats')
        .select('*')
        .eq('user_id', targetId)
        .order('date', { ascending: false })
        .limit(30);

      const safeUser = { ...target, api_key_encrypted: undefined, api_secret_encrypted: undefined };

      await logAudit(supabase, { userId: user.id, userEmail, action: 'admin_get_user', functionName: 'admin-api', requestBody, responseStatus: 200, ipAddress });
      return json({ success: true, data: { user: safeUser, trades: trades || [], stats: stats || [] } });
    }

    // ---- update_user ----
    if (action === 'update_user') {
      const { user_id, current_phase, onboarding_completed, exchange } = body;
      if (!user_id) return json({ error: 'user_id required' }, 400);

      const updates: Record<string, unknown> = {};
      if (current_phase !== undefined) updates.current_phase = current_phase;
      if (onboarding_completed !== undefined) updates.onboarding_completed = onboarding_completed;
      if (exchange !== undefined) updates.exchange = exchange;

      if (Object.keys(updates).length === 0) return json({ error: 'No fields to update' }, 400);

      const { error: upErr } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user_id);

      if (upErr) {
        await logAudit(supabase, { userId: user.id, userEmail, action: Action.ADMIN_UPDATE_USER, functionName: 'admin-api', requestBody, responseStatus: 500, errorMessage: upErr.message, ipAddress });
        return json({ error: 'Update failed', detail: upErr.message }, 500);
      }

      await logAudit(supabase, { userId: user.id, userEmail, action: Action.ADMIN_UPDATE_USER, functionName: 'admin-api', requestBody, responseStatus: 200, ipAddress });
      return json({ success: true });
    }

    // ---- get_logs ----
    if (action === 'get_logs') {
      const page = Math.max(1, parseInt(body.page || '1'));
      const limit = Math.min(200, Math.max(1, parseInt(body.limit || '50')));
      const offset = (page - 1) * limit;
      const userIdFilter = body.user_id || null;

      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' });

      if (userIdFilter) query = query.eq('user_id', userIdFilter);
      query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

      const { data: logs, error: lErr, count } = await query;

      if (lErr) {
        await logAudit(supabase, { userId: user.id, userEmail, action: Action.ADMIN_GET_LOGS, functionName: 'admin-api', requestBody, responseStatus: 500, errorMessage: lErr.message, ipAddress });
        return json({ error: 'Failed to fetch logs', detail: lErr.message }, 500);
      }

      await logAudit(supabase, { userId: user.id, userEmail, action: Action.ADMIN_GET_LOGS, functionName: 'admin-api', requestBody, responseStatus: 200, ipAddress });
      return json({ success: true, data: logs || [], total: count || 0, page, limit });
    }

    // ---- get_config ----
    if (action === 'get_config') {
      const { data: configRows } = await supabase.from('app_config').select('key, value');
      const config: Record<string, unknown> = {};
      if (configRows) for (const row of configRows) config[row.key] = row.value;

      await logAudit(supabase, { userId: user.id, userEmail, action: Action.ADMIN_GET_CONFIG, functionName: 'admin-api', requestBody, responseStatus: 200, ipAddress });
      return json({ success: true, data: config });
    }

    // ---- update_config ----
    if (action === 'update_config') {
      if (admin.role !== 'superadmin') return json({ error: 'Only superadmin can update config' }, 403);
      const { key, value } = body;
      if (!key) return json({ error: 'key required' }, 400);

      const { error: upErr } = await supabase
        .from('app_config')
        .upsert({ key, value: typeof value === 'string' ? JSON.parse(value) : value }, { onConflict: 'key' });

      if (upErr) return json({ error: 'Update failed', detail: upErr.message }, 500);

      await logAudit(supabase, { userId: user.id, userEmail, action: Action.ADMIN_UPDATE_CONFIG, functionName: 'admin-api', requestBody, responseStatus: 200, ipAddress });
      return json({ success: true });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (error: any) {
    console.error('Admin API error:', error?.message || error);
    return json({ error: error?.message || 'Internal server error' }, 500);
  }
});
