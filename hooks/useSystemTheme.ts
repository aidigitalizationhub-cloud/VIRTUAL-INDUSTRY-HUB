import { useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type EffectiveTheme = 'light' | 'dark';

export interface UseSystemThemeReturn {
  effectiveTheme: EffectiveTheme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = 'ug_vih_theme_preference';

export const useSystemTheme = (): UseSystemThemeReturn => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
      if (saved && (saved === 'light' || saved === 'dark' || saved === 'system')) {
        return saved;
      }
    }
    return 'system';
  });

  const getSystemTheme = (): EffectiveTheme => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  };

  const [effectiveTheme, setEffectiveTheme] = useState<EffectiveTheme>(() => {
    if (themeMode === 'system') {
      return getSystemTheme();
    }
    return themeMode;
  });

  const applyThemeToDOM = (theme: EffectiveTheme) => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let targetTheme: EffectiveTheme = 'light';
    if (themeMode === 'system') {
      targetTheme = getSystemTheme();
    } else {
      targetTheme = themeMode;
    }

    setEffectiveTheme(targetTheme);
    applyThemeToDOM(targetTheme);

    // If system mode, listen for OS updates
    if (themeMode === 'system' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        const newTheme: EffectiveTheme = e.matches ? 'dark' : 'light';
        setEffectiveTheme(newTheme);
        applyThemeToDOM(newTheme);
      };

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange);
      } else {
        mediaQuery.addListener(handleChange);
      }

      return () => {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', handleChange);
        } else {
          mediaQuery.removeListener(handleChange);
        }
      };
    }
  }, [themeMode]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, mode);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    // If current effective is light, switch to dark, and vice versa
    const nextTheme: ThemeMode = effectiveTheme === 'dark' ? 'light' : 'dark';
    setThemeMode(nextTheme);
  }, [effectiveTheme, setThemeMode]);

  return {
    effectiveTheme,
    themeMode,
    setThemeMode,
    toggleTheme,
  };
};

