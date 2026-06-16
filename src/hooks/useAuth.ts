import { useEffect, useCallback } from 'react';
import { supabase } from '@/config/supabase';
import { useUserStore } from '@/store/useUserStore';
import type { UserProfile } from '@/types/user';

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
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data as UserProfile);
    } catch (error) {
      console.error('Fetch profile failed:', error);
    }
  };

  const signInWithGoogle = useCallback(async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/onboarding/connect`,
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
