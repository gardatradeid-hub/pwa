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
    setTheme(t);
    document.documentElement.classList.toggle('dark', t === 'dark');
    localStorage.setItem('garda-theme', t);
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
