export type Exchange = 'bybit' | 'binance' | 'okx';
export type Language = 'id' | 'en';
export type Theme = 'dark' | 'light';

/**
 * Client-side view of a user profile.
 *
 * NOTE: `api_key_encrypted` / `api_secret_encrypted` are stored on the DB row
 * but MUST NOT be selected to the client. Only edge functions (running with
 * the service_role key) read those columns. Keep this interface as the
 * `safe` projection, and the `PROFILE_CLIENT_COLUMNS` list (below) as the
 * SQL projection used by `useAuth.fetchProfile`.
 */
export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  exchange: Exchange | null;
  current_phase: number;
  is_early_adopter: boolean;
  subscription_plan: string;
  subscription_expires_at: string | null;
  onboarding_completed: boolean;
  preferred_lang: Language;
  preferred_theme: Theme;
  email_verified: boolean;
  auth_provider: 'google' | 'email';
  created_at: string;
  updated_at: string;
}

/**
 * Explicit column list for `.select(PROFILE_CLIENT_COLUMNS)` in client code.
 * Mirrors `UserProfile` 1:1 — never add `api_key_encrypted` or
 * `api_secret_encrypted` here. If a column is added to UserProfile, add it
 * here too, and to the DB row.
 */
export const PROFILE_CLIENT_COLUMNS =
  'id, full_name, email, avatar_url, exchange, current_phase, ' +
  'is_early_adopter, subscription_plan, subscription_expires_at, ' +
  'onboarding_completed, preferred_lang, preferred_theme, ' +
  'email_verified, auth_provider, created_at, updated_at';

export interface PhaseInfo {
  phase: number;
  label: string;
  label_en: string;
  max_trades: number;
  cooldown_min: number;
  min_rr: number;
  unlock_wr?: number;
  unlock_trades?: number;
}

export interface AuthState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Supabase Session/User types
export interface Session {
  access_token: string;
  expires_at: number;
  refresh_token: string;
}

export interface User {
  id: string;
  email?: string;
}
