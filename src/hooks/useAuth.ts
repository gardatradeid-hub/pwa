import { useEffect, useCallback } from 'react';
import { supabase } from '@/config/supabase';
import { useUserStore } from '@/store/useUserStore';
import { useTradeStore } from '@/store/useTradeStore';
import { PROFILE_CLIENT_COLUMNS, type UserProfile } from '@/types/user';

export function useAuth() {
  const { profile, isAuthenticated, isLoading, setProfile, setAuthenticated, setLoading, reset } =
    useUserStore();

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          setAuthenticated(true);
          await fetchProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          reset();
        }
      }
    );

    // Initial session check
    checkSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkSession = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setAuthenticated(true);
        await fetchProfile(session.user.id);
      } else {
        reset();
      }
    } catch (error) {
      console.error('Session check failed:', error);
      reset();
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      // Explicit columns only — never include api_key_encrypted /
      // api_secret_encrypted (those columns belong to the server side).
      const { data, error } = await supabase
        .from('profiles')
        .select(PROFILE_CLIENT_COLUMNS)
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data as unknown as UserProfile);
      // Hydrate active-lock state so ProtectedRoute can redirect locked
      // users to /app/locked without each page having to re-check.
      await refreshLockState(userId);
    } catch (error) {
      console.error('Fetch profile failed:', error);
    }
  };

  const refreshLockState = async (userId: string) => {
    try {
      const nowIso = new Date().toISOString();
      const { data: locks } = await supabase
        .from('lock_events')
        .select('unlocks_at')
        .eq('user_id', userId)
        .gt('unlocks_at', nowIso)
        .order('locked_at', { ascending: false })
        .limit(1);

      const tradeStore = useTradeStore.getState();
      if (locks && locks.length > 0) {
        tradeStore.setIsLocked(true);
      } else {
        tradeStore.setIsLocked(false);
      }
    } catch (e) {
      console.warn('refreshLockState failed:', e);
    }
  };

  const signInWithGoogle = useCallback(async () => {
    // Always redirect to the canonical production URL so Supabase allows
    // the redirect regardless of which Vercel deploy alias the user came from.
    const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${appUrl}/onboarding/connect`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    return { data, error };
  }, []);

  const signUpWithEmail = useCallback(
    async (email: string, password: string, fullName: string, referralCode?: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            referral_code: referralCode,
          },
        },
      });
      return { data, error };
    },
    []
  );

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  }, []);

  const sendMagicLink = useCallback(async (email: string) => {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
      },
    });
    return { data, error };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      reset();
    }
    return { error };
  }, [reset]);

  const resetPassword = useCallback(async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { data, error };
  }, []);

  return {
    profile,
    isAuthenticated,
    isLoading,
    signInWithGoogle,
    signUpWithEmail,
    signInWithEmail,
    sendMagicLink,
    signOut,
    resetPassword,
    refreshProfile: checkSession,
  };
}
