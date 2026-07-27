import { create } from 'zustand';
import type { UserProfile } from '@/types/user';

interface UserStore {
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  balance: number | null;
  dailyPnl: number;
  setProfile: (profile: UserProfile | null) => void;
  setAuthenticated: (val: boolean) => void;
  setLoading: (val: boolean) => void;
  setBalance: (val: number | null) => void;
  setDailyPnl: (val: number) => void;
  reset: () => void;
}

export const useUserStore = create<UserStore>()((set) => ({
  profile: null,
  isAuthenticated: false,
  isLoading: true,
  balance: null,
  dailyPnl: 0,
  setProfile: (profile) => set({ profile }),
  setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setLoading: (isLoading) => set({ isLoading }),
  setBalance: (balance) => set({ balance }),
  setDailyPnl: (dailyPnl) => set({ dailyPnl }),
  reset: () => set({
    profile: null,
    isAuthenticated: false,
    isLoading: false,
    balance: null,
    dailyPnl: 0,
  }),
}));
