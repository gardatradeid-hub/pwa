import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { Theme } from '@/types/user';

export function useTheme() {
  const { theme, setTheme, toggleTheme } = useAppStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Apply theme on mount
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, []);

  const set = (t: Theme) => {
    // useAppStore already persists theme under the 'garda-app' key via
    // Zustand persist middleware. We just toggle the html.dark class here.
    setTheme(t);
    document.documentElement.classList.toggle('dark', t === 'dark');
  };

  const toggle = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    set(newTheme);
  };

  return {
    theme,
    setTheme: set,
    toggleTheme: toggle,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    mounted,
  };
}
