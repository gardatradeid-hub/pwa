export type Exchange = 'bybit' | 'binance' | 'okx';
export type Language = 'id' | 'en';
export type Theme = 'dark' | 'light';

export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  exchange: Exchange | null;
  api_key_encrypted: string | null;
  api_secret_encrypted: string | null;
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
