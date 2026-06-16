import { create } from 'zustand';
import type { UserProfile, PhaseInfo } from '@/types/user';
import { DEFAULT_PHASE_CONFIG } from '@/config/constants';

interface UserStore {
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  currentPhase: PhaseInfo | null;
  balance: number | null;
  dailyPnl: number;
  setProfile: (profile: UserProfile | null) => void;
  setAuthenticated: (val: boolean) => void;
  setLoading: (val: boolean) => void;
  setBalance: (val: number | null) => void;
  setDailyPnl: (val: number) => void;
  getCurrentPhase: () => PhaseInfo;
  reset: () => void;
}

export const useUserStore = create<UserStore>()((set, get) => ({
  profile: null,
  isAuthenticated: false,
  isLoading: true,
  currentPhase: null,
  balance: null,
  dailyPnl: 0,
  setProfile: (profile) => set({ profile }),
  setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setLoading: (isLoading) => set({ isLoading }),
  setBalance: (balance) => set({ balance }),
  setDailyPnl: (dailyPnl) => set({ dailyPnl }),
  getCurrentPhase: () => {
    const profile = get().profile;
    const phaseNum = profile?.current_phase || 1;
    return DEFAULT_PHASE_CONFIG.phases.find(p => p.phase === phaseNum) || DEFAULT_PHASE_CONFIG.phases[0];
  },
  reset: () => set({
    profile: null,
    isAuthenticated: false,
    isLoading: false,
    currentPhase: null,
    balance: null,
    dailyPnl: 0,
  }),
}));
