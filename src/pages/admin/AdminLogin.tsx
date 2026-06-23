import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabase';
import { Shield, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

const ADMIN_TOKEN_KEY = 'garda-admin-token';

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export function isAdminLoggedIn(): boolean {
  const token = getAdminToken();
  if (!token) return false;
  try {
    const decoded = atob(token);
    const [, expiryStr] = decoded.split(':');
    const expiry = parseInt(expiryStr, 10);
    return Date.now() < expiry;
  } catch { return false; }
}

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already logged in? redirect to dashboard
  if (isAdminLoggedIn()) { navigate('/admin', { replace: true }); return null; }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('admin-auth', {
        body: { email, password },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      navigate('/admin', { replace: true });
    } catch (e: any) {
      setError(e.message || 'Gagal login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-garda-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-garda-cyan/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-garda-cyan" />
          </div>
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="text-sm text-garda-text-secondary mt-1">Masuk dengan akun admin</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-garda-text-secondary mb-1.5">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="garda-input w-full" placeholder="admin@garda.app" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-garda-text-secondary mb-1.5">Password</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                className="garda-input w-full pr-10" placeholder="Password" required />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-garda-text-muted hover:text-garda-text-secondary">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-garda-pink/10 border border-garda-pink/20 text-garda-pink text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="garda-btn-primary w-full flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'Memverifikasi...' : 'Masuk'}
          </button>

          <p className="text-xs text-garda-text-muted text-center">
            Kembali ke <a href="/" className="text-garda-cyan hover:underline">Beranda</a>
          </p>
        </form>
      </div>
    </div>
  );
}
