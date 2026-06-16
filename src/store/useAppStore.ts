import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Language, Theme } from '@/types/user';

interface AppStore {
  theme: Theme;
  lang: Language;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setLang: (lang: Language) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      theme: 'dark',
      lang: 'id',
      setTheme: (theme) => {
        set({ theme });
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', theme === 'dark');
        }
      },
      toggleTheme: () => {
        set((state) => {
          const theme = state.theme === 'dark' ? 'light' : 'dark';
          if (typeof document !== 'undefined') {
            document.documentElement.classList.toggle('dark', theme === 'dark');
          }
          return { theme };
        });
      },
      setLang: (lang) => set({ lang }),
    }),
    {
      name: 'garda-app',
      partialize: (state) => ({ theme: state.theme, lang: state.lang }),
    }
  )
);
