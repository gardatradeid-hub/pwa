-- =====================================================
-- Migration: Admin panel + audit logs
-- =====================================================

-- 1. ADMIN USERS — stores which users have admin access
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Only service_role can read/write admin_users
CREATE POLICY "Service role only" ON admin_users
  FOR ALL USING (auth.role() = 'service_role');

-- 2. AUDIT LOGS — all edge function API calls
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  action TEXT NOT NULL,
  function_name TEXT NOT NULL,
  request_body JSONB,
  response_status INT,
  response_body JSONB,
  error_message TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can read audit logs" ON audit_logs
  FOR SELECT USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "Service role can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
